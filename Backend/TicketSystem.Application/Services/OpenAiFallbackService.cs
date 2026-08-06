using TicketSystem.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace TicketSystem.Application.Services
{
    public class OpenAiFallbackService : IOpenAiFallbackService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _model;

        public OpenAiFallbackService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = Timeout.InfiniteTimeSpan;

            // Dùng chung key với AdminChatbotService (AIConfigs:OpenAIApiKey) - không cần thêm config mới
            var key = configuration["AIConfigs:OpenAIApiKey"]?.Trim();
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new InvalidOperationException("Missing OpenAI configuration: AIConfigs:OpenAIApiKey.");
            }
            _apiKey = key;

            var model = configuration["AIConfigs:OpenAIFallbackModel"]?.Trim();
            _model = string.IsNullOrWhiteSpace(model) ? "gpt-4o-mini" : model;
        }

        public async Task<string> GenerateContentAsync(string prompt, CancellationToken cancellationToken = default)
        {
            try
            {
                var requestBody = new
                {
                    model = _model,
                    messages = new[] { new { role = "user", content = prompt } },
                    temperature = 0.2,
                    max_tokens = 1024
                };

                var jsonBody = JsonSerializer.Serialize(requestBody);
                using var request = new HttpRequestMessage(HttpMethod.Post, "https://api.openai.com/v1/chat/completions");
                request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _apiKey);
                request.Content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                using var response = await _httpClient.SendAsync(request, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorDetails = await response.Content.ReadAsStringAsync(cancellationToken);
                    throw new HttpRequestException($"OpenAI API Error ({response.StatusCode}): {errorDetails}");
                }

                var responseString = await response.Content.ReadAsStringAsync(cancellationToken);
                using var jsonDoc = JsonDocument.Parse(responseString);

                var choices = jsonDoc.RootElement.GetProperty("choices");
                if (choices.GetArrayLength() == 0)
                {
                    throw new InvalidOperationException("OpenAI returned no choices.");
                }

                var messageContent = choices[0].GetProperty("message").GetProperty("content").GetString();
                return messageContent ?? "Không thể tạo nội dung.";
            }
            catch (OperationCanceledException ex)
            {
                throw new TimeoutException("OpenAI request timed out.", ex);
            }
            catch (HttpRequestException)
            {
                throw;
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi khi gọi OpenAI API: {ex.Message}", ex);
            }
        }
    }
}