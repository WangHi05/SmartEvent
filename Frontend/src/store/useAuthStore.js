import { create } from 'zustand';

// 1. Viết một hàm nhỏ gọn ngay tại đây để tìm dữ liệu User (Cắt đứt vòng lặp với authService)
const getInitialUser = () => {
    const userStr = localStorage.getItem('user_info') || sessionStorage.getItem('user_info');
    if (userStr) return JSON.parse(userStr);
    return null;
};

// 2. Khởi tạo Zustand Store
const useAuthStore = create((set) => ({
    // Lấy user an toàn từ cả 2 nguồn
    user: getInitialUser(),

    setUser: (userData) => {
        set({ user: userData });
    },

    logout: () => {
        set({ user: null });
    }
}));

export default useAuthStore;