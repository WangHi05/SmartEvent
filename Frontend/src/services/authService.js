import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/useAuthStore';

export const authService = {
    login: async (username, password) => {
        const response = await axiosClient.post('/users/authenticate', { username, password });
        
        // In ra màn hình console để debug xem Backend thực sự trả về cái gì
        console.log("Dữ liệu Backend trả về:", response);

        // Lấy token (bao lô cả trường hợp Backend trả về 'Token' viết hoa hoặc 'token' viết thường)
        const tokenToSave = response.token || response.Token;
        const userToSave = response.user || response.User;

        if (tokenToSave) {
            // 1. Token vẫn lưu ở LocalStorage vì Axios Interceptor cần đọc nó trước mỗi request
            localStorage.setItem('token', tokenToSave);
            
            // 2. GỌI ZUSTAND Ở ĐÂY: Cập nhật thông tin User vào Global State
            // Khi dòng này chạy, Component Header sẽ lập tức nhận tín hiệu và đổi tên!
            useAuthStore.getState().setUser(userToSave);
        } else {
            console.error("Lỗi: Không tìm thấy token trong response!");
        }
        
        return response;
    },

    register: async (userData) => {
        // Gắn thêm Role mặc định là "Staff" (hoặc "Customer") vào gói dữ liệu trước khi gửi đi
        const payload = {
            ...userData,
            role: "Staff" 
        };
        // Nhớ gọi đúng đường dẫn API register
        return await axiosClient.post('/users/register', payload); 
    },

    logout: () => {
        // Xóa sạch dấu vết khi đăng xuất
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user_info');
        
        // Điều hướng về trang chủ hoặc trang đăng nhập
        window.location.href = '/login';
    },
    
    // Hàm tiện ích kiểm tra xem đã login chưa
    isAuthenticated: () => {
        return !!localStorage.getItem('jwt_token');
    },

    // Hàm tiện ích lấy thông tin user hiện tại
    getCurrentUser: () => {
        const userStr = localStorage.getItem('user_info');
        if (userStr) return JSON.parse(userStr);
        return null;
    }
};
