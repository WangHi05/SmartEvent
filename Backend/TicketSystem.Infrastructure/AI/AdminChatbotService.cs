using System.Collections.Concurrent;
using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Embeddings;
using Microsoft.SemanticKernel.Connectors.Google;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using System.Net.Http.Json;
using System.Text;
using System.Text.Json;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Common;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Entities;
using TicketSystem.Infrastructure.AI.Plugins;
using System.Threading.Tasks;
using System;
using System.Net.Http;

namespace TicketSystem.Infrastructure.AI
{
    public class AdminChatbotService : IAdminChatbotService
    {
        private readonly IApplicationDbContext _context;
        private readonly Kernel _kernel;
        private readonly IChatCompletionService _chatCompletion;
        private readonly ITextEmbeddingGenerationService _textEmbedding;
        private readonly ILogger<AdminChatbotService> _logger;

        // ---- CACHE EMBEDDING CÂU HỎI NGẮN HẠN ----
        // Admin thường hỏi lặp lại các câu tương tự trong lúc test / trong 1 phiên làm việc.
        // Cache theo text câu hỏi (5 phút) để đỡ tốn 1 lượt gọi API embedding mỗi lần hỏi lại y hệt.
        private static readonly ConcurrentDictionary<string, (float[] Vector, DateTime ExpireAtUtc)> _embeddingCache = new();
        private static readonly TimeSpan _embeddingCacheTtl = TimeSpan.FromMinutes(5);

        public AdminChatbotService(IApplicationDbContext context, IConfiguration configuration, ILogger<AdminChatbotService> logger)
        {
            _context = context;
            _logger = logger;
            var apiKey = configuration["AIConfigs:GeminiApiKey"];
            var chatModelId = configuration["AIConfigs:ModelId"] ?? "gemini-2.5-flash";

            var embeddingModelId = "gemini-embedding-001";

            if (string.IsNullOrEmpty(apiKey))
                throw new ArgumentNullException("GeminiApiKey không được để trống.");

            var builder = Kernel.CreateBuilder();

            // 1. Đăng ký Chat Completion 
            builder.AddGoogleAIGeminiChatCompletion(modelId: chatModelId, apiKey: apiKey);

            // 2. Inject Custom Service cho Embedding
            builder.Services.AddSingleton<ITextEmbeddingGenerationService>(new GeminiEmbeddingService(apiKey, embeddingModelId));

            // 3. Đăng ký Plugin truy xuất dữ liệu SQL
            builder.Plugins.AddFromObject(new SystemDataPlugin(_context), pluginName: "SystemData");

            _kernel = builder.Build();
            _chatCompletion = _kernel.GetRequiredService<IChatCompletionService>();
            _textEmbedding = _kernel.GetRequiredService<ITextEmbeddingGenerationService>();
        }

        public async Task<List<SystemKnowledgeDto>> GetAllKnowledgeAsync()
        {
            // Clean Code: Chỉ select những trường cần thiết để trả về UI, 
            // TUYỆT ĐỐI KHÔNG select cột Embedding vì nó là một mảng float rất nặng, sẽ làm sập API.
            return await _context.SystemKnowledges
                .Select(k => new SystemKnowledgeDto
                {
                    Id = k.Id,
                    Title = k.Title,
                    Content = k.Content
                })
                .ToListAsync();
        }

        public async Task<bool> DeleteKnowledgeAsync(Guid id)
        {
            var entity = await _context.SystemKnowledges.FindAsync(id);
            if (entity == null) return false;

            _context.SystemKnowledges.Remove(entity);
            await _context.SaveChangesAsync(default);
            return true;
        }

        public async Task IngestKnowledgeAsync(string title, string content)
        {
            await GeminiRateLimiter.ThrottleAsync();
            var embeddings = await _textEmbedding.GenerateEmbeddingsAsync(new[] { content });
            var vector = new Vector(embeddings[0].ToArray());

            var knowledge = new SystemKnowledge
            {
                Id = Guid.NewGuid(),
                Title = title,
                Content = content,
                Embedding = vector
            };
            _context.SystemKnowledges.Add(knowledge);
            await _context.SaveChangesAsync(default);
        }
        
        public async Task<string> AskQuestionAsync(string question)
        {
            int maxRetries = 3;
            int delayMs = 3000; // Bắt đầu đợi 3 giây, đủ dài hơn 1 nhịp throttle

            for (int i = 0; i <= maxRetries; i++)
            {
                try
                {
                    // 1. Tìm kiếm ngữ nghĩa (Embedding) - có cache + throttle
                    var queryVectorArray = await GetEmbeddingWithCacheAsync(question);
                    var queryVector = new Vector(queryVectorArray);

                    // 2. Query Vector DB
                    var relevantDocs = await _context.SystemKnowledges
                        .OrderBy(k => k.Embedding.CosineDistance(queryVector))
                        .Take(2)
                        .ToListAsync();

                    // 3. Xây dựng Prompt
                    var promptBuilder = new StringBuilder();
                    promptBuilder.AppendLine("Bạn là trợ lý AI quản lý hệ thống bán vé SmartEvent. Nhiệm vụ của bạn là hỗ trợ Admin.");
                    promptBuilder.AppendLine("Quy tắc BẮT BUỘC:");
                    promptBuilder.AppendLine("1. KHÔNG tự bịa số liệu. Phải GỌI HÀM (TOOLS) để lấy dữ liệu thống kê, check-in mới nhất.");
                    promptBuilder.AppendLine("2. BẮT BUỘC trình bày dữ liệu dạng BẢNG MARKDOWN nếu kết quả trả về là một danh sách (từ 2 dòng trở lên).");
                    promptBuilder.AppendLine("3. Hãy làm nổi bật các cảnh báo rủi ro (in đậm, dùng icon) nếu sự kiện bị quá tải.");
                    promptBuilder.AppendLine("4. Nếu câu hỏi liên quan đến chính sách, hãy dựa vào thông tin tham chiếu dưới đây:");
                    promptBuilder.AppendLine("5. Nếu cần nhiều thông tin, hãy hỏi lại Admin để làm rõ thay vì tự suy diễn.");

                    if (relevantDocs.Any())
                    {
                        promptBuilder.AppendLine("\n--- THÔNG TIN THAM CHIẾU (VECTOR SEARCH) ---");
                        foreach (var doc in relevantDocs)
                        {
                            promptBuilder.AppendLine($"[{doc.Title}]: {doc.Content}");
                        }
                    }

                    var history = new ChatHistory();

                    string finalPrompt = $"{promptBuilder}\n\nCâu hỏi của người dùng: {question}";
                    history.AddUserMessage(finalPrompt);

                    // QUAN TRỌNG: dùng FunctionChoiceBehavior.Auto() (API auto-invoke THỐNG NHẤT,
                    // connector-agnostic của SK - đây là cách chính team Semantic Kernel khuyến nghị
                    // cho Gemini) thay vì:
                    //  - GeminiToolCallBehavior.AutoInvokeKernelFunctions: có bug đã biết khi AI đòi
                    //    gọi NHIỀU hàm song song -> 400 "function response parts... function call parts"
                    //  - Tự viết vòng lặp thủ công dùng FunctionCallContent/FunctionResultContent:
                    //    connector Gemini KHÔNG hỗ trợ add thủ công các type này vào history
                    //    -> lỗi "Unsupported content type. FunctionResultContent is not supported by Gemini."
                    // FunctionChoiceBehavior.Auto() để SK tự quản lý đúng type nội bộ của Gemini,
                    // đồng thời AllowParallelCalls = false ép AI chỉ được chọn 1 hàm mỗi lượt,
                    // né hẳn cả 2 bug trên.
                    var executionSettings = new GeminiPromptExecutionSettings
                    {
                        FunctionChoiceBehavior = FunctionChoiceBehavior.Auto(
                            options: new FunctionChoiceBehaviorOptions { AllowParallelCalls = false })
                    };

                    await GeminiRateLimiter.ThrottleAsync();
                    var result = await _chatCompletion.GetChatMessageContentAsync(
                        history,
                        executionSettings: executionSettings,
                        kernel: _kernel);

                    return result.Content ?? "Xin lỗi, tôi không thể tìm thấy câu trả lời.";
                }
                catch (Exception ex)
                {
                    // Log đầy đủ lỗi gốc (kể cả inner exception) để lần sau còn có log thật mà debug,
                    // thay vì chỉ thấy câu message thân thiện chung chung.
                    _logger.LogError(ex, "Lỗi khi gọi Gemini API trong AskQuestionAsync. Lần thử: {Attempt}", i + 1);

                    // HttpOperationException của Semantic Kernel có property ResponseContent chứa
                    // body gốc mà Google trả về - thường ghi rõ TÊN quota bị vượt (RPM/RPD/TPM) và
                    // giá trị giới hạn cụ thể. Message mặc định của exception KHÔNG có thông tin này.
                    if (ex is HttpOperationException httpOpExForLog && !string.IsNullOrEmpty(httpOpExForLog.ResponseContent))
                    {
                        _logger.LogError("Chi tiết response body từ Gemini API: {ResponseContent}", httpOpExForLog.ResponseContent);
                    }

                    var statusCode = TryGetHttpStatusCode(ex);
                    bool isRateLimited = statusCode == HttpStatusCode.TooManyRequests
                                         || ex.Message.Contains("429")
                                         || ex.Message.Contains("Too Many Requests")
                                         || ex.Message.Contains("RESOURCE_EXHAUSTED");

                    bool isTransientNetworkError = ex.Message.Contains("forcibly closed")
                                         || ex.Message.Contains("10054")
                                         || (ex.InnerException != null && ex.InnerException.Message.Contains("forcibly closed"));

                    // Lỗi "function response parts" là bug logic của Gemini connector khi AI đòi gọi
                    // nhiều hàm song song - dù đã chặn bằng AllowParallelCalls=false ở trên, nếu vẫn lọt qua
                    // thì KHÔNG nên retry vì gọi lại y hệt vẫn sẽ lỗi (không phải lỗi tải/mạng tạm thời).
                    bool isFunctionCallMismatch = ex.Message.Contains("function response parts")
                                         || ex.Message.Contains("function call parts");

                    bool shouldRetry = (isRateLimited || isTransientNetworkError) && !isFunctionCallMismatch;

                    if (shouldRetry && i < maxRetries)
                    {
                        await Task.Delay(delayMs);
                        delayMs *= 2; // Exponential Backoff: 3s -> 6s -> 12s
                        continue;
                    }

                    if (isRateLimited)
                    {
                        return "Hệ thống AI của Google đang bị giới hạn số lượng request (quota). Vui lòng đợi khoảng 1 phút rồi thử lại nhé Admin!";
                    }

                    if (isTransientNetworkError)
                    {
                        return "Kết nối tới hệ thống AI không ổn định. Vui lòng thử lại nhé Admin!";
                    }

                    if (isFunctionCallMismatch)
                    {
                        return "Câu hỏi này cần AI tra cứu nhiều dữ liệu cùng lúc và đang gặp lỗi kỹ thuật từ Gemini. Admin thử tách thành các câu hỏi nhỏ hơn, hỏi từng phần một nhé!";
                    }

                    // Lỗi 400 / lỗi logic khác: trả nguyên message để dev còn thấy trong lúc test,
                    // nhưng lỗi gốc đầy đủ đã được log ở trên rồi.
                    return $"Đã xảy ra lỗi khi xử lý AI: {ex.Message}";
                }
            }

            return "Không thể kết nối đến AI Server lúc này.";
        }

        private async Task<float[]> GetEmbeddingWithCacheAsync(string question)
        {
            var cacheKey = question.Trim().ToLowerInvariant();

            if (_embeddingCache.TryGetValue(cacheKey, out var cached) && cached.ExpireAtUtc > DateTime.UtcNow)
            {
                return cached.Vector;
            }

            await GeminiRateLimiter.ThrottleAsync();
            var queryEmbeddings = await _textEmbedding.GenerateEmbeddingsAsync(new[] { question });
            var vector = queryEmbeddings[0].ToArray();

            _embeddingCache[cacheKey] = (vector, DateTime.UtcNow.Add(_embeddingCacheTtl));

            return vector;
        }

        private static HttpStatusCode? TryGetHttpStatusCode(Exception ex)
        {
            // HttpOperationException là exception chuẩn của Semantic Kernel khi gọi API thất bại (bao gồm cả chat).
            if (ex is HttpOperationException httpOpEx && httpOpEx.StatusCode.HasValue)
                return httpOpEx.StatusCode.Value;

            // GeminiApiException là exception tự định nghĩa cho luồng gọi embedding thủ công (xem GeminiEmbeddingService).
            if (ex is GeminiApiException geminiEx)
                return geminiEx.StatusCode;

            return null;
        }
    }

    /// <summary>
    /// Exception có mang theo HttpStatusCode để tầng gọi phía trên phân biệt được
    /// 429 (rate limit) với 400 (bad request) hay các lỗi khác một cách chính xác,
    /// thay vì phải đoán qua chuỗi text của message.
    /// </summary>
    public class GeminiApiException : Exception
    {
        public HttpStatusCode StatusCode { get; }

        public GeminiApiException(HttpStatusCode statusCode, string message) : base(message)
        {
            StatusCode = statusCode;
        }
    }

    /// <summary>
    /// Custom Service gọi API Gemini Text Embeddings siêu sạch
    /// </summary>
    public class GeminiEmbeddingService : ITextEmbeddingGenerationService
    {
        private readonly string _apiKey;
        private readonly string _modelId;
        private readonly HttpClient _httpClient;

        public GeminiEmbeddingService(string apiKey, string modelId)
        {
            _apiKey = apiKey;
            _modelId = modelId;

            // XỬ LÝ LỖI 10054 (Forcefully Closed SSL Connection):
            // Giới hạn tuổi thọ của TCP Connection là 2 phút. Sau 2 phút, nó sẽ mở connection mới
            // tránh trường hợp Google tự cắt kết nối mạng khiến request bị treo/hủy.
            var handler = new SocketsHttpHandler
            {
                PooledConnectionLifetime = TimeSpan.FromMinutes(2)
            };

            _httpClient = new HttpClient(handler);
        }

        public IReadOnlyDictionary<string, object?> Attributes => new Dictionary<string, object?>();

        public async Task<IList<ReadOnlyMemory<float>>> GenerateEmbeddingsAsync(IList<string> data, Kernel? kernel = null, CancellationToken cancellationToken = default)
        {
            var results = new List<ReadOnlyMemory<float>>();

            var url = $"https://generativelanguage.googleapis.com/v1beta/models/{_modelId}:embedContent?key={_apiKey}";
            var options = new JsonSerializerOptions { PropertyNamingPolicy = JsonNamingPolicy.CamelCase };

            foreach (var text in data)
            {
                var requestBody = new
                {
                    content = new
                    {
                        parts = new[] { new { text = text } }
                    },
                    outputDimensionality = 768
                };

                var response = await _httpClient.PostAsJsonAsync(url, requestBody, options, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var error = await response.Content.ReadAsStringAsync(cancellationToken);
                    // Ném kèm StatusCode thật để tầng trên (AdminChatbotService) phân biệt được
                    // 429 (cần retry) với 400 (lỗi request, không nên retry) một cách chính xác.
                    throw new GeminiApiException(response.StatusCode, $"Gemini Embedding API Error ({response.StatusCode}): {error}");
                }

                var json = await response.Content.ReadFromJsonAsync<JsonDocument>(options, cancellationToken);

                var values = json!.RootElement
                    .GetProperty("embedding")
                    .GetProperty("values")
                    .EnumerateArray()
                    .Select(x => x.GetSingle())
                    .ToArray();

                results.Add(new ReadOnlyMemory<float>(values));
            }

            return results;
        }
    }
}