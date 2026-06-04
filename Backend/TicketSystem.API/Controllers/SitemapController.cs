using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Text;
using System.Xml;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Entities;
using TicketSystem.Domain.Common;

namespace TicketSystem.API.Controllers
{
    [ApiController]
    [Route("[controller]")]
    public class SitemapController : ControllerBase
    {
        private readonly IApplicationDbContext _context;

        // Tiêm DbContext thông qua Dependency Injection
        public SitemapController(IApplicationDbContext context)
        {
            _context = context;
        }

        [HttpGet("/sitemap.xml")]
        public async Task<IActionResult> GetSitemap()
        {
            // Thay bằng domain frontend thực tế khi deploy
            var baseUrl = "https://your-frontend-domain.com"; 
            var sb = new StringBuilder();
            
            using var xmlWriter = XmlWriter.Create(new StringWriter(sb), new XmlWriterSettings { Indent = true });
            xmlWriter.WriteStartDocument();
            xmlWriter.WriteStartElement("urlset", "http://www.sitemaps.org/schemas/sitemap/0.9");

            // Trang chủ
            AddUrl(xmlWriter, $"{baseUrl}/", "1.0", "daily");
            
            // Tối ưu: Chỉ lấy các trường cần thiết (Id, Slug, UpdatedAt) của các sự kiện chưa kết thúc
            var seoEvents = await _context.Events
                .AsNoTracking()
                .Where(e => e.Status == EventStatus.Active || e.Status == EventStatus.Ongoing)
                .Select(e => new { e.Id, e.Slug, e.UpdatedAt })
                .ToListAsync();

            foreach (var ev in seoEvents)
            {
                // URL có cấu trúc: /event/dem-nhac-rap-viet-12345
                var eventUrl = $"{baseUrl}/event/{ev.Slug}/{ev.Id}";
                AddUrl(xmlWriter, eventUrl, "0.9", "weekly", ev.UpdatedAt);
            }

            xmlWriter.WriteEndElement();
            xmlWriter.WriteEndDocument();
            xmlWriter.Flush();

            return Content(sb.ToString(), "application/xml", Encoding.UTF8);
        }

        private void AddUrl(XmlWriter xmlWriter, string url, string priority, string changeFreq, DateTime? lastMod = null)
        {
            xmlWriter.WriteStartElement("url");
            xmlWriter.WriteElementString("loc", url);
            xmlWriter.WriteElementString("lastmod", (lastMod ?? DateTime.UtcNow).ToString("yyyy-MM-dd"));
            xmlWriter.WriteElementString("changefreq", changeFreq);
            xmlWriter.WriteElementString("priority", priority);
            xmlWriter.WriteEndElement();
        }
    }
}