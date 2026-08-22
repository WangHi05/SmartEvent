using System;
using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Giao diện định nghĩa các nghiệp vụ hỗ trợ khách hàng.
    /// Giúp Controller giảm sự phụ thuộc trực tiếp vào logic xử lý (Loose Coupling).
    /// </summary>
    public interface IHelpDeskService
    {
        Task<List<HelpDeskTicketResponseDto>> SearchTicketsAsync(string keyword);
        
        Task<HelpDeskTicketResponseDto> RevokeAndReissueAsync(Guid oldTicketId, RevokeAndReissueRequestDto request);
        
        Task<bool> ManualCheckInAsync(Guid ticketId, int peopleCount, string reason, string actionBy);
    }
}