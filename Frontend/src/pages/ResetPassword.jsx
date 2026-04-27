import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ResetPassword() {
    const navigate = useNavigate();
    // useSearchParams dùng để đọc query string trên URL (?email=...)
    const [searchParams] = useSearchParams(); 
    const emailFromUrl = searchParams.get('email');

    const [formData, setFormData] = useState({ token: '', newPassword: '', confirmPassword: '' });
    const [status, setStatus] = useState('idle');
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (formData.newPassword !== formData.confirmPassword) {
            setError("Mật khẩu xác nhận không khớp!");
            return;
        }
        
        setStatus('loading');
        try {
            await authService.resetPassword(emailFromUrl, formData.token, formData.newPassword);
            setStatus('success');
            setTimeout(() => navigate('/login'), 2000); // Tự động về trang login sau 2s
        } catch (err) {
            setStatus('error');
            setError(err.response?.data?.message || "Mã xác nhận không đúng hoặc đã hết hạn.");
        }
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-purple-50 via-white to-orange-50 items-center justify-center p-8">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <h2 className="text-2xl font-bold text-gray-800 mb-2">Tạo mật khẩu mới</h2>
                <p className="text-gray-500 mb-6 text-sm">Email: <span className="font-semibold text-purple-600">{emailFromUrl || 'N/A'}</span></p>

                {error && <p className="text-red-500 text-sm mb-4 bg-red-50 p-3 rounded-lg">{error}</p>}
                
                {status === 'success' ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center">
                        <p className="font-semibold">Đổi mật khẩu thành công!</p>
                        <p className="text-sm mt-1">Đang chuyển về trang đăng nhập...</p>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Mã xác nhận (Từ Email)</label>
                            <input
                                type="text" value={formData.token} onChange={(e) => setFormData({...formData, token: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Nhập mã 6-8 số/chữ" required
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Mật khẩu mới</label>
                            <input
                                type="password" value={formData.newPassword} onChange={(e) => setFormData({...formData, newPassword: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Tối thiểu 6 ký tự" required minLength={6}
                            />
                        </div>
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Xác nhận mật khẩu</label>
                            <input
                                type="password" value={formData.confirmPassword} onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none"
                                placeholder="Nhập lại mật khẩu mới" required
                            />
                        </div>
                        <button
                            type="submit" disabled={status === 'loading'}
                            className="w-full text-white font-semibold py-3 px-6 rounded-xl bg-gradient-to-r from-purple-600 to-orange-500 hover:shadow-lg transition-all"
                        >
                            {status === 'loading' ? 'Đang xử lý...' : 'Cập nhật mật khẩu'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}