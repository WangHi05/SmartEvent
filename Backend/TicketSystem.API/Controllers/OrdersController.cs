using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Globalization;
using System.Net;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using Microsoft.Extensions.Logging;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    [Authorize]
    public class OrdersController : ControllerBase
    {
        private readonly IOrderService _orderService;
        private readonly ICancelOrderService _cancelOrderService;
        private readonly IConfiguration _configuration;
        private readonly ILogger<TicketsController> _logger;

        public OrdersController(
            IOrderService orderService, 
            ICancelOrderService cancelOrderService,
            IConfiguration configuration,
            ILogger<TicketsController> logger)
        {
            _orderService = orderService;
            _cancelOrderService = cancelOrderService;
            _configuration = configuration;
            _logger = logger;
        }

        /// <summary>
        /// Create a new order for booking tickets
        /// </summary>
        [Authorize]
        [HttpPost]
        public async Task<IActionResult> CreateOrder([FromBody] CreateOrderDto request)
        {
            if (!ModelState.IsValid)
                return BadRequest(ModelState);

            // Lấy Claim ID của người dùng. Nếu em dùng JWT chuẩn, nó thường là NameIdentifier.
            var userIdClaim = User.FindFirst(ClaimTypes.NameIdentifier);
            if (userIdClaim == null) 
                return Unauthorized(new { message = "Phiên đăng nhập không hợp lệ hoặc thiếu Token." });

            if (!Guid.TryParse(userIdClaim.Value, out Guid userId))
                return BadRequest(new { message = "Định dạng ID người dùng bị lỗi." });
            
            string createdBy = User.FindFirst(ClaimTypes.Name)?.Value ?? "Customer_Online";

            try
            {
                // Gọi tầng Application để xử lý nghiệp vụ
                var result = await _orderService.CreateOrderAsync(userId, request, createdBy);
                return Ok(result); // Trả về 200 OK cùng dữ liệu đơn hàng
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo đơn hàng cho User {UserId}", userId);
                // Trả về 400 Bad Request kèm câu thông báo lỗi nghiệp vụ (ví dụ: "Sự kiện đã đầy")
                return BadRequest(new { message = ex.Message }); 
            }
        }

        /// <summary>
        /// Get current user order history
        /// </summary>
        [HttpGet("my-orders")]
        public async Task<IActionResult> GetMyOrders(
            [FromQuery] int pageNumber = 1,
            [FromQuery] int pageSize = 10,
            [FromQuery] int? paymentStatus = null)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return Unauthorized(new { message = "Invalid user ID" });
                }

                var result = await _orderService.GetUserOrdersAsync(userIdGuid, pageNumber, pageSize, paymentStatus);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Get order detail for current user
        /// </summary>
        [HttpGet("{orderId:guid}")]
        public async Task<IActionResult> GetOrderDetail(Guid orderId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return Unauthorized(new { message = "Invalid user ID" });
                }

                var result = await _orderService.GetOrderDetailAsync(orderId, userIdGuid);
                if (result == null)
                {
                    return NotFound(new { message = "Order not found" });
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Confirm payment for the current user's order (demo flow)
        /// </summary>
        [HttpPost("{orderId:guid}/confirm-payment")]
        public async Task<IActionResult> ConfirmPayment(Guid orderId, [FromQuery] string? transactionReference = null)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return Unauthorized(new { message = "Invalid user ID" });
                }

                var result = await _orderService.ConfirmOrderPaymentAsync(orderId, userIdGuid, transactionReference ?? string.Empty);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Cancel an order and process refund
        /// </summary>
        [HttpPost("{orderId:guid}/cancel")]
        public async Task<IActionResult> CancelOrder(Guid orderId, [FromBody] CancelOrderRequestDto request)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return Unauthorized(new { message = "Invalid user ID" });
                }

                var username = User.FindFirst(ClaimTypes.Name)?.Value ?? "System";
                var reason = request?.Reason ?? "Customer requested cancellation";

                var result = await _cancelOrderService.CancelOrderAsync(orderId, userIdGuid, reason, username);

                if (!result.Success)
                {
                    return BadRequest(result);
                }

                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Validate if an order can be cancelled and get refund estimation
        /// </summary>
        [HttpPost("{orderId:guid}/validate-cancel")]
        public async Task<IActionResult> ValidateCancel(Guid orderId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return Unauthorized(new { message = "Invalid user ID" });
                }

                var result = await _cancelOrderService.ValidateCancelAsync(orderId, userIdGuid);
                return Ok(result);
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// Create VNPay payment URL for current user's order
        /// </summary>
        [HttpPost("{orderId:guid}/vnpay-payment-url")]
        public async Task<IActionResult> CreateVnPayPaymentUrl(Guid orderId)
        {
            try
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (!Guid.TryParse(userId, out var userIdGuid))
                {
                    return Unauthorized(new { message = "Invalid user ID" });
                }

                var order = await _orderService.GetOrderDetailAsync(orderId, userIdGuid);
                if (order == null)
                {
                    return NotFound(new { message = "Order not found" });
                }

                if (order.PaymentStatus == 1)
                {
                    return BadRequest(new { message = "Order already paid" });
                }

                var tmnCode = _configuration["VnPay:TmnCode"];
                var hashSecret = _configuration["VnPay:HashSecret"];
                var baseUrl = _configuration["VnPay:BaseUrl"];
                var returnUrl = _configuration["VnPay:ReturnUrl"];
                var version = _configuration["VnPay:Version"] ?? "2.1.0";
                var command = _configuration["VnPay:Command"] ?? "pay";
                var currCode = _configuration["VnPay:CurrCode"] ?? "VND";
                var locale = _configuration["VnPay:Locale"] ?? "vn";
                var timeZoneId = _configuration["VnPay:TimeZoneId"] ?? "SE Asia Standard Time";

                if (string.IsNullOrWhiteSpace(tmnCode) ||
                    string.IsNullOrWhiteSpace(hashSecret) ||
                    string.IsNullOrWhiteSpace(baseUrl) ||
                    string.IsNullOrWhiteSpace(returnUrl))
                {
                    return BadRequest(new { message = "VNPay configuration is missing" });
                }

                var now = TimeZoneInfo.ConvertTime(DateTime.UtcNow, TimeZoneInfo.FindSystemTimeZoneById(timeZoneId));
                var txnRef = order.Id.ToString("N");
                var amount = ((long)Math.Round(order.TotalPrice, 0, MidpointRounding.AwayFromZero) * 100L).ToString(CultureInfo.InvariantCulture);
                var ipAddr = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "127.0.0.1";

                var vnpParams = new SortedDictionary<string, string>(StringComparer.Ordinal)
                {
                    ["vnp_Version"] = version,
                    ["vnp_Command"] = command,
                    ["vnp_TmnCode"] = tmnCode,
                    ["vnp_Amount"] = amount,
                    ["vnp_CurrCode"] = currCode,
                    ["vnp_TxnRef"] = txnRef,
                    ["vnp_OrderInfo"] = $"Thanh toan don hang {order.Id}",
                    ["vnp_OrderType"] = "other",
                    ["vnp_Locale"] = locale,
                    ["vnp_ReturnUrl"] = returnUrl,
                    ["vnp_IpAddr"] = ipAddr,
                    ["vnp_CreateDate"] = now.ToString("yyyyMMddHHmmss")
                };

                var queryString = BuildQueryString(vnpParams);
                var secureHash = ComputeHmacSha512(hashSecret, queryString);
                var paymentUrl = $"{baseUrl}?{queryString}&vnp_SecureHash={secureHash}";

                return Ok(new { paymentUrl });
            }
            catch (Exception ex)
            {
                return BadRequest(new { message = ex.Message });
            }
        }

        /// <summary>
        /// VNPay callback endpoint
        /// </summary>
        [AllowAnonymous]
        [HttpGet("vnpay-return")]
        public async Task<IActionResult> VnPayReturn()
        {
            var frontendResultUrl = _configuration["VnPay:FrontendResultUrl"] ?? "http://localhost:5173/customer/payment-result";

            try
            {
                var hashSecret = _configuration["VnPay:HashSecret"];
                if (string.IsNullOrWhiteSpace(hashSecret))
                {
                    return Redirect($"{frontendResultUrl}?paymentMethod=1&status=failed&message=MissingHashSecret");
                }

                var queryParams = Request.Query
                    .Where(x => x.Key.StartsWith("vnp_", StringComparison.OrdinalIgnoreCase))
                    .ToDictionary(x => x.Key, x => x.Value.ToString());

                if (!queryParams.TryGetValue("vnp_SecureHash", out var vnpSecureHash) || string.IsNullOrWhiteSpace(vnpSecureHash))
                {
                    return Redirect($"{frontendResultUrl}?paymentMethod=1&status=failed&message=MissingSecureHash");
                }

                queryParams.Remove("vnp_SecureHash");
                queryParams.Remove("vnp_SecureHashType");

                var sortedParams = new SortedDictionary<string, string>(queryParams, StringComparer.Ordinal);
                var signData = BuildQueryString(sortedParams);
                var expectedHash = ComputeHmacSha512(hashSecret, signData);

                if (!string.Equals(expectedHash, vnpSecureHash, StringComparison.OrdinalIgnoreCase))
                {
                    return Redirect($"{frontendResultUrl}?paymentMethod=1&status=failed&message=InvalidSignature");
                }

                var responseCode = Request.Query["vnp_ResponseCode"].ToString();
                var txnRef = Request.Query["vnp_TxnRef"].ToString();
                var transactionNo = Request.Query["vnp_TransactionNo"].ToString();
                var amount = Request.Query["vnp_Amount"].ToString();

                if (!Guid.TryParseExact(txnRef, "N", out var orderId))
                {
                    return Redirect($"{frontendResultUrl}?paymentMethod=1&status=failed&message=InvalidOrderRef");
                }

                if (responseCode == "00")
                {
                    await _orderService.ConfirmOrderPaymentBySystemAsync(orderId, transactionNo);
                    return Redirect($"{frontendResultUrl}?paymentMethod=1&status=success&orderId={orderId}&totalPrice={amount}");
                }

                return Redirect($"{frontendResultUrl}?paymentMethod=1&status=failed&orderId={orderId}&code={responseCode}");
            }
            catch
            {
                return Redirect($"{frontendResultUrl}?paymentMethod=1&status=failed&message=ServerError");
            }
        }

        private static string BuildQueryString(SortedDictionary<string, string> parameters)
        {
            return string.Join("&", parameters
                .Where(p => !string.IsNullOrWhiteSpace(p.Value))
                .Select(p => $"{WebUtility.UrlEncode(p.Key)}={WebUtility.UrlEncode(p.Value)}"));
        }

        private static string ComputeHmacSha512(string key, string inputData)
        {
            var keyBytes = Encoding.UTF8.GetBytes(key);
            var inputBytes = Encoding.UTF8.GetBytes(inputData);
            using var hmac = new HMACSHA512(keyBytes);
            var hashBytes = hmac.ComputeHash(inputBytes);
            return BitConverter.ToString(hashBytes).Replace("-", "").ToLowerInvariant();
        }
    }
}
