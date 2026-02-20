using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Interfaces;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller quản lý Audit Logs - Lịch sử thao tác
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class AuditLogsController : ControllerBase
    {
        private readonly IGenericRepository<AuditLog> _auditLogRepository;
        private readonly ILogger<AuditLogsController> _logger;

        public AuditLogsController(
            IGenericRepository<AuditLog> auditLogRepository,
            ILogger<AuditLogsController> logger)
        {
            _auditLogRepository = auditLogRepository;
            _logger = logger;
        }

        /// <summary>
        /// Lấy danh sách Audit Logs với filter và phân trang
        /// </summary>
        [HttpGet]
        public async Task<ActionResult> GetAuditLogs([FromQuery] AuditLogQueryDto query)
        {
            try
            {
                var logs = await _auditLogRepository.GetAllAsync();

                // Apply filters
                if (query.FromDate.HasValue)
                    logs = logs.Where(l => l.Timestamp >= query.FromDate.Value);

                if (query.ToDate.HasValue)
                    logs = logs.Where(l => l.Timestamp <= query.ToDate.Value);

                if (!string.IsNullOrEmpty(query.Action))
                    logs = logs.Where(l => l.Action == query.Action);

                if (!string.IsNullOrEmpty(query.EntityType))
                    logs = logs.Where(l => l.EntityType == query.EntityType);

                if (!string.IsNullOrEmpty(query.PerformedBy))
                    logs = logs.Where(l => l.PerformedBy.Contains(query.PerformedBy));

                // Phân trang
                var totalCount = logs.Count();
                var pagedLogs = logs
                    .OrderByDescending(l => l.Timestamp)
                    .Skip((query.PageNumber - 1) * query.PageSize)
                    .Take(query.PageSize)
                    .Select(l => new AuditLogDto
                    {
                        Id = l.Id,
                        Timestamp = l.Timestamp,
                        Action = l.Action,
                        EntityType = l.EntityType,
                        EntityId = l.EntityId,
                        PerformedBy = l.PerformedBy,
                        Details = l.Details,
                        IpAddress = l.IpAddress
                    })
                    .ToList();

                return Ok(new
                {
                    items = pagedLogs,
                    totalCount,
                    pageNumber = query.PageNumber,
                    pageSize = query.PageSize,
                    totalPages = (int)Math.Ceiling((double)totalCount / query.PageSize)
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting audit logs");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy lịch sử thao tác" });
            }
        }
    }
}
