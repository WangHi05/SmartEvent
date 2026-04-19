import { create } from 'zustand';

// Tạo một Store toàn cục để quản lý Authentication
const useAuthStore = create((set) => ({
    // 1. Khởi tạo State: Đọc từ localStorage (để giữ đăng nhập khi F5)
    user: JSON.parse(localStorage.getItem('user')) || null,

    // 2. Hàm đăng nhập / Cập nhật thông tin
    setUser: (userData) => {
        // Lưu vào bộ nhớ cứng
        localStorage.setItem('user', JSON.stringify(userData));
        // Cập nhật State toàn cục (Các component gọi state này sẽ tự động render lại)
        set({ user: userData });
    },

    // 3. Hàm đăng xuất
    logout: () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        set({ user: null });
    }
}));

export default useAuthStore;