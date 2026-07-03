import axiosClient from '../api/axiosClient';
import useAuthStore from '../store/useAuthStore';

export const authService = {
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

        // Lưu token
        if (rememberMe) {
            localStorage.setItem('token', tokenToSave);
            localStorage.setItem('user_info', JSON.stringify(userToSave));
        } else {
            sessionStorage.setItem('token', tokenToSave);
            sessionStorage.setItem('user_info', JSON.stringify(userToSave));
        }

        // Lưu tạm vào window để fallback
        window.memoryToken = tokenToSave;

        // Cập nhật store
        useAuthStore.getState().setUser(userToSave);

        // Chờ một chút để token lưu xong
        await new Promise(resolve => setTimeout(resolve, 300));

        console.log("Token đã lưu thành công:", localStorage.getItem('token') || sessionStorage.getItem('token'));

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
        localStorage.removeItem('token');
        localStorage.removeItem('user_info');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user_info');
        window.memoryToken = null;
        
        useAuthStore.getState().setUser(null);
        window.location.href = '/login';
    },
    
    forgotPassword: async (email) => {
        return await axiosClient.post('/users/forgot-password', { email });
    },

    resetPassword: async (email, token, newPassword) => {
        return await axiosClient.post('/users/reset-password', { email, token, newPassword });
    },

    externalLogin: async (providerData) => {
        const response = await axiosClient.post('/users/external-login', providerData);
        
        const tokenToSave = response.token || response.Token;
        const userToSave = response.user || response.User;

        if (tokenToSave) {
            localStorage.setItem('token', tokenToSave);
            localStorage.setItem('user_info', JSON.stringify(userToSave));
            window.memoryToken = tokenToSave;
            useAuthStore.getState().setUser(userToSave);
        }
        return response;
    },

    isAuthenticated: () => {
        return !!localStorage.getItem('token') || !!sessionStorage.getItem('token');
    },

    getCurrentUser: () => {
        const userStr = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
        if (userStr) return JSON.parse(userStr);
        return null;
    }
};