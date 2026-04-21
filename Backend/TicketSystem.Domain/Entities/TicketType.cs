using System;
using System.Collections.Generic;
using TicketSystem.Domain.Common;

namespace TicketSystem.Domain.Entities
{
    public enum TicketAccessType
    {
        ONE_TIME = 1,
        DAILY_MULTI = 2
    }

    // Supports 2 ticket types: INDIVIDUAL and GROUP
    public class TicketType : BaseEntity
    {
        public Guid EventId { get; set; }
        public virtual Event? Event { get; set; }

        public TicketMode TicketMode { get; set; } = TicketMode.INDIVIDUAL;
        public string Name { get; set; } = string.Empty;
        public decimal Price { get; set; }
        public int Quantity { get; set; }
        public int RemainingQuantity { get; set; }
        public int MaxPerUser { get; set; }
        public UsageType? UsageType { get; set; }
        public int? MinGroupSize { get; set; }
        public int? MaxGroupSize { get; set; }
        public QRMode? QRMode { get; set; }
        public PriceMode? PriceMode { get; set; }
        public DateTime SaleStartTime { get; set; }
        public DateTime SaleEndTime { get; set; }
        public int DisplayOrder { get; set; }
        public bool IsActive { get; set; } = true;

        public TicketAccessType AccessType { get; set; } = TicketAccessType.ONE_TIME;

        public int MaxCapacity
        {
            get => Quantity;
            set => Quantity = value;
        }

        public int RemainingCapacity
        {
            get => RemainingQuantity;
            set => RemainingQuantity = value;
        }

        public int MaxPerPerson
        {
            get => MaxPerUser;
            set => MaxPerUser = value;
        }

        public virtual ICollection<Ticket> Tickets { get; set; } = new List<Ticket>();

        // Validate data consistency
        public bool IsValid(string? eventMaxCapacity = null)
        {
            // Common validations
            if (Quantity <= 0) return false;
            if (MaxPerUser <= 0) return false;
            if (SaleEndTime <= SaleStartTime) return false;

            // Individual tickets
            if (TicketMode == TicketMode.INDIVIDUAL)
            {
                if (UsageType == null) return false;
                if (MinGroupSize != null || MaxGroupSize != null) return false;
                if (QRMode != null || PriceMode != null) return false;
            }

            // Group tickets
            if (TicketMode == TicketMode.GROUP)
            {
                if (UsageType != null) return false;
                if (MinGroupSize == null || MaxGroupSize == null) return false;
                if (MinGroupSize < 2) return false;
                if (MaxGroupSize < MinGroupSize) return false;
                if (QRMode == null || PriceMode == null) return false;
            }

            return true;
        }

        // Reserve capacity when ticket is purchased
        public void ReserveCapacity(int count)
        {
            if (count <= 0)
                throw new InvalidOperationException("Số lượng phải lớn hơn 0");

            if (RemainingQuantity < count)
                throw new InvalidOperationException(
                    $"Không đủ sức chứa. Còn lại: {RemainingQuantity}, yêu cầu: {count}");

            RemainingQuantity -= count;
        }

        // Release capacity when ticket is cancelled
        public void ReleaseCapacity(int count)
        {
            if (count <= 0)
                throw new InvalidOperationException("Số lượng phải lớn hơn 0");

            RemainingQuantity += count;

            if (RemainingQuantity > Quantity)
                RemainingQuantity = Quantity;
        }
    }
}
