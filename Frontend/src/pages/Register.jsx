import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/authService';

const Register = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        username: '', password: '', fullName: '', email: ''
    });
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            await authService.register(formData);
            alert('Đăng ký thành công! Vui lòng đăng nhập.');
            navigate('/login');
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-orange-50 via-white to-purple-50">
            {/* Left Side - Registration Form */}
            <div className="flex-1 flex items-center justify-center p-8">
                <div className="w-full max-w-md">
                    {/* Mobile Logo */}
                    <div className="lg:hidden flex items-center justify-center space-x-3 mb-8">
                        <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-purple-600 rounded-xl flex items-center justify-center">
                            <span className="text-3xl">🎉</span>
                        </div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-500 to-purple-600 bg-clip-text text-transparent">
                            SmartEvent
                        </h1>
                    </div>

                    <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                        <div className="text-center mb-8">
                            <h2 className="text-3xl font-bold text-gray-800 mb-2">
                                Tạo tài khoản mới
                            </h2>
                            <p className="text-gray-500">
                                Bắt đầu quản lý sự kiện của bạn ngay hôm nay
                            </p>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border-l-4 border-red-500 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-start">
                                <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm">{error}</span>
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2">
                                    Họ và Tên
                                </label>
                                <input
                                    type="text"
                                    name="fullName"
                                    value={formData.fullName}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Nhập họ và tên"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2">
                                    Email
                                </label>
                                <input
                                    type="email"
                                    name="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="example@email.com"
                                    required
                                />
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2">
                                    Tên đăng nhập
                                </label>
                                <input
                                    type="text"
                                    name="username"
                                    value={formData.username}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Tối thiểu 3 ký tự"
                                    required
                                    minLength={3}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Tên đăng nhập phải có ít nhất 3 ký tự
                                </p>
                            </div>

                            <div>
                                <label className="block text-gray-700 text-sm font-semibold mb-2">
                                    Mật khẩu
                                </label>
                                <input
                                    type="password"
                                    name="password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all"
                                    placeholder="Tối thiểu 6 ký tự"
                                    required
                                    minLength={6}
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                    Mật khẩu phải có ít nhất 6 ký tự
                                </p>
                            </div>

                            <div className="flex items-start">
                                <input
                                    type="checkbox"
                                    className="w-4 h-4 text-orange-600 border-gray-300 rounded focus:ring-orange-500 mt-1"
                                    required
                                />
                                <label className="ml-2 text-sm text-gray-600">
                                    Tôi đồng ý với{' '}
                                    <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
                                        Điều khoản dịch vụ
                                    </a>{' '}
                                    và{' '}
                                    <a href="#" className="text-orange-600 hover:text-orange-700 font-medium">
                                        Chính sách bảo mật
                                    </a>
                                </label>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className={`w-full text-white font-semibold py-3 px-6 rounded-xl focus:outline-none focus:ring-4 focus:ring-orange-300 transition-all transform hover:scale-[1.02] ${
                                    isLoading 
                                        ? 'bg-gradient-to-r from-orange-400 to-purple-400 cursor-not-allowed' 
                                        : 'bg-gradient-to-r from-orange-500 to-purple-600 hover:from-orange-600 hover:to-purple-700 shadow-lg'
                                }`}
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Đang xử lý...
                                    </span>
                                ) : (
                                    'Đăng Ký Ngay'
                                )}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <span className="text-gray-600">Đã có tài khoản? </span>
                            <Link 
                                to="/login" 
                                className="text-orange-600 hover:text-orange-700 font-semibold hover:underline"
                            >
                                Đăng nhập
                            </Link>
                        </div>

                        {/* Social Registration (Optional) */}
                        <div className="mt-8">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center">
                                    <div className="w-full border-t border-gray-300"></div>
                                </div>
                                <div className="relative flex justify-center text-sm">
                                    <span className="px-4 bg-white text-gray-500">Hoặc đăng ký với</span>
                                </div>
                            </div>

                            <div className="mt-6 grid grid-cols-2 gap-3">
                                <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                                    <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
                                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                                    </svg>
                                    Google
                                </button>
                                <button className="w-full inline-flex justify-center items-center py-2.5 px-4 border border-gray-300 rounded-lg bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 transition-all">
                                    <svg className="w-5 h-5 mr-2" fill="#1877F2" viewBox="0 0 24 24">
                                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                    </svg>
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
};

export default Register;
