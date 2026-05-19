using TicketSystem.Application.Interfaces;
using Microsoft.Extensions.Configuration;
using System;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;

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
            var key = configuration["GeminiAI:ApiKey"];
            _apiKey = key?.Trim() ?? throw new ArgumentNullException("Gemini API Key is missing");
            var model = configuration["GeminiAI:Model"];
            _model = model?.Trim();
        }

        public async Task<string> GenerateContentAsync(string prompt)
        {
            try
            {
                // Chuẩn bị request payload theo chuẩn Gemini API
                var requestBody = new
                {
                    contents = new[]
                    {
                        new { parts = new[] { new { text = prompt } } }
                    }
                };

                var jsonBody = JsonSerializer.Serialize(requestBody);
                var content = new StringContent(jsonBody, Encoding.UTF8, "application/json");

                // Ensure model configured
                if (string.IsNullOrWhiteSpace(_model))
                {
                    throw new InvalidOperationException("Gemini model is not configured. Set 'GeminiAI:Model' in appsettings.json or via environment variable to a supported model name (e.g. models/gemini-1.5). See ModelService.ListModels for available models.");
                }

                // Gọi Gemini API using model from configuration
                var requestUrl = $"https://generativelanguage.googleapis.com/v1beta/models/{_model}:generateContent?key={_apiKey}";
                
                var response = await _httpClient.PostAsync(requestUrl, content);

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
                
                var aiText = jsonDoc.RootElement
                    .GetProperty("candidates")[0]
                    .GetProperty("content")
                    .GetProperty("parts")[0]
                    .GetProperty("text").GetString();

                return aiText ?? "Không thể tạo nội dung.";
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
