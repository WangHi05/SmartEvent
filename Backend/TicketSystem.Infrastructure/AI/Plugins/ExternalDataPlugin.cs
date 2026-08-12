using System.ComponentModel;
using Microsoft.SemanticKernel;
using Microsoft.Extensions.Configuration;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Text.Json;
using System.Linq;

namespace TicketSystem.Infrastructure.AI.Plugins
{
    /// <summary>
    /// Plugin cung cấp khả năng tìm kiếm thông tin trên Internet theo thời gian thực.
    /// Giúp AI tránh bịa đặt thông tin và có đường link dẫn chứng.
    /// </summary>
    public class ExternalDataPlugin
    {
        private readonly HttpClient _httpClient;
        private readonly string _serperApiKey;

        public ExternalDataPlugin(IConfiguration configuration)
        {
            _httpClient = new HttpClient();

            _serperApiKey = configuration["Serper:ApiKey"]?.Trim()
                ?? throw new InvalidOperationException("Missing Serper API key.");
        }

        [KernelFunction("search_web_for_trends_and_news")]
        [Description("Tìm kiếm thông tin trên Internet. CHỈ SỬ DỤNG hàm này khi Admin hỏi về: Xu hướng sự kiện bên ngoài, thời tiết, tin tức xã hội, hoặc khi dữ liệu nội bộ (Vector Search) không có thông tin.")]
        public async Task<string> SearchWebAsync(
            [Description("Câu truy vấn tìm kiếm ngắn gọn, ví dụ: 'Thời tiết TP.HCM ngày mai', 'Xu hướng sự kiện âm nhạc 2026'")] string query)
        {
            try
            {
                var request = new HttpRequestMessage(HttpMethod.Post, "https://google.serper.dev/search");
                request.Headers.Add("X-API-KEY", _serperApiKey);
                
                var content = new StringContent(JsonSerializer.Serialize(new { q = query, num = 3 }), null, "application/json");
                request.Content = content;

                var response = await _httpClient.SendAsync(request);
                response.EnsureSuccessStatusCode();

                var jsonResponse = await response.Content.ReadAsStringAsync();
                using var document = JsonDocument.Parse(jsonResponse);

                // Trích xuất các đoạn snippet và link nguồn từ Google Search.
                var results = document.RootElement.GetProperty("organic")
                    .EnumerateArray()
                    .Select(x => new 
                    {
                        Title = x.GetProperty("title").GetString(),
                        Snippet = x.GetProperty("snippet").GetString(),
                        Link = x.GetProperty("link").GetString()
                    }).ToList();

                if (!results.Any()) return "Không tìm thấy thông tin trên Internet.";

                var resultString = "Dữ liệu tìm kiếm từ Internet:\n";
                foreach (var item in results)
                {
                    resultString += $"- {item.Title}: {item.Snippet} (Nguồn: {item.Link})\n";
                }

                return resultString;
            }
            catch (Exception ex)
            {
                return $"Lỗi khi tìm kiếm web: {ex.Message}";
            }
        }
    }
}