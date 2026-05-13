import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';

export default function Login() {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
    const location = useLocation();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigateAfterAuth = (authResponse) => {
        const rawRole = (authResponse?.user?.role || authResponse?.user?.Role || '').toString().toLowerCase();
        // Normalize numeric role codes possibly returned by backend
        const roleMap = { '0': 'admin', '1': 'manager', '2': 'staff', '3': 'customer', '4': 'director', 'director': 'director' };
        const role = roleMap[rawRole] || rawRole;
        const query = new URLSearchParams(location.search);
        const redirectPath = query.get('redirect');

        if (redirectPath && redirectPath.startsWith('/')) {
            navigate(redirectPath, { replace: true });
            return;
        }

        if (role === 'director') {
            navigate('/director/dashboard', { replace: true });
            return;
        }
        if (role === 'admin') {
            navigate('/admin/dashboard', { replace: true });
            return;
        }
        // Fallback to legacy dashboard for manager/staff
        navigate('/dashboard', { replace: true });
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault(); // RẤT QUAN TRỌNG: Ngăn trang web bị reload
        setIsLoading(true); 
        setError('');
        
        try {
            const authResponse = await authService.login(formData.username, formData.password, formData.rememberMe);
            navigateAfterAuth(authResponse); 
        } catch (err) {
            // Log toàn bộ object lỗi ra console để dev dễ debug
            console.error("🚨 Chi tiết lỗi trong quá trình đăng nhập:", err);
            
            // CƠ CHẾ BẮT LỖI 3 TẦNG:
            if (err.response) {
                // Tầng 1: Lỗi từ Backend (Ví dụ: 401 Sai mật khẩu, 404 Không tìm thấy user)
                setError(err.response.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
            } else if (err.request) {
                // Tầng 2: Lỗi mạng (Backend sập, đứt cáp, CORS)
                setError('Không thể kết nối đến máy chủ. Vui lòng kiểm tra lại Backend đang chạy!');
            } else {
                // Tầng 3: Lỗi code Frontend (Sai cú pháp, undefined variable, lỗi Zustand...)
                setError(`Lỗi code Frontend: ${err.message}. Vui lòng mở F12 xem tab Console.`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    const handleSocialLogin = async (provider) => {
        try {
            setIsLoading(true);
            const mockProviderData = { 
                email: `user@${provider.toLowerCase()}.com`, 
                name: `${provider} User`, 
                provider: provider,
                providerId: '123456' 
            };
            const authResponse = await authService.externalLogin(mockProviderData);
            navigateAfterAuth(authResponse);
        } catch (err) {
             if (err.response) {
                setError(`Đăng nhập ${provider} thất bại: ${err.response.data?.message}`);
            } else {
                setError(`Không thể kết nối đến dịch vụ ${provider}!`);
            }
        }finally 
        {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-purple-50 via-white to-orange-50">
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">Chào mừng trở lại!</h2>
                            <p className="text-gray-500">Đăng nhập để tiếp tục quản lý sự kiện</p>
                        </div>

                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 text-sm flex items-start">
                                <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0 mt-0.5" />
                                <span className="break-words">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-5">
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2">Tên đăng nhập</label>
                                <input
                                    type="text" name="username" value={formData.username} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    placeholder="Nhập tên đăng nhập" required
                                />
                            </div>
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2">Mật khẩu</label>
                                <input
                                    type="password" name="password" value={formData.password} onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                    placeholder="Nhập mật khẩu" required
                                />
                            </div>

                            <div className="flex items-center justify-between text-sm">
                                <label className="flex items-center cursor-pointer">
                                    <input 
                                        type="checkbox" name="rememberMe" 
                                        checked={formData.rememberMe} onChange={handleChange}
                                        className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500" 
                                    />
                                    <span className="ml-2 text-gray-600">Ghi nhớ đăng nhập</span>
                                </label>
                                <button type="button" onClick={() => navigate('/forgot-password')} className="text-purple-600 hover:text-purple-700 font-medium">
                                    Quên mật khẩu?
                                </button>
                            </div>

                            <button
                                type="submit" disabled={isLoading}
                                className={`w-full text-white font-semibold py-3 px-6 rounded-xl transition-all transform hover:scale-[1.02] ${isLoading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-orange-500 hover:shadow-lg'}`}
                            >
                                {isLoading ? 'Đang xử lý...' : 'Đăng Nhập'}
                            </button>
                            <div className="mt-6 text-center">
                                <span className="text-gray-600">Chưa có tài khoản? </span>
                                    <Link 
                                        to="/register" 
                                        className="text-purple-600 hover:text-orange-500 font-semibold transition-colors duration-300"
                                    >
                                        Đăng ký ngay
                                    </Link>
                            </div>
                        </form>

                        <div className="mt-8">
                            <div className="relative flex justify-center text-sm mb-6">
                                <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
                                <span className="px-4 bg-white text-gray-500 relative">Hoặc đăng nhập với</span>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button type="button" onClick={() => handleSocialLogin('Google')} className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition">
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                    Google
                                </button>
                                <button type="button" onClick={() => handleSocialLogin('Facebook')} className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium text-gray-700 transition">
                                    <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                    Facebook
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <p className="text-center text-gray-500 text-sm mt-6">
                        © 2026 SmartEvent. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}