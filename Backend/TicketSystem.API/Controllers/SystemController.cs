using Microsoft.AspNetCore.Mvc;
using System;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/system")]
    public class SystemController : ControllerBase
    {
        /// <summary>
        /// API cung cấp thời gian chuẩn (UTC) của Server để Frontend đồng bộ sinh mã TOTP
        /// </summary>
        [HttpGet("time")]
        public IActionResult GetServerTime()
        {
            // Sử dụng DateTimeOffset.UtcNow để lấy chuẩn thời gian quốc tế
            // ToUnixTimeMilliseconds() giúp trả về con số nguyên (ví dụ: 1729400000000) 
            // Con số này hoàn toàn tương đương với Date.now() trong Javascript
            var serverTimeMs = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds();

            return Ok(new { serverTimeMs = serverTimeMs });
        }
    }
}