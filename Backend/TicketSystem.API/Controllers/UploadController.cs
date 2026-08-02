using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using TicketSystem.API.Services;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class UploadController : ControllerBase
    {
        private readonly UploadService _uploadService;
        private readonly ILogger<UploadController> _logger;

        public UploadController(UploadService uploadService, ILogger<UploadController> logger)
        {
            _uploadService = uploadService;
            _logger = logger;
        }

        /// Upload ảnh (dùng chung cho Event, Avatar, v.v.)
        [HttpPost("image")]
        [Authorize]
        public async Task<IActionResult> UploadImage(IFormFile file)
        {
            try
            {
                var url = await _uploadService.UploadImageAsync(file);
                return Ok(new { url });
            }
            catch (ArgumentException ex)
            {
                return BadRequest(new { message = ex.Message });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error uploading image");
                return StatusCode(500, new { message = "Có lỗi xảy ra khi upload ảnh" });
            }
        }
    }
}