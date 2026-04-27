import axios from 'axios';

// 1. Khởi tạo một instance với các cấu hình mặc định
const axiosClient = axios.create({
    baseURL: 'http://localhost:5013/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// 2. REQUEST INTERCEPTOR: Can thiệp TRƯỚC KHI request được gửi đi
axiosClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token') || sessionStorage.getItem('token');
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. RESPONSE INTERCEPTOR: Can thiệp SAU KHI nhận được response
axiosClient.interceptors.response.use(
    (response) => response.data,
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            localStorage.removeItem('token');
            localStorage.removeItem('user_info');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user_info');
            
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default axiosClient;
