using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Interfaces;
using TicketSystem.Application.DTOs;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services;

public class GateService : IGateService
{
    private readonly IApplicationDbContext _context;

    public GateService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<GateTrafficDto>> GetGateTrafficStatusAsync()
    {
        // 1. Xác định mốc thời gian: Lấy thống kê của ngày hôm nay (theo giờ VN)
        var vietnamZone = TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        var today = DateOnly.FromDateTime(TimeZoneInfo.ConvertTime(DateTime.UtcNow, vietnamZone));

        // 2. Query bảng CheckInLogs để Group by theo cổng và đếm tổng số người đã qua cổng
        var trafficData = await _context.CheckInLogs
            .Where(log => log.CheckinDate == today && log.CheckInResult == "Success" && log.Type == ScanType.Entry)
            .GroupBy(log => log.GateName)
            .Select(g => new 
            {
                GateName = g.Key,
                TotalPeople = g.Sum(log => log.PeopleCount)
            })
            .ToListAsync();

        // 3. Khởi tạo danh sách các cổng mặc định kèm theo Sức chứa (Capacity) dự kiến
        var gates = new List<GateTrafficDto>
        {
            new GateTrafficDto { Id = 1, Name = "Cổng chính - Lối vào 1", Capacity = 5000 },
            new GateTrafficDto { Id = 2, Name = "Cổng phụ - Lối vào 2", Capacity = 2000 },
            new GateTrafficDto { Id = 3, Name = "Cổng VIP", Capacity = 500 }
        };

        // 4. Map dữ liệu quét thực tế từ Database vào danh sách cổng
        foreach (var gate in gates)
        {
            var actualTraffic = trafficData.FirstOrDefault(t => t.GateName == gate.Name)?.TotalPeople ?? 0;
            gate.CurrentTraffic = actualTraffic;

            // Đánh giá trạng thái tự động dựa trên số liệu
            double percent = gate.Capacity > 0 ? ((double)actualTraffic / gate.Capacity * 100) : 0;
            if (percent >= 80) gate.Status = "Quá tải";
            else if (percent >= 50) gate.Status = "Đông đúc";
            else gate.Status = "Bình thường";
        }

        var defaultGateNames = gates.Select(g => g.Name).ToList();
        var unknownGates = trafficData.Where(t => !defaultGateNames.Contains(t.GateName) && !string.IsNullOrWhiteSpace(t.GateName)).ToList();
        
        int nextId = 4;
        foreach (var unknownGate in unknownGates)
        {
            gates.Add(new GateTrafficDto
            {
                Id = nextId++,
                Name = unknownGate.GateName,
                Capacity = 1000,
                CurrentTraffic = unknownGate.TotalPeople,
                Status = "Cần theo dõi"
            });
        }

        return gates;
    }
}