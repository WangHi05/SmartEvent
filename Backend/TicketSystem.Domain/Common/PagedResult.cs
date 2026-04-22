using System;
using System.Collections.Generic;

namespace TicketSystem.Domain.Common
{
    /// <summary>
    /// Lớp bọc dữ liệu trả về cho các API có phân trang (Pagination)
    /// </summary>
    /// <typeparam name="T">Kiểu dữ liệu của danh sách trả về (DTO)</typeparam>
    public class PagedResult<T>
    {
        public List<T> Items { get; set; } = new List<T>();
        
        /// <summary>
        /// Tổng số lượng bản ghi có trong Database
        /// </summary>
        public int TotalCount { get; set; }
        
        public int PageNumber { get; set; }
        public int PageSize { get; set; }
        
        /// <summary>
        /// Tổng số trang tính toán được
        /// </summary>
        public int TotalPages => PageSize > 0 ? (int)Math.Ceiling((double)TotalCount / PageSize) : 0;
    }
}