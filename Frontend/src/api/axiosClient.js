import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL 
        ? `${import.meta.env.VITE_API_BASE_URL}/api` 
        : 'http://localhost:5013/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// REQUEST INTERCEPTOR - Cải tiến
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || 
                     sessionStorage.getItem('token') || 
                     window.memoryToken;

        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        } else {
            console.warn("Không tìm thấy token cho request:", config.url);
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
        if (error.response?.status === 401) {
            console.warn("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            
            localStorage.removeItem('token');
            localStorage.removeItem('user_info');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user_info');
            window.memoryToken = null;
            
            window.location.href = '/login';
        }
        return Promise.reject(error);
    }
);

export default axiosClient;