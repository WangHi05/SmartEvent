using Microsoft.AspNetCore.Mvc;
using TicketSystem.Application.DTOs;
using TicketSystem.Application.Interfaces;

namespace TicketSystem.API.Controllers
{
    // Controller quản lý TicketType (loại vé)
    // GET    /api/events/{eventId}/ticket-types      → Lấy danh sách
    // GET    /api/events/{eventId}/ticket-types/paged → Lấy với phân trang
    // GET    /api/ticket-types/{id}                  → Lấy chi tiết
    // POST   /api/events/{eventId}/ticket-types      → Tạo mới
    // PUT    /api/ticket-types/{id}                  → Cập nhật
    // DELETE /api/ticket-types/{id}                  → Xóa
    [ApiController]
    [Route("api")]
    public class TicketTypesController : ControllerBase
    {
        private readonly ITicketTypeService _ticketTypeService;
        private readonly ILogger<TicketTypesController> _logger;

        public TicketTypesController(ITicketTypeService ticketTypeService, ILogger<TicketTypesController> logger)
        {
            _ticketTypeService = ticketTypeService;
            _logger = logger;
        }

        // Lấy danh sách loại vé của một sự kiện
        [HttpGet("events/{eventId}/ticket-types")]
        public async Task<ActionResult<IEnumerable<TicketTypeDto>>> GetTicketTypesByEvent(Guid eventId)
        {
            try
            {
                var result = await _ticketTypeService.GetTicketTypesByEventAsync(eventId);
                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách loại vé cho sự kiện {EventId}", eventId);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Có lỗi xảy ra khi lấy danh sách loại vé"
                });
            }
        }

        // Lấy danh sách loại vé với phân trang
        [HttpGet("events/{eventId}/ticket-types/paged")]
        public async Task<ActionResult<object>> GetPagedTicketTypesByEvent(
            Guid eventId, 
            [FromQuery] int pageNumber = 1, 
            [FromQuery] int pageSize = 10)
        {
            try
            {
                var (ticketTypes, totalCount) = await _ticketTypeService.GetPagedTicketTypesByEventAsync(
                    eventId, pageNumber, pageSize);

                return Ok(new
                {
                    success = true,
                    data = new
                    {
                        items = ticketTypes,
                        totalCount = totalCount,
                        pageNumber = pageNumber,
                        pageSize = pageSize,
                        totalPages = (int)Math.Ceiling((double)totalCount / pageSize)
                    }
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy danh sách phân trang loại vé");
                return StatusCode(500, new
                {
                    success = false,
                    error = "Có lỗi xảy ra"
                });
            }
        }

        // Lấy chi tiết một loại vé
        [HttpGet("ticket-types/{id}")]
        public async Task<ActionResult<TicketTypeDto>> GetTicketTypeById(Guid id)
        {
            try
            {
                var result = await _ticketTypeService.GetTicketTypeByIdAsync(id);
                if (result == null)
                    return NotFound(new
                    {
                        success = false,
                        error = "Không tìm thấy loại vé"
                    });

                return Ok(new
                {
                    success = true,
                    data = result
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi lấy chi tiết loại vé {TicketTypeId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Có lỗi xảy ra"
                });
            }
        }

        // Tạo mới loại vé
        [HttpPost("events/{eventId}/ticket-types")]
        public async Task<ActionResult<TicketTypeDto>> CreateTicketType(Guid eventId, [FromBody] CreateTicketTypeDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new
                    {
                        success = false,
                        error = "Dữ liệu không hợp lệ",
                        validationErrors = ModelState.Values.SelectMany(v => v.Errors)
                    });

                // Lấy username từ Claims (giả sử đã có authentication)
                var createdBy = User.Identity?.Name ?? "System";

                var result = await _ticketTypeService.CreateTicketTypeAsync(eventId, request, createdBy);
                
                return CreatedAtAction(nameof(GetTicketTypeById), new { id = result.Id }, new
                {
                    success = true,
                    data = result,
                    message = "Tạo loại vé thành công"
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Validation failed khi tạo loại vé: {Message}", ex.Message);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi tạo loại vé cho sự kiện {EventId}", eventId);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Có lỗi xảy ra khi tạo loại vé"
                });
            }
        }

        // Cập nhật thông tin loại vé
        [HttpPut("ticket-types/{id}")]
        public async Task<ActionResult<TicketTypeDto>> UpdateTicketType(Guid id, [FromBody] UpdateTicketTypeDto request)
        {
            try
            {
                if (!ModelState.IsValid)
                    return BadRequest(new
                    {
                        success = false,
                        error = "Dữ liệu không hợp lệ",
                        validationErrors = ModelState.Values.SelectMany(v => v.Errors)
                    });

                // Lấy username từ Claims
                var updatedBy = User.Identity?.Name ?? "System";

                var result = await _ticketTypeService.UpdateTicketTypeAsync(id, request, updatedBy);
                
                return Ok(new
                {
                    success = true,
                    data = result,
                    message = "Cập nhật loại vé thành công"
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Validation failed khi cập nhật loại vé: {Message}", ex.Message);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi cập nhật loại vé {TicketTypeId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Có lỗi xảy ra khi cập nhật loại vé"
                });
            }
        }

        // Xóa loại vé
        [HttpDelete("ticket-types/{id}")]
        public async Task<ActionResult<object>> DeleteTicketType(Guid id)
        {
            try
            {
                // Lấy username từ Claims
                var deletedBy = User.Identity?.Name ?? "System";

                var result = await _ticketTypeService.DeleteTicketTypeAsync(id, deletedBy);
                
                if (!result)
                    return NotFound(new
                    {
                        success = false,
                        error = "Không tìm thấy loại vé"
                    });

                return Ok(new
                {
                    success = true,
                    message = "Xóa loại vé thành công"
                });
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning(ex, "Không thể xóa loại vé: {Message}", ex.Message);
                return BadRequest(new
                {
                    success = false,
                    error = ex.Message
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Lỗi khi xóa loại vé {TicketTypeId}", id);
                return StatusCode(500, new
                {
                    success = false,
                    error = "Có lỗi xảy ra khi xóa loại vé"
                });
            }
        }
    }
}
