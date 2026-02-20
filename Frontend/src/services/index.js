/**
 * API Service cho Event operations
 */
import apiClient from './apiClient';

export const eventService = {
  // Lấy danh sách events
  getEvents: (pageNumber = 1, pageSize = 10) => {
    return apiClient.get('/api/events', {
      params: { pageNumber, pageSize },
    });
  },

  // Lấy event theo ID
  getEventById: (id) => {
    return apiClient.get(`/api/events/${id}`);
  },

  // Tạo event mới
  createEvent: (data) => {
    return apiClient.post('/api/events', data);
  },

  // Cập nhật event
  updateEvent: (id, data) => {
    return apiClient.put(`/api/events/${id}`, { id, ...data });
  },

  // Xóa event
  deleteEvent: (id) => {
    return apiClient.delete(`/api/events/${id}`);
  },
};

/**
 * API Service cho Ticket operations
 */
export const ticketService = {
  // Hủy vé
  cancelTicket: (ticketId, reason, refundStrategy) => {
    return apiClient.post('/api/tickets/cancel', {
      ticketId,
      reason,
      refundStrategyType: refundStrategy,
    });
  },

  // Lấy danh sách refund policies
  getRefundPolicies: () => {
    return apiClient.get('/api/tickets/refund-policies');
  },
};

/**
 * API Service cho Settings
 */
export const settingsService = {
  // Lấy settings
  getSettings: () => {
    return apiClient.get('/api/settings');
  },

  // Cập nhật settings
  updateSettings: (data) => {
    return apiClient.put('/api/settings', data);
  },
};

/**
 * API Service cho Audit Logs
 */
export const auditLogService = {
  // Lấy audit logs với filter
  getAuditLogs: (params) => {
    return apiClient.get('/api/auditlogs', { params });
  },
};
