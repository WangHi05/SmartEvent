using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;
using TicketSystem.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using TicketSystem.Domain.Entities;
using System.Text.RegularExpressions;
using System.Text;

namespace TicketSystem.API.Controllers
{
    /// Controller quản lý Events - CRUD operations
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly IEventService _eventService;
        private readonly ILogger<EventsController> _logger;
        private readonly IApplicationDbContext _context;
        
        public EventsController(IEventService eventService, ILogger<EventsController> logger, IApplicationDbContext context)
        {
            _eventService = eventService;
            _logger = logger;
            _context=context;
        }

        /// Lấy danh sách Events với phân trang
        [HttpGet]
        public async Task<ActionResult<EventListDto>> GetEvents([FromQuery] int pageNumber = 1, [FromQuery] int pageSize = 10)
        {
            try
            {
                var result = await _eventService.GetEventsAsync(pageNumber, pageSize);
                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting events list");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi lấy danh sách sự kiện" });
            }
        }

        /// <summary>
        /// Lấy danh sách rút gọn (Id, Name) toàn bộ sự kiện — dùng cho dropdown lọc
        /// </summary>
        [HttpGet("dropdown")]
        public async Task<IActionResult> GetEventsDropdown()
        {
            var events = await _context.Events
                .OrderByDescending(e => e.StartTime)
                .Select(e => new { id = e.Id, name = e.Name })
                .ToListAsync();

            return Ok(events);
        }

        /// Lấy thông tin Event theo ID
        [HttpGet("{id}")]
        public async Task<ActionResult<EventResponseDto>> GetEventById(Guid id)
        {
            try
            {
                var result = await _eventService.GetEventByIdAsync(id);
                if (result == null)
                    return NotFound(new { message = "Không tìm thấy sự kiện" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error getting event {EventId}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra" });
            }
        }

        /// Tạo mới Event
        [HttpPost]
        [Authorize(Roles = "Admin,Manager")] 
        public async Task<ActionResult<EventResponseDto>> CreateEvent([FromBody] CreateEventDto dto)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                // Lấy username từ Claims (giả sử đã có authentication)
                var createdBy = User.Identity?.Name ?? "System";

                var result = await _eventService.CreateEventAsync(dto, createdBy);
                return CreatedAtAction(nameof(GetEventById), new { id = result.Id }, result);
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error creating event");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi tạo sự kiện" });
            }
        }

        /// Cập nhật Event
        [HttpPut("{id}")]
        [Authorize(Roles = "Admin,Manager")]
        public async Task<ActionResult<EventResponseDto>> UpdateEvent(Guid id, [FromBody] UpdateEventDto dto)
        {
            try
            {
                if (id != dto.Id)
                    return BadRequest(new { message = "ID không khớp" });

                if (!ModelState.IsValid)
                    return BadRequest(ModelState);

                var updatedBy = User.Identity?.Name ?? "System";
                var result = await _eventService.UpdateEventAsync(dto, updatedBy);

                if (result == null)
                    return NotFound(new { message = "Không tìm thấy sự kiện" });

                return Ok(result);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error updating event {EventId}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi cập nhật sự kiện" });
            }
        }

        
        /// Xóa Event
        [HttpDelete("{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<ActionResult> DeleteEvent(Guid id)
        {
            try
            {
                var deletedBy = User.Identity?.Name ?? "System";
                var result = await _eventService.DeleteEventAsync(id, deletedBy);

                if (!result)
                    return NotFound(new { message = "Không tìm thấy sự kiện" });

                return NoContent();
            }
            catch (InvalidOperationException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error deleting event {EventId}", id);
                return StatusCode(500, new { message = "Có lỗi xảy ra khi xóa sự kiện" });
            }
        }

         /// <summary>
        /// API Tìm kiếm và phân trang Sự kiện
        /// </summary>
        /// <remarks>Dùng [FromQuery] để nhận tham số từ chuỗi URL (vd: ?keyword=concert, pageNumber=1)</remarks>
        [HttpGet("search")]
        public async Task<IActionResult> SearchEvents([FromQuery] EventSearchRequest request)
        {
            // Validate dữ liệu đầu vào cơ bản
            if (request.PageNumber < 1) request.PageNumber = 1;
            if (request.PageSize < 1 || request.PageSize > 100) request.PageSize = 10;

            var result = await _eventService.SearchEventsAsync(request);
            
            return Ok(result);
        }

        /// <summary>
        /// API dùng một lần (One-time Script): Cập nhật Slug cho các sự kiện cũ
        /// </summary>
        [HttpPost("sync-legacy-slugs")]
        public async Task<IActionResult> SyncLegacySlugs()
        {
            // Lấy tất cả sự kiện có Slug bị null hoặc rỗng
            var eventsWithoutSlugs = await _context.Events
                .Where(e => string.IsNullOrEmpty(e.Slug))
                .ToListAsync();

            if (!eventsWithoutSlugs.Any())
            {
                return Ok(new { Message = "Tất cả sự kiện đều đã có Slug. Không cần đồng bộ." });
            }

            int count = 0;
            foreach (var ev in eventsWithoutSlugs)
            {
                ev.Slug = GenerateSlug(ev.Name);
                count++;
            }

            // Lưu toàn bộ thay đổi xuống DB
            await _context.SaveChangesAsync();

            return Ok(new { Message = $"Đã đồng bộ thành công Slug cho {count} sự kiện cũ!" });
        }

        // Hàm helper giống hệt trong EventService
        private string GenerateSlug(string title)
        {
            if (string.IsNullOrWhiteSpace(title)) return string.Empty;
            Regex regex = new Regex("\\p{IsCombiningDiacriticalMarks}+");
            string temp = title.Normalize(NormalizationForm.FormD);
            string slug = regex.Replace(temp, String.Empty).Replace('\u0111', 'd').Replace('\u0110', 'D');
            slug = slug.ToLowerInvariant();
            slug = Regex.Replace(slug, "[^a-z0-9\\s-]", ""); 
            slug = Regex.Replace(slug, "\\s+", "-").Trim('-'); 
            return slug;
        }
    }
}
