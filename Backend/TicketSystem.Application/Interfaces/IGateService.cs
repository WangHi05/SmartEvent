using System.Collections.Generic;
using System.Threading.Tasks;
using TicketSystem.Application.DTOs;

namespace TicketSystem.Application.Interfaces;

public interface IGateService
{
    Task<List<GateTrafficDto>> GetGateTrafficStatusAsync();
}