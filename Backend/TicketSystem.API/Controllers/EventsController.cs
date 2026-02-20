using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Services;

namespace TicketSystem.API.Controllers
{
    /// <summary>
    /// Controller quản lý Events - CRUD operations
    /// </summary>
    [ApiController]
    [Route("api/[controller]")]
    public class EventsController : ControllerBase
    {
        private readonly EventService _eventService;
        private readonly ILogger<EventsController> _logger;

        public EventsController(EventService eventService, ILogger<EventsController> logger)
        {
            _eventService = eventService;
            _logger = logger;
        }

        /// <summary>
        /// Lấy danh sách Events với phân trang
        /// </summary>
        /// <param name="pageNumber">Số trang (mặc định: 1)</param>
        /// <param name="pageSize">Số item mỗi trang (mặc định: 10)</param>
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
        /// Lấy thông tin Event theo ID
        /// </summary>
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

        /// <summary>
        /// Tạo mới Event
        /// </summary>
        [HttpPost]
        // [Authorize(Roles = "Admin,Manager")] // Uncomment khi đã có authentication
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

        /// <summary>
        /// Cập nhật Event
        /// </summary>
        [HttpPut("{id}")]
        // [Authorize(Roles = "Admin,Manager")]
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

        /// <summary>
        /// Xóa Event
        /// </summary>
        [HttpDelete("{id}")]
        // [Authorize(Roles = "Admin")]
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
    }
}
