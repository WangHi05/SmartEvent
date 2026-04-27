using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using TicketSystem.Application.Interfaces;
using TicketSystem.Domain.Common;
using TicketSystem.Domain.Entities;

namespace TicketSystem.Application.Services
{
    /// <summary>
    /// Service để quản lý cấu hình hệ thống
    /// </summary>
    public class SettingsService : ISettingsService
    {
        private readonly IApplicationDbContext _context;
        private Dictionary<string, string> _cache = new Dictionary<string, string>();
        private bool _cacheLoaded = false;

        public SettingsService(IApplicationDbContext context)
        {
            _context = context;
        }

        public async Task<string?> GetSettingValueAsync(string key)
        {
            if (!_cacheLoaded)
            {
                await LoadCacheAsync();
            }

            if (_cache.TryGetValue(key, out var value))
            {
                return value;
            }

            return null;
        }

        public async Task<int> GetSettingAsIntAsync(string key, int defaultValue = 0)
        {
            var value = await GetSettingValueAsync(key);
            if (value != null && int.TryParse(value, out var intValue))
            {
                return intValue;
            }
            return defaultValue;
        }

        public async Task<decimal> GetSettingAsDecimalAsync(string key, decimal defaultValue = 0)
        {
            var value = await GetSettingValueAsync(key);
            if (value != null && decimal.TryParse(value, out var decimalValue))
            {
                return decimalValue;
            }
            return defaultValue;
        }

        public async Task<bool> GetSettingAsBoolAsync(string key, bool defaultValue = false)
        {
            var value = await GetSettingValueAsync(key);
            if (value != null && (value.Equals("true", StringComparison.OrdinalIgnoreCase) ||
                                   value.Equals("1", StringComparison.OrdinalIgnoreCase)))
            {
                return true;
            }
            if (value != null && (value.Equals("false", StringComparison.OrdinalIgnoreCase) ||
                                   value.Equals("0", StringComparison.OrdinalIgnoreCase)))
            {
                return false;
            }
            return defaultValue;
        }

        public async Task<List<SystemSettings>> GetAllSettingsAsync()
        {
            return await _context.SystemSettings.ToListAsync();
        }

        public async Task<SystemSettings> UpdateSettingAsync(string key, string value)
        {
            var setting = await _context.SystemSettings
                .FirstOrDefaultAsync(s => s.SettingKey == key);

            if (setting == null)
            {
                setting = new SystemSettings
                {
                    Id = Guid.NewGuid(),
                    SettingKey = key,
                    SettingValue = value,
                    CreatedAt = DateTime.UtcNow,
                    CreatedBy = "System"
                };
                _context.SystemSettings.Add(setting);
            }
            else
            {
                setting.SettingValue = value;
                setting.UpdatedAt = DateTime.UtcNow;
                setting.UpdatedBy = "System";
            }

            await _context.SaveChangesAsync();

            // Invalidate cache
            _cacheLoaded = false;
            _cache.Clear();

            return setting;
        }

        public async Task<bool> InitializeDefaultSettingsAsync()
        {
            var existingCount = await _context.SystemSettings.CountAsync();
            if (existingCount > 0)
            {
                return false; // Already initialized
            }

            var defaultSettings = SystemSettings.GetDefaultSettings();
            _context.SystemSettings.AddRange(defaultSettings);
            await _context.SaveChangesAsync();

            // Invalidate cache
            _cacheLoaded = false;
            _cache.Clear();

            return true;
        }

        public async Task<RefundPolicy> GetRefundPolicyAsync()
        {
            var value = await GetSettingAsIntAsync(SystemSettings.REFUND_POLICY, 2);
            return (RefundPolicy)value;
        }

        public async Task<int> GetCancelHoursBeforeEventAsync()
        {
            return await GetSettingAsIntAsync(SystemSettings.CANCEL_HOURS_BEFORE_EVENT, 24);
        }

        public async Task<decimal> GetRefundFeePercentAsync()
        {
            return await GetSettingAsDecimalAsync(SystemSettings.REFUND_FEE_PERCENT, 2.5m);
        }

        public async Task<bool> IsAutoRefundEnabledAsync()
        {
            return await GetSettingAsBoolAsync(SystemSettings.AUTO_REFUND, true);
        }

        public async Task<bool> IsAutoReleaseSeatEnabledAsync()
        {
            return await GetSettingAsBoolAsync(SystemSettings.AUTO_RELEASE_SEAT_WHEN_CANCEL, true);
        }

        public async Task<bool> IsAllowCancelWhenPendingAsync()
        {
            return await GetSettingAsBoolAsync(SystemSettings.ALLOW_CANCEL_WHEN_PENDING, false);
        }

        public async Task<int> GetMaxCancelPerUserPerMonthAsync()
        {
            return await GetSettingAsIntAsync(SystemSettings.MAX_CANCEL_PER_USER_PER_MONTH, 5);
        }

        private async Task LoadCacheAsync()
        {
            _cache = (await _context.SystemSettings.ToListAsync())
                .ToDictionary(s => s.SettingKey, s => s.SettingValue);
            _cacheLoaded = true;
        }
    }
}
