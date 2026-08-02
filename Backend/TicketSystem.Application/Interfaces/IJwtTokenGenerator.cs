using System;
using System.Collections.Generic;

namespace TicketSystem.Application.Interfaces
{
    /// <summary>
    /// Sinh JWT không phụ thuộc vào entity cụ thể (Employee/Customer đều dùng chung được).
    /// </summary>
    public interface IJwtTokenGenerator
    {
        string GenerateToken(Guid userId, string username, string email, string fullName, string role);
    }
}