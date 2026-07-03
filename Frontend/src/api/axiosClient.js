import axios from 'axios';

const axiosClient = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL 
        ? `${import.meta.env.VITE_API_BASE_URL}/api` 
        : 'http://localhost:5013/api', 
    headers: {
        'Content-Type': 'application/json',
    },
});

// Biến bộ nhớ tạm để găm Token ngay khi đăng nhập thành công
let memoryToken = null;

// Can thiệp vào hàm POST gốc của Axios để hứng lấy Token chớp nhoáng từ API Login
const originalPost = axiosClient.post;
axiosClient.post = async function (url, data, config) {
    try {
        const response = await originalPost.apply(this, arguments);
        
        // Nếu là API đăng nhập và có chứa token trả về, lưu ngay vào biến tạm
        if ((url.includes('login') || url.includes('auth')) && response?.token) {
            memoryToken = response.token;
        }
        return response;
    } catch (error) {
        return Promise.reject(error);
    }
};

// 2. REQUEST INTERCEPTOR: Đính kèm Token vào Header trước khi gửi request đi
axiosClient.interceptors.request.use(
    (config) => {
        // Ưu tiên lấy từ bộ nhớ trình duyệt, nếu chưa kịp ghi xong thì bốc luôn từ memoryToken bọc lót
        const token = localStorage.getItem('token') || sessionStorage.getItem('token') || memoryToken;
        
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// 3. RESPONSE INTERCEPTOR: Xử lý dữ liệu trả về và bắt lỗi 401
axiosClient.interceptors.response.use(
    (response) => {
        // Khi request bất kỳ thành công, reset biến tạm vì lúc này localStorage chắc chắn đã ghi xong
        memoryToken = null;
        
        // Trả về dữ liệu gốc để khớp với các hàm xử lý ở Frontend
        return response.data || response;
    },
    (error) => {
        if (error.response && error.response.status === 401) {
            console.warn("Phiên đăng nhập hết hạn. Vui lòng đăng nhập lại.");
            memoryToken = null;
            
            // Xóa sạch dấu vết phiên cũ
            localStorage.removeItem('token');
            localStorage.removeItem('user_info');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user_info');
            
            // Đá ngược về login
            window.location.href = '/login'; 
        }
        return Promise.reject(error);
    }
);

export default axiosClient;