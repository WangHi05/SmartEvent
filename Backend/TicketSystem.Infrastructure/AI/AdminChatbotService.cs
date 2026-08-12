using System.Collections.Concurrent;
using System.Net;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using Microsoft.SemanticKernel;
using Microsoft.SemanticKernel.ChatCompletion;
using Microsoft.SemanticKernel.Connectors.OpenAI; 
using Microsoft.SemanticKernel.Embeddings;
using Pgvector;
using Pgvector.EntityFrameworkCore;
using System.Text;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Entities;
using TicketSystem.Infrastructure.AI.Plugins;
using System.Threading.Tasks;
using System;
using System.Linq;


namespace TicketSystem.Infrastructure.AI
{
    public class AdminChatbotService : IAdminChatbotService
    {
        private readonly IApplicationDbContext _context;
        private readonly Kernel _kernel;
        private readonly IChatCompletionService _chatCompletion;
        private readonly ITextEmbeddingGenerationService _textEmbedding;
        private readonly ILogger<AdminChatbotService> _logger;

        private static readonly ConcurrentDictionary<string, (float[] Vector, DateTime ExpireAtUtc)> _embeddingCache = new();
        private static readonly TimeSpan _embeddingCacheTtl = TimeSpan.FromMinutes(5);

        public AdminChatbotService(IApplicationDbContext context, IConfiguration configuration, ILogger<AdminChatbotService> logger)
        {
            _context = context;
            _logger = logger;
            
            // 1. Lấy API Key của OpenAI thay vì Gemini
            var openAiApiKey = configuration["AIConfigs:OpenAIApiKey"];

            if (string.IsNullOrEmpty(openAiApiKey))
                throw new ArgumentNullException("OpenAIApiKey không được để trống trong cấu hình.");

            var builder = Kernel.CreateBuilder();

            // 2. Đăng ký Chat Completion dùng GPT-4o-mini
            builder.AddOpenAIChatCompletion(
                modelId: "gpt-4o-mini", // Gắn cứng model cho riêng Chatbot
                apiKey: openAiApiKey);

            // 3. Đăng ký Embedding dùng text-embedding-3-small (RẤT QUAN TRỌNG: Ép về 768 chiều)
            // Không cần viết Custom Service nữa vì thư viện OpenAI hỗ trợ thuộc tính Dimensions
            builder.AddOpenAITextEmbeddingGeneration(
                modelId: "text-embedding-3-small", 
                apiKey: openAiApiKey,
                dimensions: 768);

            // 4. Đăng ký Plugins
            builder.Plugins.AddFromObject(new SystemDataPlugin(_context), pluginName: "SystemData");
            builder.Plugins.AddFromObject(new ExternalDataPlugin(configuration), pluginName: "ExternalData");
            builder.Plugins.AddFromObject(new AuditPlugin(_context), pluginName: "AuditTools");

            _kernel = builder.Build();
            _chatCompletion = _kernel.GetRequiredService<IChatCompletionService>();
            _textEmbedding = _kernel.GetRequiredService<ITextEmbeddingGenerationService>();
        }

        public async Task<List<SystemKnowledgeDto>> GetAllKnowledgeAsync()
        {
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
            string textToEmbed = $"Chủ đề: {title}\nNội dung: {content}";
           
            var embeddings = await _textEmbedding.GenerateEmbeddingsAsync(new[] { textToEmbed });

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

        public async Task<bool> UpdateKnowledgeAsync(Guid id, string title, string content)
        {
            var entity = await _context.SystemKnowledges.FindAsync(id);
            if (entity == null) return false;

            string textToEmbed = $"Chủ đề: {title}\nNội dung: {content}";

            // Tính lại embedding vì nội dung đã thay đổi — bắt buộc để RAG search vẫn chính xác
            var embeddings = await _textEmbedding.GenerateEmbeddingsAsync(new[] { textToEmbed });
            var vector = new Vector(embeddings[0].ToArray());
            entity.Title = title;
            entity.Content = content;
            entity.Embedding = vector;

            await _context.SaveChangesAsync(default);
            return true;
        }

        public async Task<string> AskQuestionAsync(string question)
        {
            // Cơ chế Retry (Exponential Backoff) an toàn của OpenAPI
            int maxRetries = 2; // Tier 1 của OpenAI hiếm khi lỗi, 2 lần là đủ
            int delayMs = 2000;

            for (int i = 0; i <= maxRetries; i++)
            {
                try
                {
                    var queryVectorArray = await GetEmbeddingWithCacheAsync(question);
                    var queryVector = new Vector(queryVectorArray);

                    var relevantDocs = await _context.SystemKnowledges
                        .OrderBy(k => k.Embedding.CosineDistance(queryVector))
                        .Take(6) 
                        .ToListAsync();

                    var promptBuilder = new StringBuilder();
                    promptBuilder.AppendLine("Bạn là trợ lý AI quản lý hệ thống bán vé SmartEvent. Nhiệm vụ của bạn là hỗ trợ Admin.");
                    promptBuilder.AppendLine("Quy tắc BẮT BUỘC:");
                    promptBuilder.AppendLine("1. ƯU TIÊN HÀNG ĐẦU: Luôn đọc phần 'THÔNG TIN THAM CHIẾU (VECTOR SEARCH)' bên dưới để trả lời các câu hỏi về chính sách, quy định của hệ thống.");
                    promptBuilder.AppendLine("2. KHÔNG tự bịa số liệu. Phải GỌI HÀM (TOOLS) để lấy dữ liệu thống kê, check-in mới nhất.");
                    promptBuilder.AppendLine("3. Nếu Admin hỏi thông tin bên ngoài hệ thống (thời tiết, xu hướng), HÃY SỬ DỤNG HÀM TÌM KIẾM WEB.");
                    promptBuilder.AppendLine("4. Khi sử dụng dữ liệu từ Web, BẮT BUỘC phải trích dẫn đường link nguồn ở cuối câu trả lời.");
                    promptBuilder.AppendLine("5. Nếu cần thêm thông tin, hãy hỏi lại Admin để làm rõ thay vì tự suy diễn.");
                    promptBuilder.AppendLine("6. TÍNH NĂNG ĐIỀU PHỐI (HUMAN-IN-THE-LOOP): Nếu Admin hỏi về tình hình các cổng, và bạn phát hiện dữ liệu có sự 'Ùn tắc' hoặc 'Quá tải' (Sức chứa > 80%), bạn PHẢI đưa ra đề xuất điều hướng khách.");
                    promptBuilder.AppendLine("7. ĐỂ TẠO NÚT BẤM ĐIỀU HƯỚNG TRÊN GIAO DIỆN REACT, hãy chèn chính xác chuỗi sau vào cuối câu trả lời của bạn: [SUGGEST_ACTION|Tên Cổng|Nội dung đề xuất]");
                    promptBuilder.AppendLine("8. TÍNH NĂNG ĐIỀU TRA (AUDIT): Nếu Admin yêu cầu kiểm tra lịch sử, truy vết nhân viên gian lận, hoặc xem tình hình check-in, hãy gọi hàm [investigate_checkin_logs]. Sau khi có dữ liệu, hãy tóm tắt ngắn gọn và cảnh báo nếu có dấu hiệu bất thường (ví dụ: quá nhiều lỗi quét mã tại một cổng).");
                    promptBuilder.AppendLine("   [SUGGEST_ACTION|Tên Cổng Cần Cảnh Báo|Nội dung đề xuất gửi đến nhân viên trực cổng]");
                    promptBuilder.AppendLine("   Ví dụ: [SUGGEST_ACTION|Cổng chính - Lối vào 1|Cổng chính đang quá tải 85%, yêu cầu nhân viên hướng dẫn khách hàng di chuyển bớt sang Cổng phụ - Lối vào 2].");
                    promptBuilder.AppendLine("   Chú ý: Tên cổng phải là một trong các cổng chính thức của hệ thống: 'Cổng chính - Lối vào 1', 'Cổng phụ - Lối vào 2', 'Cổng VIP'.");

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

                    // CẤU HÌNH TOOL CALLING CHO OPENAI
                    var executionSettings = new OpenAIPromptExecutionSettings
                    {
                        ToolCallBehavior = ToolCallBehavior.AutoInvokeKernelFunctions,
                        Temperature = 0.2 // Tối ưu cho AI phân tích dữ liệu, giảm sự ảo giác
                    };

                    var result = await _chatCompletion.GetChatMessageContentAsync(
                        history,
                        executionSettings: executionSettings,
                        kernel: _kernel);

                    return result.Content ?? "Xin lỗi, tôi không thể tìm thấy câu trả lời.";
                }
                catch (Exception ex)
                {
                    _logger.LogError(ex, "Lỗi khi gọi OpenAI API. Lần thử: {Attempt}", i + 1);

                    // HttpOperationException chứa StatusCode của OpenAI
                    if (ex is HttpOperationException httpOpEx)
                    {
                        if (httpOpEx.StatusCode == HttpStatusCode.TooManyRequests || 
                            httpOpEx.StatusCode == HttpStatusCode.PaymentRequired)
                        {
                            _logger.LogCritical("Lỗi Hạn Ngạch OpenAI: {Response}", httpOpEx.ResponseContent);
                            if (i < maxRetries)
                            {
                                await Task.Delay(delayMs);
                                delayMs *= 2;
                                continue;
                            }
                            return "Tài khoản AI đang gặp sự cố về hạn mức sử dụng (Quota Exceeded). Vui lòng kiểm tra lại cấu hình Billing!";
                        }
                    }

                    if (i < maxRetries)
                    {
                        await Task.Delay(delayMs);
                        delayMs *= 2;
                        continue;
                    }

                    return $"Đã xảy ra lỗi AI nội bộ: {ex.Message}";
                }
            }

            return "Không thể kết nối đến máy chủ AI.";
        }

        public async Task<List<SystemKnowledgeDto>> SearchRelevantKnowledgeAsync(string question, int topK = 3)
        {
            if (string.IsNullOrWhiteSpace(question))
            {
                return new List<SystemKnowledgeDto>();
            }

            try
            {
                var queryVectorArray = await GetEmbeddingWithCacheAsync(question);
                var queryVector = new Vector(queryVectorArray);

                var relevantDocs = await _context.SystemKnowledges
                    .OrderBy(k => k.Embedding.CosineDistance(queryVector))
                    .Take(topK)
                    .ToListAsync();

                return relevantDocs
                    .Select(k => new SystemKnowledgeDto
                    {
                        Id = k.Id,
                        Title = k.Title,
                        Content = k.Content
                    })
                    .ToList();
            }
            catch (Exception ex)
            {
                // Không để lỗi RAG search làm sập luồng chat của khách hàng —
                // nếu lỗi, trả về rỗng, AIController sẽ tự fallback dùng RefundPolicy cũ từ SystemSettings.
                _logger.LogWarning(ex, "Lỗi khi tìm kiếm tri thức RAG cho câu hỏi: {Question}", question);
                return new List<SystemKnowledgeDto>();
            }
        }

        private async Task<float[]> GetEmbeddingWithCacheAsync(string question)
        {
            var cacheKey = question.Trim().ToLowerInvariant();

            if (_embeddingCache.TryGetValue(cacheKey, out var cached) && cached.ExpireAtUtc > DateTime.UtcNow)
            {
                return cached.Vector;
            }

            var queryEmbeddings = await _textEmbedding.GenerateEmbeddingsAsync(new[] { question });
            var vector = queryEmbeddings[0].ToArray();

            _embeddingCache[cacheKey] = (vector, DateTime.UtcNow.Add(_embeddingCacheTtl));

            return vector;
        }
    }
}