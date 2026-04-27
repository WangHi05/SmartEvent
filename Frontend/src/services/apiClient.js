import axios from 'axios';

/**
 * Cấu hình Axios instance cho API calls
 * Khi VITE_API_BASE_URL rỗng, sử dụng cùng origin (proxy sẽ chuyển /api sang backend)
 */
const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor - Thêm token và headers
apiClient.interceptors.request.use(
  (config) => {
    // Lấy token từ localStorage (nếu có authentication)
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Gửi role hiện tại nếu có (hỗ trợ middleware legacy)
    const user = JSON.parse(localStorage.getItem('user') || 'null');
    const userRole = user?.role || user?.Role;
    if (userRole) {
      config.headers['X-User-Role'] = userRole;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor - Xử lý lỗi chung
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Xử lý lỗi 401 - Unauthorized
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }

    // Xử lý lỗi 403 - Forbidden
    if (error.response?.status === 403) {
      console.error('Access denied:', error.response.data.message);
    }

    return Promise.reject(error);
  }
);

export default apiClient;
