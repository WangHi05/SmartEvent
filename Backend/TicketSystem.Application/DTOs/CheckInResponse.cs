namespace TicketSystem.Application.DTOs
{
    /// <summary>
    /// DTO Trả về kết quả của thao tác Check-in (Quét mã QR)
    /// </summary>
    public class CheckInResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        
        // Thông tin phụ trợ trả về khi check-in thành công để hiển thị lên màn hình của nhân viên
        public string? CustomerName { get; set; }
        public string? TicketTypeName { get; set; }

        public bool TriggerPrintBadge { get; set; } = false; // Báo hiệu cho Frontend in thẻ

        // Factory Method pattern để tạo object nhanh và clean code
        public static CheckInResponse Success(string customerName, string ticketTypeName)
        {
            return new CheckInResponse 
            { 
                IsSuccess = true, 
                Message = "Check-in thành công", 
                CustomerName = customerName, 
                TicketTypeName = ticketTypeName 
            };
        }

        public static CheckInResponse Fail(string message)
        {
            return new CheckInResponse 
            { 
                IsSuccess = false, 
                Message = message 
            };
        }
    }

    public class CheckInRequest
    {
        public string QrPayload { get; set; } = string.Empty; // Chuỗi quét được từ Frontend
        public int PeopleCount { get; set; } = 1;             // Số người vào (dành cho vé đoàn)
        public string GateName { get; set; } = string.Empty;
    }
}