import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/useAuthStore';

export const authService = {
        // Thêm tham số rememberMe (mặc định là true nếu không truyền)
        login: async (username, password, rememberMe = true) => {
        const response = await axiosClient.post('/users/authenticate', { 
            username, 
            password 
        });
        
        console.log("Dữ liệu Backend trả về:", response);

        const tokenToSave = response.token || response.Token;
        const userToSave = response.user || response.User;

        if (!tokenToSave) {
            throw new Error("Không nhận được token từ máy chủ!");
        }

        // Lưu token + user
        if (rememberMe) {
            localStorage.setItem('token', tokenToSave);
            localStorage.setItem('user_info', JSON.stringify(userToSave));
        } else {
            sessionStorage.setItem('token', tokenToSave);
            sessionStorage.setItem('user_info', JSON.stringify(userToSave));
        }
        
        // Cập nhật store
        useAuthStore.getState().setUser(userToSave);
        
        return response;
    },

    register: async (userData) => {
        const payload = {
            ...userData,
            role: "Customer" 
        };
        return await axiosClient.post('/users/register', payload); 
    },

    logout: () => {
        // Quét sạch cả localStorage và sessionStorage
        localStorage.removeItem('token');
        localStorage.removeItem('user_info');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user_info');
        
        useAuthStore.getState().setUser(null);
        window.location.href = '/login';
    },
    
    forgotPassword: async (email) => {
        // Gọi API backend yêu cầu gửi email reset pass
        return await axiosClient.post('/users/forgot-password', { email });
    },

    resetPassword: async (email, token, newPassword) => {
        // Gọi API backend để đặt lại mật khẩu mới
        return await axiosClient.post('/users/reset-password', { email, token, newPassword });
    },

    //Đăng nhập bằng Google / Facebook
    externalLogin: async (providerData) => {
        const response = await axiosClient.post('/users/external-login', providerData);
        
        // Phải xử lý lưu token y hệt như hàm login bình thường
        const tokenToSave = response.token || response.Token;
        const userToSave = response.user || response.User;

        if (tokenToSave) {
            // Đăng nhập mxh mặc định là lưu vào localStorage
            localStorage.setItem('token', tokenToSave);
            localStorage.setItem('user_info', JSON.stringify(userToSave));
            useAuthStore.getState().setUser(userToSave);
        }
        return response;
    },

    isAuthenticated: () => {
        // Phải kiểm tra ở cả 2 nơi (trường hợp user không tick Ghi nhớ đăng nhập)
        const hasLocalToken = !!localStorage.getItem('token');
        const hasSessionToken = !!sessionStorage.getItem('token');
        return hasLocalToken || hasSessionToken;
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
        if (userStr) return JSON.parse(userStr);
        return null;
    }
};