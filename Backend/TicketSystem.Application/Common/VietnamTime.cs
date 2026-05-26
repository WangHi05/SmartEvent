using System;

namespace TicketSystem.Application.Common
{
    public static class VietnamTime
    {
        private static readonly Lazy<TimeZoneInfo> TimeZone = new(GetTimeZone);

        public static DateTime Now => TimeZoneInfo.ConvertTimeFromUtc(DateTime.UtcNow, TimeZone.Value);

        public static DateTime UtcNow => DateTime.UtcNow;

        public static DateOnly Today => DateOnly.FromDateTime(Now);

        public static DateTime ToVietnamTime(DateTime dateTime)
        {
            return dateTime.Kind switch
            {
                DateTimeKind.Utc => TimeZoneInfo.ConvertTimeFromUtc(dateTime, TimeZone.Value),
                DateTimeKind.Local => TimeZoneInfo.ConvertTime(dateTime, TimeZone.Value),
                _ => dateTime
            };
        }

        public static DateTime ToVietnamTime(DateTime? dateTime)
        {
            return dateTime.HasValue ? ToVietnamTime(dateTime.Value) : default;
        }

        public static DateTime FromVietnamDateTime(DateTime dateTime)
        {
            return DateTime.SpecifyKind(dateTime, DateTimeKind.Unspecified);
        }

        public static TimeZoneInfo GetTimeZoneInfo() => TimeZone.Value;

        private static TimeZoneInfo GetTimeZone()
        {
            foreach (var timeZoneId in new[] { "SE Asia Standard Time", "Asia/Ho_Chi_Minh" })
            {
                try
                {
                    return TimeZoneInfo.FindSystemTimeZoneById(timeZoneId);
                }
                catch (TimeZoneNotFoundException)
                {
                }
                catch (InvalidTimeZoneException)
                {
                }
            }

            return TimeZoneInfo.Utc;
        }
    }
}