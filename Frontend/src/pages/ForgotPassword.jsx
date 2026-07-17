import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../services/authService';

export default function ForgotPassword() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

    const handleSubmit = async (e) => {
        e.preventDefault();
        setStatus('loading');
        try {
            await authService.forgotPassword(email);
            setStatus('success');
            // Gợi ý: Backend sẽ gửi email chứa link: http://localhost:5173/reset-password?email=xxx
        } catch (err) {
            setStatus('error');
        }
    };

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-orange-50 via-white to-amber-50 items-center justify-center p-8">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
                <button onClick={() => navigate('/login')} className="text-gray-500 hover:text-orange-600 mb-6 flex items-center text-sm font-medium">
                    ← Quay lại đăng nhập
                </button>

                <h2 className="text-2xl font-bold text-gray-800 mb-2">Quên mật khẩu?</h2>
                <p className="text-gray-500 mb-6 text-sm">Nhập email liên kết với tài khoản của bạn, chúng tôi sẽ gửi mã đặt lại mật khẩu.</p>

                {status === 'success' ? (
                    <div className="bg-green-50 text-green-700 p-4 rounded-xl text-center border border-green-200">
                        <p className="font-semibold mb-2">Đã gửi email xác nhận!</p>
                        <p className="text-sm">Vui lòng kiểm tra hộp thư của bạn.</p>
                        <button onClick={() => navigate('/reset-password?email=' + email)} className="mt-4 text-orange-600 underline text-sm">
                            (Bấm vào đây để test trang Reset)
                        </button>
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-gray-700 text-sm font-semibold mb-2">Email của bạn</label>
                            <input
                                type="email" value={email} onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                                placeholder="example@email.com" required
                            />
                        </div>
                        {status === 'error' && <p className="text-red-500 text-sm">Không tìm thấy email hoặc có lỗi xảy ra.</p>}

                        <button
                            type="submit" disabled={status === 'loading'}
                            className={`w-full text-white font-semibold py-3 px-6 rounded-xl transition-all ${status === 'loading' ? 'bg-gray-400' : 'bg-orange-600 hover:bg-orange-700 shadow-md'}`}
                        >
                            {status === 'loading' ? 'Đang gửi...' : 'Gửi mã xác nhận'}
                        </button>
                    </form>
                )}
            </div>
        </div>
    );
}