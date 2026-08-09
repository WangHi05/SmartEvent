using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs; 
using TicketSystem.Application.Events; 
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities; 
using Microsoft.AspNetCore.Http;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;
using OtpNet;
using MediatR;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using TicketSystem.Application.Common;

namespace TicketSystem.Application.Services
{

    public class TicketLookupResponse
    {
        public bool IsSuccess { get; set; }
        public string Message { get; set; } = string.Empty;
        public string CustomerName { get; set; } = string.Empty;
        public string TicketTypeName { get; set; } = string.Empty;
        public int RemainingSlots { get; set; }
    }

    public class TicketCheckInService : ITicketCheckInService
    {
        private readonly IApplicationDbContext _context;
        private readonly IMediator _mediator;
        private readonly IMemoryCache _cache;
        private readonly IHttpContextAccessor _httpContextAccessor;
        private readonly ILogger<TicketCheckInService> _logger;

        private static readonly TimeSpan DuplicateRequestWindow = TimeSpan.FromSeconds(30);
        private static readonly HashSet<string> AllowedGateNames = new(StringComparer.OrdinalIgnoreCase)
        {
            "Cổng chính - Lối vào 1",
            "Cổng phụ - Lối vào 2",
            "Cổng VIP"
        };

        public TicketCheckInService(
            IApplicationDbContext context,
            IMediator mediator,
            IMemoryCache cache,
            IHttpContextAccessor httpContextAccessor,
            ILogger<TicketCheckInService> logger)
        {
            _context = context;
            _mediator = mediator;
            _cache = cache;
            _httpContextAccessor = httpContextAccessor;
            _logger = logger;
        }
        /// <summary>
        /// Nếu vé thuộc loại DAILY_MULTI (sự kiện nhiều ngày) và đã sang ngày mới (giờ VN)
        /// so với lần check-in gần nhất, tự động "mở lại" toàn bộ slot cho ngày hôm nay.
        /// Vé ONE_TIME không bị ảnh hưởng bởi hàm này.
        /// </summary>
        private static void ResetSlotsIfNewDayForMultiDayTicket(Ticket ticket)
        {
            if (ticket.TicketType?.AccessType != TicketAccessType.DAILY_MULTI) return;

            var today = VietnamTime.Today;
            if (ticket.LastCheckInDate == null || ticket.LastCheckInDate.Value < today)
            {
                ticket.RemainingSlots = ticket.GroupSize;
                ticket.Status = TicketStatus.ACTIVE;
                ticket.IsCheckedIn = false;
            }
        }

        public async Task<TicketLookupResponse> LookupTicketAsync(string qrPayload)
        {
            var parts = qrPayload.Split('|');
            if (parts.Length != 2 || !Guid.TryParse(parts[0], out Guid ticketId))
                return new TicketLookupResponse { IsSuccess = false, Message = "Định dạng QR không hợp lệ." };

            var ticket = await _context.Tickets
                .Include(t => t.TicketType).ThenInclude(tt => tt!.Event)
                .Include(t => t.Order).ThenInclude(order => order!.Customer)
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null)
                return new TicketLookupResponse { IsSuccess = false, Message = "Vé không tồn tại." };

            if (ticket.Status == TicketStatus.CANCELLED)
                return new TicketLookupResponse { IsSuccess = false, Message = "Vé đã bị hủy." };

            if (ticket.RemainingSlots == 0 || ticket.Status == TicketStatus.CHECKED_IN)
                return new TicketLookupResponse { IsSuccess = false, Message = "Vé đã được sử dụng hết." };

            // Xác thực mã OTP (chống làm giả QR)
            string clientOtp = parts[1];
            var totp = new Totp(Base32Encoding.ToBytes(ticket.SecretKey));
            var window = new VerificationWindow(previous: 1, future: 1);
            if (!totp.VerifyTotp(clientOtp, out _, window))
                return new TicketLookupResponse { IsSuccess = false, Message = "Mã QR đã hết hạn. Yêu cầu khách làm mới mã." };

            return new TicketLookupResponse
            {
                IsSuccess = true,
                CustomerName = ticket.Order?.Customer?.FullName ?? "Khách vãng lai",
                TicketTypeName = ticket.TicketType?.Name ?? "Vé sự kiện",
                RemainingSlots = ticket.RemainingSlots
            };
        }

        public async Task<CheckInResponse> ManualCheckInAsync(Guid ticketId, int peopleCount, string staffId, string reason)
        {
            var ticket = await _context.Tickets
                .Include(t => t.TicketType)
                .FirstOrDefaultAsync(t => t.Id == ticketId);

            if (ticket == null)
                return new CheckInResponse { IsSuccess = false, Message = "Vé không tồn tại." };

            ResetSlotsIfNewDayForMultiDayTicket(ticket);

            if (ticket.Status != TicketStatus.ACTIVE)
                return new CheckInResponse { IsSuccess = false, Message = "Vé đã sử dụng hết hoặc không hoạt động." };

            var now = VietnamTime.Now;
            
            // DÙNG REMAINING SLOTS THAY VÌ SUM LOG
            if (ticket.RemainingSlots < peopleCount)
                return new CheckInResponse { IsSuccess = false, Message = $"Vượt quá giới hạn. Đoàn chỉ còn lại {ticket.RemainingSlots} chỗ trống." };

            ticket.RemainingSlots -= peopleCount;
            ticket.LastCheckInDate = VietnamTime.Today;

            if (ticket.RemainingSlots == 0)
            {
                ticket.Status = TicketStatus.CHECKED_IN;
                ticket.IsCheckedIn = true;
            }

            var eventId = ticket.TicketType?.EventId ?? Guid.Empty;

            var log = new CheckInLog
            {
                Id = Guid.NewGuid(),
                TicketId = ticket.Id,
                EventId = eventId,
                CheckedAt = now,
                CheckinDate = DateOnly.FromDateTime(now),
                Type = ScanType.Entry, 
                PeopleCount = peopleCount,
                GateName = "Quầy Hỗ Trợ (Help Desk)",
                StaffId = staffId,
                Note = reason,
                CheckInResult = "Success",
                QRCodeData = null,
                FailureReason = null,
                CreatedAt = now,
                CreatedBy = staffId
            };

            await _context.CheckInLogs.AddAsync(log);

            try
            {
                // BẮT LỖI OCC
                await _context.SaveChangesAsync(default);
            }
            catch (DbUpdateConcurrencyException)
            {
                return new CheckInResponse { IsSuccess = false, Message = "Vé này vừa được thao tác bởi một nhân viên khác. Vui lòng kiểm tra lại số lượng." };
            }
            
            return CheckInResponse.Success("Thành công", $"Đã check-in thủ công {peopleCount} người.");
        }

        public async Task<CheckInResponse> ProcessScanAsync(CheckInRequest request, string staffId)
        {
            var qrPayload = request?.QrPayload?.Trim() ?? string.Empty;
            var gateName = request?.GateName?.Trim() ?? string.Empty;
            var peopleCount = request?.PeopleCount ?? 1;
            var timestamp = VietnamTime.Now;
            Guid ticketId = Guid.Empty;
            Guid eventId = Guid.Empty;
            string eventName = string.Empty;

            var requestSignature = BuildRequestSignature(staffId, qrPayload, peopleCount, gateName);
            var processedKey = $"checkin_processed_{requestSignature}";
            var lockKey = $"checkin_lock_{requestSignature}";

            if (_cache.TryGetValue(processedKey, out CheckInResponse? cachedResponse) && cachedResponse != null)
            {
                return cachedResponse;
            }

            if (_cache.TryGetValue(lockKey, out _))
            {
                return CheckInResponse.Fail("Hệ thống đang xử lý yêu cầu quét này, vui lòng thử lại sau vài giây.");
            }

            _cache.Set(lockKey, true, TimeSpan.FromSeconds(5));

            try
            {
                if (string.IsNullOrWhiteSpace(qrPayload))
                {
                    var response = CheckInResponse.Fail("Dữ liệu QR không được để trống.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        TicketId = Guid.Empty,
                        EventId = Guid.Empty,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                var parts = qrPayload.Split('|');
                if (parts.Length != 2 || !Guid.TryParse(parts[0], out Guid parsedTicketId))
                {
                    var response = CheckInResponse.Fail("Định dạng QR không hợp lệ.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        TicketId = Guid.Empty,
                        EventId = Guid.Empty,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                ticketId = parsedTicketId;

                if (!IsRecognizedGate(gateName))
                {
                    var response = CheckInResponse.Fail("Sai cổng. Vui lòng kiểm tra lại vị trí quét.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        TicketId = ticketId,
                        EventId = Guid.Empty,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                string clientOtp = parts[1];

                var ticket = await _context.Tickets
                    .Include(t => t.TicketType)
                        .ThenInclude(tt => tt!.Event)
                    .Include(t => t.Order)
                        .ThenInclude(order => order!.Customer)
                    .FirstOrDefaultAsync(t => t.Id == ticketId);

                if (ticket == null)
                {
                    // giữ nguyên nhánh xử lý ticket == null như cũ
                }

                ResetSlotsIfNewDayForMultiDayTicket(ticket!);

                if (ticket == null)
                {
                    var response = CheckInResponse.Fail("Vé không tồn tại.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        TicketId = ticketId,
                        EventId = Guid.Empty,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                eventId = ticket.TicketType?.EventId ?? Guid.Empty;
                eventName = ticket.TicketType?.Event?.Name ?? string.Empty;

                ResetSlotsIfNewDayForMultiDayTicket(ticket);

                if (ticket.Status == TicketStatus.CANCELLED)
                {
                    var response = CheckInResponse.Fail("Vé đã hủy.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                if (ticket.Status == TicketStatus.REVOKED)
                {
                    var response = CheckInResponse.Fail("Vé đã bị thu hồi.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                if (ticket.Status == TicketStatus.CHECKED_IN || ticket.IsCheckedIn)
                {
                    var response = CheckInResponse.Fail("Vé đã check-in.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                if (ticket.TicketType?.Event != null && VietnamTime.ToVietnamTime(ticket.TicketType.Event.EndTime) < timestamp)
                {
                    var response = CheckInResponse.Fail("Event đã kết thúc.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                if (ticket.Status != TicketStatus.ACTIVE)
                {
                    var response = CheckInResponse.Fail("Vé không ở trạng thái hoạt động.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                var totp = new Totp(Base32Encoding.ToBytes(ticket.SecretKey));
                var window = new VerificationWindow(previous: 1, future: 1);
                if (!totp.VerifyTotp(clientOtp, out _, window))
                {
                    var response = CheckInResponse.Fail("QR không hợp lệ hoặc đã hết hạn.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }
                // Chặn replay: cùng 1 OTP không được dùng để check-in 2 lần,
                // kể cả khi cache dedupe 30s đã hết hạn.
                if (!string.IsNullOrEmpty(ticket.LastUsedOtp) && ticket.LastUsedOtp == clientOtp)
                {
                    var response = CheckInResponse.Fail("Mã QR này vừa được dùng để check-in. Vui lòng yêu cầu khách làm mới mã.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                if (timestamp < VietnamTime.ToVietnamTime(ticket.ValidFrom) || timestamp > VietnamTime.ToVietnamTime(ticket.ValidTo))
                {
                    var response = CheckInResponse.Fail("Vé hết hạn.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                var triggerPrint = false;
                if (ticket.TicketType != null && ticket.TicketType.Name.Contains("B2B"))
                {
                    if (ticket.IsBadgePrinted)
                    {
                        var response = CheckInResponse.Fail("Mã QR này đã được in thẻ tham quan.");
                        await PersistCheckInOutcomeAsync(new CheckInOutcome
                        {
                            Ticket = ticket,
                            TicketId = ticketId,
                            EventId = eventId,
                            EventName = eventName,
                            StaffId = staffId,
                            GateName = gateName,
                            QrPayload = qrPayload,
                            PeopleCount = peopleCount,
                            Timestamp = timestamp,
                            IsSuccess = false,
                            FailureReason = response.Message,
                            ScanType = ScanType.Entry,
                            Note = "QR check-in"
                        });
                        _cache.Set(processedKey, response, DuplicateRequestWindow);
                        return response;
                    }

                    ticket.IsBadgePrinted = true;
                    triggerPrint = true;
                }

                if (peopleCount <= 0)
                {
                    var response = CheckInResponse.Fail("Số lượng người vào cổng không hợp lệ.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                if (ticket.RemainingSlots < peopleCount)
                {
                    var response = CheckInResponse.Fail($"Vượt quá giới hạn của đoàn. Chỉ còn lại {ticket.RemainingSlots} chỗ trống.");
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        Ticket = ticket,
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    });
                    _cache.Set(processedKey, response, DuplicateRequestWindow);
                    return response;
                }

                ticket.RemainingSlots -= peopleCount;
                ticket.LastCheckInDate = VietnamTime.Today;
                ticket.LastUsedOtp = clientOtp;
                ticket.LastUsedOtpAt = timestamp;

                if (ticket.RemainingSlots == 0)
                {
                    ticket.Status = TicketStatus.CHECKED_IN;
                    ticket.IsCheckedIn = true;
                }
                var logScanType = triggerPrint ? ScanType.Print : ScanType.Entry;
                await PersistCheckInOutcomeAsync(new CheckInOutcome
                {
                    Ticket = ticket,
                    TicketId = ticketId,
                    EventId = eventId,
                    EventName = eventName,
                    StaffId = staffId,
                    GateName = gateName,
                    QrPayload = qrPayload,
                    PeopleCount = peopleCount,
                    Timestamp = timestamp,
                    IsSuccess = true,
                    ScanType = logScanType,
                    Note = triggerPrint ? "In thẻ B2B" : "QR check-in"
                });

                if (ticket.TicketType != null)
                {
                    await _mediator.Publish(new TicketCheckedInEvent(
                        ticket.TicketType.EventId,
                        peopleCount,
                        logScanType
                    ));
                }

                var successResponse = CheckInResponse.Success(
                    ticket.Order?.Customer?.FullName ?? "Khách",
                    $"Đã check-in {peopleCount} vé. (Đoàn còn lại {ticket.RemainingSlots} chỗ)"
                );
                successResponse.TriggerPrintBadge = triggerPrint;
                _cache.Set(processedKey, successResponse, DuplicateRequestWindow);
                return successResponse;
            }
            catch (DbUpdateConcurrencyException)
            {
                _context.ChangeTracker.Clear();

                var response = CheckInResponse.Fail("Vé này vừa được quét tại một cổng khác cùng lúc. Vui lòng thử lại.");
                try
                {
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    }, skipDomainChanges: true);
                }
                catch
                {
                }

                _cache.Set(processedKey, response, DuplicateRequestWindow);
                return response;
            }
            catch (Exception ex)
            {
                var response = CheckInResponse.Fail("Lỗi hệ thống: " + ex.Message);
                try
                {
                    await PersistCheckInOutcomeAsync(new CheckInOutcome
                    {
                        TicketId = ticketId,
                        EventId = eventId,
                        EventName = eventName,
                        StaffId = staffId,
                        GateName = gateName,
                        QrPayload = qrPayload,
                        PeopleCount = peopleCount,
                        Timestamp = timestamp,
                        IsSuccess = false,
                        FailureReason = response.Message,
                        ScanType = ScanType.Entry,
                        Note = "QR check-in"
                    }, skipDomainChanges: true);
                }
                catch
                {
                }

                _cache.Set(processedKey, response, DuplicateRequestWindow);
                return response;
            }
            finally
            {
                _cache.Remove(lockKey);
            }
        }

        private async Task<CheckInResponse> FailAndLogAsync(string message, Guid ticketId, Guid eventId, string gateName, string staffId, string qrPayload, int peopleCount, DateTime timestamp, string processedKey, Ticket? ticket = null, string eventName = "")
        {
            var response = CheckInResponse.Fail(message);
            try {
                await PersistCheckInOutcomeAsync(new CheckInOutcome {
                    Ticket = ticket, TicketId = ticketId, EventId = eventId, EventName = eventName,
                    StaffId = staffId, GateName = gateName, QrPayload = qrPayload, PeopleCount = peopleCount,
                    Timestamp = timestamp, IsSuccess = false, FailureReason = response.Message, ScanType = ScanType.Entry
                }, skipDomainChanges: true);
            } catch {}
            _cache.Set(processedKey, response, DuplicateRequestWindow);
            return response;
        }

        private async Task PersistCheckInOutcomeAsync(CheckInOutcome outcome, bool skipDomainChanges = false)
        {
            if (!skipDomainChanges && outcome.Ticket != null)
            {
                _context.Tickets.Update(outcome.Ticket);
            }

            var ticketId = outcome.TicketId == Guid.Empty && outcome.Ticket != null ? outcome.Ticket.Id : outcome.TicketId;

            // If ticketId is not known (Guid.Empty), skip adding CheckInLog
            // to avoid unique-index conflicts on (TicketId, CheckinDate) for unknown tickets.
            if (ticketId != Guid.Empty && outcome.Ticket != null)
            {
                await _context.CheckInLogs.AddAsync(new CheckInLog
                {
                    Id = Guid.NewGuid(),
                    TicketId = ticketId,
                    EventId = outcome.EventId,
                    GateId = outcome.GateId,
                    CheckedAt = outcome.Timestamp,
                    CheckinDate = DateOnly.FromDateTime(outcome.Timestamp),
                    Type = outcome.ScanType,
                    PeopleCount = outcome.PeopleCount,
                    GateName = outcome.GateName,
                    StaffId = outcome.StaffId,
                    Note = outcome.Note,
                    CheckInResult = outcome.IsSuccess ? "Success" : "Failed",
                    FailureReason = outcome.FailureReason,
                    QRCodeData = outcome.QrPayload,
                    CreatedAt = outcome.Timestamp,
                    CreatedBy = outcome.StaffId
                });
            }

            await _context.AuditLogs.AddAsync(new AuditLog
            {
                Id = Guid.NewGuid(),
                Action = outcome.IsSuccess ? "CheckIn" : "CheckInFailed",
                EntityType = "Ticket",
                EntityId = ticketId,
                PerformedBy = outcome.StaffId,
                Details = BuildAuditDetails(outcome),
                IpAddress = GetClientIpAddress(),
                Timestamp = outcome.Timestamp,
                CreatedAt = outcome.Timestamp,
                CreatedBy = outcome.StaffId
            });

            try
            {
                await _context.SaveChangesAsync(default);
            }
            catch (DbUpdateException dbEx)
            {
                try
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("DbUpdateException while saving CheckInOutcome:");
                    sb.AppendLine(dbEx.Message);
                    var inner = dbEx.InnerException;
                    while (inner != null)
                    {
                        sb.AppendLine("Inner: " + inner.Message);
                        inner = inner.InnerException;
                    }

                    if (dbEx.Entries != null)
                    {
                        foreach (var entry in dbEx.Entries)
                        {
                            try
                            {
                                var json = System.Text.Json.JsonSerializer.Serialize(entry.Entity);
                                sb.AppendLine($"Entry {entry.Entity.GetType().FullName}: {json}");
                            }
                            catch
                            {
                                sb.AppendLine($"Entry {entry.Entity.GetType().FullName}: <serialization failed>");
                            }
                        }
                    }

                    _logger.LogError(dbEx, sb.ToString());
                }
                catch (Exception logEx)
                {
                    _logger.LogError(dbEx, "DbUpdateException occurred but failed to serialize entries: {Message}", logEx.Message);
                }

                throw;
            }
            catch (Exception ex)
            {
                try
                {
                    var sb = new StringBuilder();
                    sb.AppendLine("Exception while saving CheckInOutcome:");
                    sb.AppendLine(ex.Message);
                    var inner = ex.InnerException;
                    while (inner != null)
                    {
                        sb.AppendLine("Inner: " + inner.Message);
                        inner = inner.InnerException;
                    }

                    _logger.LogError(ex, sb.ToString());
                }
                catch
                {
                    _logger.LogError(ex, "Exception occurred while saving CheckInOutcome and logging failed: {Message}", ex.Message);
                }

                throw;
            }
        }

        private string BuildAuditDetails(CheckInOutcome outcome)
        {
            var ticketValue = outcome.TicketId == Guid.Empty ? "không xác định" : outcome.TicketId.ToString();
            var eventValue = outcome.EventId == Guid.Empty ? (string.IsNullOrWhiteSpace(outcome.EventName) ? "không xác định" : outcome.EventName) : outcome.EventId.ToString();
            var gateValue = string.IsNullOrWhiteSpace(outcome.GateName) ? "không có" : outcome.GateName;
            var resultValue = outcome.IsSuccess ? "thành công" : "thất bại";
            var reasonValue = string.IsNullOrWhiteSpace(outcome.FailureReason) ? string.Empty : $"; Lý do thất bại: {outcome.FailureReason}";

            return $"Nhân viên {outcome.StaffId} quét vé {ticketValue} cho sự kiện {eventValue} tại cổng {gateValue}. Kết quả: {resultValue}{reasonValue}. QR: {outcome.QrPayload}";
        }

        private bool IsRecognizedGate(string gateName)
        {
            return !string.IsNullOrWhiteSpace(gateName) && AllowedGateNames.Contains(gateName);
        }

        private string BuildRequestSignature(string staffId, string qrPayload, int peopleCount, string gateName)
        {
            var raw = $"{staffId}|{peopleCount}|{gateName}|{qrPayload}";
            var hash = SHA256.HashData(Encoding.UTF8.GetBytes(raw));
            return Convert.ToHexString(hash);
        }

        private string? GetClientIpAddress()
        {
            var ipAddress = _httpContextAccessor.HttpContext?.Connection.RemoteIpAddress;
            if (ipAddress == null) return null;

            if (ipAddress.ToString() == "::1")
                return "127.0.0.1";

            if (ipAddress.IsIPv4MappedToIPv6)
                return ipAddress.MapToIPv4().ToString();

            return ipAddress.ToString();
        }

        private sealed class CheckInOutcome
        {
            public Ticket? Ticket { get; set; }
            public Guid TicketId { get; set; }
            public Guid EventId { get; set; }
            public Guid? GateId { get; set; }
            public string StaffId { get; set; } = string.Empty;
            public string GateName { get; set; } = string.Empty;
            public string QrPayload { get; set; } = string.Empty;
            public int PeopleCount { get; set; }
            public DateTime Timestamp { get; set; }
            public bool IsSuccess { get; set; }
            public string? FailureReason { get; set; }
            public ScanType ScanType { get; set; } = ScanType.Entry;
            public string? Note { get; set; }
            public string? EventName { get; set; }
        }
    }
}