// TicketSystem.Application/Utils/Base32Generator.cs
using System;
using System.Linq;

namespace TicketSystem.Application.Utils
{
    public static class Base32Generator
    {
        /// <summary>
        /// Sinh ra một chuỗi SecretKey ngẫu nhiên tuân thủ tuyệt đối chuẩn Base32 (RFC 4648).
        /// Bảng mã không bao gồm các số 0, 1, 8, 9.
        /// </summary>
        public static string Generate(int length = 16)
        {
            const string validChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
            var random = new Random();
            
            return new string(Enumerable.Repeat(validChars, length)
                .Select(s => s[random.Next(s.Length)]).ToArray());
        }
    }
}