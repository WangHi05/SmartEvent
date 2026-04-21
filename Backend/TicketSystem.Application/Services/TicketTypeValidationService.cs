using System;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.Application.Services
{
    // Service to validate business rules for TicketType
    public class TicketTypeValidationService
    {
        private readonly IGenericRepository<Event> _eventRepository;
        private readonly ITicketTypeRepository _ticketTypeRepository;

        public TicketTypeValidationService(
            IGenericRepository<Event> eventRepository,
            ITicketTypeRepository ticketTypeRepository)
        {
            _eventRepository = eventRepository;
            _ticketTypeRepository = ticketTypeRepository;
        }

        // Validate CreateTicketTypeDto before saving
        public async Task<(bool IsValid, string? ErrorMessage)> ValidateCreateAsync(
            Guid eventId, 
            CreateTicketTypeDto request)
        {
            // Kiểm tra Event tồn tại
            var @event = await _eventRepository.GetByIdAsync(eventId);
            if (@event == null)
                return (false, $"Không tìm thấy sự kiện với ID: {eventId}");

            // Validate chung
            var commonValidation = await ValidateCommonAsync(eventId, request.TicketMode, request.Name, null);
            if (!commonValidation.IsValid)
                return commonValidation;

            // Validate theo loại vé
            if (request.TicketMode == (int)TicketMode.INDIVIDUAL)
            {
                var individualValidation = ValidateIndividualTicket(request);
                if (!individualValidation.IsValid)
                    return individualValidation;
            }
            else if (request.TicketMode == (int)TicketMode.GROUP)
            {
                var groupValidation = ValidateGroupTicket(request);
                if (!groupValidation.IsValid)
                    return groupValidation;
            }

            // Validate capacity
            var capacityValidation = await ValidateCapacityAsync(eventId, request.Quantity, @event.MaxCapacity);
            if (!capacityValidation.IsValid)
                return capacityValidation;

            // Validate time
            var timeValidation = ValidateSaleTime(request.SaleStartTime, request.SaleEndTime, @event.StartTime);
            if (!timeValidation.IsValid)
                return timeValidation;

            return (true, null);
        }

        // Validate UpdateTicketTypeDto before saving
        public async Task<(bool IsValid, string? ErrorMessage)> ValidateUpdateAsync(
            Guid ticketTypeId,
            UpdateTicketTypeDto request)
        {
            var existingTicketType = await _ticketTypeRepository.GetByIdAsync(ticketTypeId);
            if (existingTicketType == null)
                return (false, $"Không tìm thấy loại vé với ID: {ticketTypeId}");

            var @event = await _eventRepository.GetByIdAsync(existingTicketType.EventId);
            if (@event == null)
                return (false, "Không tìm thấy sự kiện");

            // Validate chung
            var commonValidation = await ValidateCommonAsync(
                existingTicketType.EventId, 
                request.TicketMode, 
                request.Name,
                ticketTypeId);
            if (!commonValidation.IsValid)
                return commonValidation;

            // Validate theo loại vé
            if (request.TicketMode == (int)TicketMode.INDIVIDUAL)
            {
                if (request.UsageType == null)
                    return (false, "Kiểu sử dụng là bắt buộc cho vé cá nhân");
            }
            else if (request.TicketMode == (int)TicketMode.GROUP)
            {
                if (request.MinGroupSize == null || request.MaxGroupSize == null)
                    return (false, "Số người tối thiểu/tối đa là bắt buộc cho vé đoàn");
            }

            // Validate time
            var timeValidation = ValidateSaleTime(request.SaleStartTime, request.SaleEndTime, @event.StartTime);
            if (!timeValidation.IsValid)
                return timeValidation;

            return (true, null);
        }

        private async Task<(bool IsValid, string? ErrorMessage)> ValidateCommonAsync(
            Guid eventId,
            int ticketMode,
            string name,
            Guid? excludeId = null)
        {
            // Validate TicketMode
            if (ticketMode != (int)TicketMode.INDIVIDUAL && ticketMode != (int)TicketMode.GROUP)
                return (false, "Loại vé không hợp lệ");

            // Validate tên
            if (string.IsNullOrWhiteSpace(name))
                return (false, "Tên loại vé là bắt buộc");

            // Validate tên duy nhất trong Event
            var isNameUnique = await _ticketTypeRepository.IsNameUniqueInEventAsync(eventId, name, excludeId);
            if (!isNameUnique)
                return (false, $"Tên loại vé '{name}' đã tồn tại trong sự kiện này");

            return (true, null);
        }

        private (bool IsValid, string? ErrorMessage) ValidateIndividualTicket(CreateTicketTypeDto request)
        {
            if (request.UsageType == null || (request.UsageType != (int)UsageType.ONE_TIME && request.UsageType != (int)UsageType.MULTI_DAY))
                return (false, "Kiểu sử dụng không hợp lệ cho vé cá nhân");

            // Vé cá nhân không được có fields của vé đoàn
            if (request.MinGroupSize != null || request.MaxGroupSize != null)
                return (false, "Vé cá nhân không có giới hạn kích thước đoàn");

            return (true, null);
        }

        private (bool IsValid, string? ErrorMessage) ValidateGroupTicket(CreateTicketTypeDto request)
        {
            if (request.MinGroupSize == null || request.MaxGroupSize == null)
                return (false, "Số người tối thiểu/tối đa là bắt buộc cho vé đoàn");

            if (request.MinGroupSize < 2)
                return (false, "Số người tối thiểu phải >= 2");

            if (request.MaxGroupSize < request.MinGroupSize)
                return (false, "Số người tối đa phải >= số người tối thiểu");

            if (request.QRMode == null || (request.QRMode != (int)QRMode.SINGLE_QR && request.QRMode != (int)QRMode.SUB_QR))
                return (false, "QR Mode không hợp lệ");

            if (request.PriceMode == null || (request.PriceMode != (int)PriceMode.PER_TICKET && request.PriceMode != (int)PriceMode.PER_GROUP))
                return (false, "Price Mode không hợp lệ");

            // Vé đoàn không được có UsageType
            if (request.UsageType != null)
                return (false, "Vé đoàn không có kiểu sử dụng");

            return (true, null);
        }

        private async Task<(bool IsValid, string? ErrorMessage)> ValidateCapacityAsync(
            Guid eventId,
            int requestedQuantity,
            int eventCapacity,
            Guid? excludeTicketTypeId = null)
        {
            // Validate quantity dương
            if (requestedQuantity <= 0)
                return (false, "Số lượng phải > 0");

            // Validate tổng capacity không vượt event capacity
            var currentTotalQuantity = await _ticketTypeRepository.GetTotalMaxCapacityByEventAsync(eventId);
            
            // Nếu là update, trừ đi quantity của ticket type hiện tại
            if (excludeTicketTypeId.HasValue)
            {
                var existingTicketType = await _ticketTypeRepository.GetByIdAsync(excludeTicketTypeId.Value);
                if (existingTicketType != null)
                {
                    currentTotalQuantity -= existingTicketType.Quantity;
                }
            }

            if (currentTotalQuantity + requestedQuantity > eventCapacity)
                return (false, 
                    $"Tổng sức chứa sẽ vượt quá giới hạn của sự kiện. " +
                    $"Hiện tại: {currentTotalQuantity}, yêu cầu thêm: {requestedQuantity}, " +
                    $"giới hạn: {eventCapacity}");

            return (true, null);
        }

        private (bool IsValid, string? ErrorMessage) ValidateSaleTime(
            DateTime saleStartTime,
            DateTime saleEndTime,
            DateTime eventStartTime)
        {
            if (saleEndTime <= saleStartTime)
                return (false, "Thời gian kết thúc bán phải sau thời gian bắt đầu bán");

            if (saleEndTime > eventStartTime)
                return (false, "Thời gian kết thúc bán không được sau khi sự kiện bắt đầu");

            return (true, null);
        }
    }
}
