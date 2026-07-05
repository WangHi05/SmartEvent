import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { authService } from '../services/authService';
import useAuthStore from '../store/useAuthStore';

export default function Login() {
    const navigate = useNavigate();
    const setUser = useAuthStore((state) => state.setUser);
    const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });
    const location = useLocation();
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const navigateAfterAuth = (authResponse) => {
        const rawRole = (authResponse?.user?.role || authResponse?.user?.Role || '').toString().toLowerCase();
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
        if (role === 'staff') {
            navigate('/bookings', { replace: true });
            return;
        }

        navigate('/dashboard', { replace: true });
    };

    const handleChange = (e) => {
        const value = e.target.type === 'checkbox' ? e.target.checked : e.target.value;
        setFormData({ ...formData, [e.target.name]: value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const authResponse = await authService.login(formData.username, formData.password, formData.rememberMe);

            if (authResponse && authResponse.user) {
                setUser(authResponse.user);
            }

            navigateAfterAuth(authResponse);
        } catch (err) {
            console.error("Lỗi trong quá trình đăng nhập:", err);

            if (err.response) {
                setError(err.response.data?.message || 'Tên đăng nhập hoặc mật khẩu không đúng!');
            } else if (err.request) {
                setError('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.');
            } else {
                setError(`Đã xảy ra lỗi: ${err.message}`);
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

            if (authResponse && authResponse.user) {
                setUser(authResponse.user);
            }

            navigateAfterAuth(authResponse);
        } catch (err) {
             if (err.response) {
                setError(`Đăng nhập ${provider} thất bại: ${err.response.data?.message}`);
            } else {
                setError(`Không thể kết nối đến dịch vụ ${provider}!`);
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen bg-gray-50">
            {/* Left branding panel */}
            <div className="hidden w-[42%] flex-col justify-between bg-gray-900 p-12 text-white lg:flex">
                <Link to="/customer/home" className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-lg font-bold text-white">
                        S
                    </div>
                    <span className="text-lg font-bold">SmartEvent</span>
                </Link>

                <div className="max-w-md space-y-4">
                    <h2 className="text-3xl font-bold leading-tight">
                        Quản lý sự kiện và đặt vé chuyên nghiệp
                    </h2>
                    <p className="text-sm leading-6 text-gray-400">
                        Đăng nhập để tiếp tục theo dõi vé, đơn hàng và các sự kiện bạn quan tâm.
                    </p>
                </div>

                <p className="text-xs text-gray-500">© 2026 SmartEvent. All rights reserved.</p>
            </div>

            {/* Right form panel */}
            <div className="flex flex-1 items-center justify-center p-6 sm:p-10">
                <div className="w-full max-w-sm">
                    <div className="mb-8 flex items-center gap-2.5 lg:hidden">
                        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-green-600 text-lg font-bold text-white">
                            S
                        </div>
                        <span className="text-lg font-bold text-gray-900">SmartEvent</span>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900">Chào mừng trở lại</h2>
                    <p className="mt-1 text-sm text-gray-500">Đăng nhập để tiếp tục quản lý sự kiện của bạn</p>

                    {error && (
                        <div className="mt-6 flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                            <span className="break-words">{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">Tên đăng nhập</label>
                            <input
                                type="text" name="username" value={formData.username} onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="Nhập tên đăng nhập" required
                            />
                        </div>
                        <div>
                            <label className="mb-1.5 block text-sm font-medium text-gray-700">Mật khẩu</label>
                            <input
                                type="password" name="password" value={formData.password} onChange={handleChange}
                                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none transition-colors focus:border-green-500 focus:ring-1 focus:ring-green-500"
                                placeholder="Nhập mật khẩu" required
                            />
                        </div>

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer text-gray-600">
                                <input
                                    type="checkbox" name="rememberMe"
                                    checked={formData.rememberMe} onChange={handleChange}
                                    className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                                />
                                Ghi nhớ đăng nhập
                            </label>
                            <button type="button" onClick={() => navigate('/forgot-password')} className="font-medium text-green-700 hover:text-green-800">
                                Quên mật khẩu?
                            </button>
                        </div>

                        <button
                            type="submit" disabled={isLoading}
                            className={`w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-colors ${isLoading ? 'cursor-not-allowed bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`}
                        >
                            {isLoading ? 'Đang xử lý...' : 'Đăng nhập'}
                        </button>

                        <p className="text-center text-sm text-gray-600">
                            Chưa có tài khoản?{' '}
                            <Link to="/register" className="font-semibold text-green-700 hover:text-green-800">
                                Đăng ký ngay
                            </Link>
                        </p>
                    </form>

                    <div className="mt-8">
                        <div className="relative flex justify-center text-sm">
                            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
                            <span className="relative bg-gray-50 px-3 text-gray-500 lg:bg-white">hoặc đăng nhập với</span>
                        </div>
                        <div className="mt-5 grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => handleSocialLogin('Google')} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                <svg className="h-4 w-4" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                                Google
                            </button>
                            <button type="button" onClick={() => handleSocialLogin('Facebook')} className="flex items-center justify-center gap-2 rounded-lg border border-gray-300 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                                <svg className="h-4 w-4" fill="#1877F2" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                                Facebook
                            </button>
                        </div>
                    </div>

                    <p className="mt-8 text-center text-xs text-gray-400 lg:hidden">
                        © 2026 SmartEvent. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    );
}