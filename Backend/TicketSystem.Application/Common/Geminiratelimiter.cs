using System;
using System.Threading;
using System.Threading.Tasks;

namespace TicketSystem.Application.Common
{
    /// <summary>
    /// Rate limiter DÙNG CHUNG cho MỌI service gọi tới Gemini API trong toàn bộ hệ thống
    /// (AdminChatbotService - chat + embedding, GeminiAiService, GeminiService...).
    ///
    /// Lý do cần dùng chung: các service này tuy nằm ở các namespace/class khác nhau
    /// nhưng đều dùng CHUNG 1 API key thật của Google => CHUNG 1 quota RPM.
    /// Nếu mỗi service tự throttle riêng, tổng số request thực tế gửi lên Google
    /// vẫn có thể vượt quota bất cứ lúc nào 2 service cùng được gọi gần nhau,
    /// gây lỗi 429 dù mỗi service tưởng như đã "chờ đủ lâu" theo góc nhìn của riêng nó.
    ///
    /// Cách dùng: gọi "await GeminiRateLimiter.ThrottleAsync();" NGAY TRƯỚC mỗi lần
    /// gửi request thật sự tới generativelanguage.googleapis.com.
    /// </summary>
    public static class GeminiRateLimiter
    {
        private static readonly SemaphoreSlim _gate = new SemaphoreSlim(1, 1);
        private static DateTime _lastCallUtc = DateTime.MinValue;

        // Chỉnh theo tier thực tế trên Google AI Studio. Vì giờ TẤT CẢ service dùng chung
        // 1 API key cùng chia sẻ 1 quota, khoảng cách này áp dụng cho TOÀN BỘ hệ thống,
        // không phải riêng từng service => nên để dư dả một chút.
        private static readonly TimeSpan _minIntervalBetweenCalls = TimeSpan.FromMilliseconds(4500);

        public static async Task ThrottleAsync(CancellationToken cancellationToken = default)
        {
            await _gate.WaitAsync(cancellationToken);
            try
            {
                var elapsed = DateTime.UtcNow - _lastCallUtc;
                if (elapsed < _minIntervalBetweenCalls)
                {
                    await Task.Delay(_minIntervalBetweenCalls - elapsed, cancellationToken);
                }
                _lastCallUtc = DateTime.UtcNow;
            }
            finally
            {
                _gate.Release();
            }
        }
    }
}