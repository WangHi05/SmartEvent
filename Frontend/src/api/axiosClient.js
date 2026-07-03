import axios from 'axios';

const getApiBaseUrl = () => {
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';

    if (!configuredBaseUrl) {
        return 'http://localhost:5013/api';
    }

    const trimmedUrl = configuredBaseUrl.trim().replace(/\/+$/, '');
    return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`;
};

const axiosClient = axios.create({
    baseURL: getApiBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
});

// REQUEST INTERCEPTOR - Phiên bản mạnh hơn
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') ||
                     sessionStorage.getItem('token') ||
                     window.memoryToken || '';

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
            console.log(`✅ Gửi token cho: ${config.url}`);
        } else {
            console.warn("❌ Không tìm thấy token cho request:", config.url);
        }
        
        return config;
    },
    (error) => Promise.reject(error)
);

// RESPONSE INTERCEPTOR
axiosClient.interceptors.response.use(
    (response) => {
        return response.data;   // Quan trọng
    },
    (error) => {
        const isAuthEndpoint = ['/users/authenticate', '/users/register', '/users/forgot-password', '/users/reset-password', '/users/external-login']
            .some((path) => error.config?.url?.includes(path));

        if (error.response?.status === 401 && !isAuthEndpoint) {
            console.warn('Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại nếu cần.');

            localStorage.removeItem('token');
            localStorage.removeItem('user_info');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user_info');
            window.memoryToken = null;
        }
        return Promise.reject(error);
    }
);

export default axiosClient;