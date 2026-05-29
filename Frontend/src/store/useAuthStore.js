import { create } from 'zustand';

// 1. Viết một hàm nhỏ gọn ngay tại đây để tìm dữ liệu User (Cắt đứt vòng lặp với authService)
const getInitialUser = () => {
    const userStr = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
    if (userStr) return JSON.parse(userStr);
    return null;
};

const persistUser = (userData) => {
    const hasLocalToken = !!localStorage.getItem('token');
    const hasSessionToken = !!sessionStorage.getItem('token');

    if (userData) {
        const targetStorage = hasLocalToken || !hasSessionToken ? localStorage : sessionStorage;
        targetStorage.setItem('user_info', JSON.stringify(userData));
    } else {
        localStorage.removeItem('user_info');
        sessionStorage.removeItem('user_info');
    }
};

// 2. Khởi tạo Zustand Store
const useAuthStore = create((set) => ({
    // Lấy user an toàn từ cả 2 nguồn
    user: getInitialUser(),

    setUser: (userData) => {
        persistUser(userData);
        set({ user: userData });
    },

    logout: () => {
        persistUser(null);
        set({ user: null });
    }
}));

export default useAuthStore;