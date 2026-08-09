using System;
using System.ComponentModel.DataAnnotations;

namespace TicketSystem.Application.DTOs
{
    public class TicketTypeDto
    {
        public Guid Id { get; set; }
        public Guid EventId { get; set; }
        public int TicketMode { get; set; } // 1=INDIVIDUAL, 2=GROUP
        public string Name { get; set; }
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int RemainingQuantity { get; set; }
        public int MaxPerUser { get; set; }
        public int? UsageType { get; set; } // nullable, chỉ cho INDIVIDUAL
        public int AccessType { get; set; } // 1=ONE_TIME, 2=DAILY_MULTI
        public int? MinGroupSize { get; set; } // nullable, chỉ cho GROUP
        public int? MaxGroupSize { get; set; } // nullable, chỉ cho GROUP
        public int? QRMode { get; set; } // nullable, chỉ cho GROUP
        public int? PriceMode { get; set; } // nullable, chỉ cho GROUP
        public DateTime SaleStartTime { get; set; }
        public DateTime SaleEndTime { get; set; }
        public bool IsCurrentlyOnSale { get; set; }
        public string SaleStatusName { get; set; } = string.Empty;
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; }
        public DateTime CreatedAt { get; set; }
        public string CreatedBy { get; set; }
        public DateTime? UpdatedAt { get; set; }
        public string? UpdatedBy { get; set; }
    }

    public class CreateTicketTypeDto
    {
        [Required(ErrorMessage = "Vui lòng chọn loại vé")]
        [Range(1, 2, ErrorMessage = "Loại vé không hợp lệ")]
        public int TicketMode { get; set; } // 1=INDIVIDUAL, 2=GROUP

        [Required(ErrorMessage = "Tên loại vé là bắt buộc")]
        [StringLength(200, ErrorMessage = "Tên loại vé không được vượt quá 200 ký tự")]
        public string Name { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Giá vé không được là số âm")]
        public decimal Price { get; set; }

        [Range(1, 100000, ErrorMessage = "Số lượng phải từ 1 đến 100,000")]
        public int Quantity { get; set; }

        [Range(1, 1000, ErrorMessage = "Tối đa/người phải từ 1 đến 1,000")]
        public int MaxPerUser { get; set; }

        // Chỉ dùng cho VÉ CÁ NHÂN
        [Range(1, 2)]
        public int? UsageType { get; set; } // 1=ONE_TIME, 2=MULTI_DAY

        // Chỉ dùng cho VÉ ĐOÀN
        [Range(2, 10000)]
        public int? MinGroupSize { get; set; }

        [Range(2, 10000)]
        public int? MaxGroupSize { get; set; }

        [Range(1, 2)]
        public int? QRMode { get; set; } // 1=SINGLE_QR, 2=SUB_QR

        [Range(1, 2)]
        public int? PriceMode { get; set; } // 1=PER_TICKET, 2=PER_GROUP

        public DateTime SaleStartTime { get; set; }
        public DateTime SaleEndTime { get; set; }

        [Range(0, 1000, ErrorMessage = "Thứ tự hiển thị phải từ 0 đến 1,000")]
        public int DisplayOrder { get; set; }

        public bool IsActive { get; set; } = true;
    }

    public class UpdateTicketTypeDto
    {
        public int TicketMode { get; set; }

        [StringLength(200, ErrorMessage = "Tên loại vé không được vượt quá 200 ký tự")]
        public string Name { get; set; }

        [Range(0, double.MaxValue, ErrorMessage = "Giá vé không được là số âm")]
        public decimal Price { get; set; }

        [Range(1, 100000, ErrorMessage = "Số lượng phải từ 1 đến 100,000")]
        public int Quantity { get; set; }

        [Range(1, 1000, ErrorMessage = "Tối đa/người phải từ 1 đến 1,000")]
        public int MaxPerUser { get; set; }

        [Range(1, 2)]
        public int? UsageType { get; set; }

        [Range(2, 10000)]
        public int? MinGroupSize { get; set; }

        [Range(2, 10000)]
        public int? MaxGroupSize { get; set; }

        [Range(1, 2)]
        public int? QRMode { get; set; }

        [Range(1, 2)]
        public int? PriceMode { get; set; }

        public DateTime SaleStartTime { get; set; }
        public DateTime SaleEndTime { get; set; }

        [Range(0, 1000, ErrorMessage = "Thứ tự hiển thị phải từ 0 đến 1,000")]
        public int DisplayOrder { get; set; }

        public bool IsActive { get; set; }
    }
}
