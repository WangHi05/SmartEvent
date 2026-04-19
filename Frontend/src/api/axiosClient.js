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
        // Lấy token từ LocalStorage
        const token = localStorage.getItem('token');
        
        // Nếu có token, đính kèm vào header Authorization
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// 3. RESPONSE INTERCEPTOR: Can thiệp SAU KHI nhận được response từ Backend
axiosClient.interceptors.response.use(
    (response) => {
        // Có thể bóc tách dữ liệu ở đây để Component không phải gọi response.data.data
        return response.data; 
    },
    (error) => {
        // Xử lý lỗi chung toàn cục
        if (error.response && error.response.status === 401) {
            // HTTP 401 Unauthorized: Token đã hết hạn hoặc không hợp lệ
            console.warn("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            
            // Xóa dữ liệu cũ và đá người dùng văng ra trang Login
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_info');
            
            // Chuyển hướng (Tuỳ thuộc bạn dùng react-router-dom)
            window.location.href = '/login'; 
        }

        const message = error.response?.data?.message || 
                             error.response?.data?.title ||
                             'Có lỗi xảy ra từ máy chủ';

        return Promise.reject(error);
    }
);

export default axiosClient;
