using TicketSystem.Application.Interfaces;
using TicketSystem.Application.Common;
using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using System.Threading;

namespace TicketSystem.Application.Services
{
    public class GeminiService : IGeminiService
    {
        private readonly HttpClient _httpClient;
        private readonly string _apiKey;
        private readonly string _model;

        public GeminiService(HttpClient httpClient, IConfiguration configuration)
        {
            _httpClient = httpClient;
            _httpClient.Timeout = Timeout.InfiniteTimeSpan;
            var key = configuration["GeminiAI:ApiKey"]?.Trim();
            if (string.IsNullOrWhiteSpace(key))
            {
                throw new InvalidOperationException("Missing Gemini configuration: GeminiAI:ApiKey. Configure it via User Secrets or environment variables.");
            }

            var model = configuration["GeminiAI:Model"]?.Trim();
            if (string.IsNullOrWhiteSpace(model))
            {
                throw new InvalidOperationException("Missing Gemini configuration: GeminiAI:Model. Configure it via appsettings, User Secrets, or environment variables.");
            }

            _apiKey = key;
            _model = model;
        }

        public async Task<string> GenerateContentAsync(string prompt, CancellationToken cancellationToken = default)
        {
            try
            {
                // Chuẩn bị request payload theo chuẩn Gemini API
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            role = "user",
                            parts = new[] { new { text = prompt } }
                        }
                    },
                    generationConfig = new
                    {
                        temperature = 0.2,
                        topP = 0.95,
                        maxOutputTokens = 1024
                    }
                };

                var jsonBody = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // Ensure model configured
                // Gọi Gemini API using model from configuration
                var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
                
                // Dùng chung rate limiter với AdminChatbotService/GeminiAiService vì cùng chung 1 API key => chung quota
                await GeminiRateLimiter.ThrottleAsync(cancellationToken);
                using var response = await _httpClient.PostAsync(requestUrl, content, cancellationToken);

                if (!response.IsSuccessStatusCode)
                {
                    var errorDetails = await response.Content.ReadAsStringAsync();
                    if (response.StatusCode == System.Net.HttpStatusCode.NotFound)
                    {
                        // Provide actionable guidance for 404 model errors
                        throw new HttpRequestException($"Gemini API Error (NotFound): {errorDetails}");
                    }

                    throw new HttpRequestException($"Gemini API Error ({response.StatusCode}): {errorDetails}");
                }

                // Parse response từ Gemini
                var responseString = await response.Content.ReadAsStringAsync();
                using var jsonDoc = JsonDocument.Parse(responseString);

                if (!jsonDoc.RootElement.TryGetProperty("candidates", out var candidates) || candidates.GetArrayLength() == 0)
                {
                    throw new InvalidOperationException("Gemini returned no candidates.");
                }

                var firstCandidate = candidates[0];
                if (!firstCandidate.TryGetProperty("content", out var contentElement) ||
                    !contentElement.TryGetProperty("parts", out var parts) ||
                    parts.GetArrayLength() == 0)
                {
                    throw new InvalidOperationException("Gemini returned an invalid response payload.");
                }

                var aiText = parts[0].GetProperty("text").GetString();

                return aiText ?? "Không thể tạo nội dung.";
            }
            catch (OperationCanceledException ex)
            {
                throw new TimeoutException("Gemini request timed out.", ex);
            }
            catch (HttpRequestException ex)
            {
                throw new Exception($"Lỗi khi gọi Gemini API: {ex.Message}", ex);
            }
            catch (JsonException ex)
            {
                throw new Exception($"Lỗi khi parse response từ Gemini: {ex.Message}", ex);
            }
            catch (Exception ex)
            {
                throw new Exception($"Lỗi không dự tính: {ex.Message}", ex);
            }
        }
    }
}