import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import * as totpLib from 'totp-generator';
import axiosClient from '../api/axiosClient';


const DynamicTicketCard = ({ ticketId, secretKey, eventName, ticketTypeName }) => {
    const [qrPayload, setQrPayload] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);
    
    // THÊM MỚI: State lưu trữ độ lệch giờ và trạng thái sẵn sàng
    const [timeOffset, setTimeOffset] = useState(0);
    const [isTimeSynced, setIsTimeSynced] = useState(false);
    
    const currentPeriodRef = useRef(-1);

    // EFFECT 1: ĐỒNG BỘ GIỜ VỚI SERVER (Chỉ chạy 1 lần khi mở vé)
    useEffect(() => {
        const syncServerTime = async () => {
            try {
                // Lấy thời điểm bắt đầu gọi API
                const startFetch = Date.now(); 
                
                // GỌI API LẤY GIỜ SERVER (Chỉnh lại URL nếu axiosClient của em đã config sẵn baseURL)
                // const response = await axiosClient.get('/system/time');
                const response = await axiosClient.get('http://localhost:5013/api/system/time'); 
                
                const endFetch = Date.now();

                // Lấy dữ liệu từ API
                const serverTimeMs = response.data?.serverTimeMs || response.data?.data?.serverTimeMs;

                if (serverTimeMs) {
                    // Thuật toán bù trừ độ trễ mạng (Ping)
                    // Giả sử gọi API mất 100ms, thì lúc nhận được kết quả, giờ server thực tế đã trôi qua thêm 50ms (1 nửa ping)
                    const networkLatency = Math.floor((endFetch - startFetch) / 2);
                    const estimatedRealServerTime = serverTimeMs + networkLatency;
                    
                    // Tính độ lệch: Giờ Server Thực - Giờ Điện Thoại
                    const calculatedOffset = estimatedRealServerTime - Date.now();
                    
                    setTimeOffset(calculatedOffset);
                    console.log(`[Đồng bộ giờ] Lệch Client-Server: ${calculatedOffset}ms | Ping: ${networkLatency * 2}ms`);
                }
            } catch (error) {
                console.warn("[Cảnh báo] Không thể lấy giờ server, dùng giờ local của thiết bị.", error);
                setTimeOffset(0); // Nếu rớt mạng, chấp nhận dùng giờ của điện thoại (Fallback)
            } finally {
                // Dù thành công hay thất bại cũng phải bật cờ cho phép sinh QR
                setIsTimeSynced(true);
            }
        };

        syncServerTime();
    }, []); // Array rỗng: Chỉ chạy 1 lần khi mount

    // EFFECT 2: SINH MÃ TOTP (Chỉ chạy khi đã có secretKey VÀ đã đồng bộ giờ xong)
    useEffect(() => {
        if (!secretKey || !isTimeSynced) return;

        const updateQRCode = async () => {
            try {
                let token = '';
                let rawResult = null;

                // THUẬT TOÁN CHÍNH: Thời gian thực tế = Thời gian điện thoại + Độ lệch
                const realTimestamp = Date.now() + timeOffset; 
                
                const options = { 
                    digits: 6, 
                    algorithm: "SHA-1", 
                    period: 30, 
                    timestamp: realTimestamp 
                };

                if (totpLib.TOTP && typeof totpLib.TOTP.generate === 'function') {
                    rawResult = totpLib.TOTP.generate(secretKey, options);
                } else if (typeof totpLib.default === 'function') {
                    rawResult = totpLib.default(secretKey, options);
                } else if (typeof totpLib === 'function') {
                    rawResult = totpLib(secretKey, options);
                } else {
                    throw new Error("Không tìm thấy hàm sinh mã hợp lệ.");
                }

                if (rawResult instanceof Promise) {
                    rawResult = await rawResult;
                }

                if (typeof rawResult === 'string' || typeof rawResult === 'number') {
                    token = String(rawResult);
                } else if (typeof rawResult === 'object' && rawResult !== null) {
                    token = rawResult.otp || rawResult.token || rawResult.default || '';
                }

                if (!token || token === 'undefined') {
                    throw new Error("Trích xuất OTP thất bại.");
                }

                const newPayload = `${ticketId}|${token}`;
                setQrPayload(newPayload);
                // console.log(`[TOTP] Sinh mã thành công: ${token}`);
            } catch (err) {
                console.error("Lỗi sinh TOTP:", err);
            }
        };

        const syncTimer = () => {
            // Lưu ý: Tính chu kỳ cũng phải dùng thời gian đã bù trừ (realTimestamp)
            const realNow = Date.now() + timeOffset;
            const epochSeconds = Math.floor(realNow / 1000);
            
            const remaining = 30 - (epochSeconds % 30);
            setTimeLeft(remaining);

            const currentPeriod = Math.floor(realNow / 30000);

            if (currentPeriod !== currentPeriodRef.current) {
                currentPeriodRef.current = currentPeriod;
                updateQRCode();
            }
        };

        // Chạy ngay lập tức lần đầu
        syncTimer();
        const interval = setInterval(syncTimer, 500);

        return () => clearInterval(interval);
    }, [ticketId, secretKey, isTimeSynced, timeOffset]); 

    // UX: Hiệu ứng nhấp nháy đỏ
    const isExpiringSoon = timeLeft <= 3;

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="mb-4 text-center">
                <h3 className="text-lg font-bold">{eventName}</h3>
                <span className="text-gray-500">{ticketTypeName}</span>
            </div>
            
            <div className={`p-2 bg-white rounded-lg shadow-sm border-2 transition-colors duration-300 ${
                isExpiringSoon ? 'border-red-400' : 'border-gray-200'
            }`}>
                {/* Nếu chưa đồng bộ giờ xong, hiển thị trạng thái tải */}
                {(!isTimeSynced || !qrPayload) ? (
                   <div className="w-[256px] h-[256px] bg-gray-50 flex items-center justify-center rounded">
                       <span className="text-gray-400 animate-pulse">
                           {!isTimeSynced ? "Đang đồng bộ máy chủ..." : "Đang tạo mã..."}
                       </span>
                   </div>
                ) : (
                    <QRCodeSVG 
                        value={qrPayload} 
                        size={256} 
                        level="M" 
                        className={isExpiringSoon ? 'opacity-50 transition-opacity' : 'opacity-100'}
                    />
                )}
            </div>
            
            <p className={`mt-4 text-sm font-semibold transition-all ${
                isExpiringSoon ? 'text-red-600 animate-bounce' : 'text-red-500'
            }`}>
                Mã sẽ tự động làm mới sau: {timeLeft}s
            </p>
            <p className="text-xs text-gray-400 mt-1">
                (Mã chỉ có hiệu lực trong thời gian đếm ngược)
            </p>
        </div>
    );
};

export default DynamicTicketCard;