import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { TOTP } from 'totp-generator';
import axiosClient from '../api/axiosClient';

const DynamicTicketCard = ({
    ticketId,
    secretKey,
    eventName,
    ticketTypeName,
    remainingSlots,
    accessType,
    lastCheckInDate, // "YYYY-MM-DD" hoặc null - từ TicketResponseDto.LastCheckInDate (DateOnly? -> JSON string)
}) => {
    const [qrPayload, setQrPayload] = useState('');
    const [timeLeft, setTimeLeft] = useState(30);

    const [timeOffset, setTimeOffset] = useState(0);
    const [isTimeSynced, setIsTimeSynced] = useState(false);

    const [msUntilNextDay, setMsUntilNextDay] = useState(0);

    const currentPeriodRef = useRef(-1);

    // EFFECT 1: ĐỒNG BỘ GIỜ VỚI SERVER (chỉ chạy 1 lần khi mở vé)
    useEffect(() => {
        const syncServerTime = async () => {
            try {
                const startFetch = Date.now();
                const response = await axiosClient.get('http://localhost:5013/api/system/time');
                const endFetch = Date.now();

                const serverTimeMs = response.data?.serverTimeMs || response.data?.data?.serverTimeMs;

                if (serverTimeMs) {
                    const networkLatency = Math.floor((endFetch - startFetch) / 2);
                    const estimatedRealServerTime = serverTimeMs + networkLatency;
                    const calculatedOffset = estimatedRealServerTime - Date.now();

                    setTimeOffset(calculatedOffset);
                    console.log(`[Đồng bộ giờ] Lệch Client-Server: ${calculatedOffset}ms | Ping: ${networkLatency * 2}ms`);
                }
            } catch (error) {
                console.warn("[Cảnh báo] Không thể lấy giờ server, dùng giờ local của thiết bị.", error);
                setTimeOffset(0);
            } finally {
                setIsTimeSynced(true);
            }
        };

        syncServerTime();
    }, []);

    // accessType: 1 = ONE_TIME (đóng băng vĩnh viễn), 2 = DAILY_MULTI (mai lại quét được)
    const isDailyMulti = accessType === 2;
    const isTicketExhaustedRaw = remainingSlots === 0;

    // QUAN TRỌNG: remainingSlots === 0 chỉ có nghĩa là "hết hôm nay" NẾU lastCheckInDate
    // thực sự là hôm nay (theo giờ VN, dùng timeOffset đã đồng bộ).
    // Nếu lastCheckInDate là hôm qua trở về trước mà remainingSlots vẫn = 0 trong DB
    // (do backend chỉ reset khi có lượt quét thực sự xảy ra), thì với vé DAILY_MULTI
    // ta vẫn coi là "chưa hết" ở phía hiển thị - cho khách xem trước QR như bình thường,
    // vì lượt quét thật tiếp theo backend sẽ tự reset đúng.
    const getVietnamToday = () => {
        const realNow = Date.now() + timeOffset;
        const d = new Date(realNow);
        // Giờ VN không lệch ngày so với giờ máy trong hầu hết trường hợp vì browser
        // của khách thường cũng ở múi giờ VN, nhưng để chắc chắn ta chỉ so sánh
        // theo ngày local dựa trên realNow đã đồng bộ.
        const y = d.getFullYear();
        const m = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${y}-${m}-${day}`;
    };

    const isExhaustedTodayOnly =
        isDailyMulti &&
        isTicketExhaustedRaw &&
        isTimeSynced &&
        lastCheckInDate &&
        lastCheckInDate.slice(0, 10) === getVietnamToday();

    // Vé ONE_TIME hết chỗ -> đóng băng vĩnh viễn như cũ.
    // Vé DAILY_MULTI hết chỗ nhưng KHÔNG phải hôm nay (dữ liệu DB chưa kịp reset)
    // -> coi như chưa hết, cho hiện QR bình thường.
    const isTicketExhausted = isDailyMulti ? isExhaustedTodayOnly : isTicketExhaustedRaw;

    // EFFECT 2: TÍNH ĐẾM NGƯỢC TỚI NGÀY MAI (00:00) - chỉ chạy khi đang ở trạng thái hết lượt hôm nay
    useEffect(() => {
        if (!isExhaustedTodayOnly) {
            setMsUntilNextDay(0);
            return;
        }

        const computeRemaining = () => {
            const realNow = Date.now() + timeOffset;
            const now = new Date(realNow);
            const nextMidnight = new Date(
                now.getFullYear(),
                now.getMonth(),
                now.getDate() + 1,
                0, 0, 0, 0
            );
            const remaining = nextMidnight.getTime() - realNow;
            setMsUntilNextDay(Math.max(0, remaining));
        };

        computeRemaining();
        const countdownInterval = setInterval(computeRemaining, 1000);

        return () => clearInterval(countdownInterval);
    }, [isExhaustedTodayOnly, timeOffset]);

    // EFFECT 3: SINH MÃ TOTP (chỉ chạy khi có secretKey, đã đồng bộ giờ, VÀ vé chưa dùng hết)
    useEffect(() => {
        if (!secretKey || !isTimeSynced || isTicketExhausted) return;

        const updateQRCode = async () => {
            try {
                let token = '';
                let rawResult = null;

                const realTimestamp = Date.now() + timeOffset;

                const options = {
                    digits: 6,
                    algorithm: "SHA-1",
                    period: 30,
                    timestamp: realTimestamp
                };

                if (TOTP && typeof TOTP.generate === 'function') {
                    rawResult = await TOTP.generate(secretKey, options);
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
            } catch (err) {
                console.error("Lỗi sinh TOTP:", err);
            }
        };

        const syncTimer = () => {
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

        syncTimer();
        const interval = setInterval(syncTimer, 500);

        return () => clearInterval(interval);
    }, [ticketId, secretKey, isTimeSynced, timeOffset, isTicketExhausted]);

    const isExpiringSoon = timeLeft <= 3;

    const formatCountdown = (ms) => {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600);
        const m = Math.floor((totalSeconds % 3600) / 60);
        const s = totalSeconds % 60;
        if (h > 0) return `${h} giờ ${m} phút`;
        if (m > 0) return `${m} phút ${s} giây`;
        return `${s} giây`;
    };

    return (
        <div className="flex flex-col items-center justify-center p-4">
            <div className="mb-4 text-center">
                <h3 className="text-lg font-bold">{eventName}</h3>
                <span className="text-gray-500">{ticketTypeName}</span>
            </div>

            {isTicketExhausted ? (
                <div className="w-[256px] flex flex-col items-center justify-center text-center p-4">
                    {isExhaustedTodayOnly ? (
                        // Vé nhiều ngày, đã dùng hết lượt hôm nay -> thông báo ĐỎ, đếm ngược tới 00:00
                        <div className="w-full h-[256px] bg-red-50 border-2 border-red-200 rounded-lg flex flex-col items-center justify-center text-center p-4">
                            <span className="text-5xl mb-3">⏳</span>
                            <span className="text-red-700 font-bold text-lg">
                                Đã sử dụng vé hôm nay
                            </span>
                            <span className="text-red-600 text-sm mt-2">
                                Vé sẽ có hiệu lực trở lại sau
                            </span>
                            <span className="text-red-700 font-extrabold text-xl mt-1 tabular-nums">
                                {formatCountdown(msUntilNextDay)}
                            </span>
                            <span className="text-red-500 text-xs mt-2">
                                (Vé nhiều ngày — mỗi ngày quét được 1 lần, tự mở lại lúc 00:00)
                            </span>
                        </div>
                    ) : (
                        // Vé 1 ngày (ONE_TIME) đã dùng hết -> đóng băng vĩnh viễn
                        <div className="w-full h-[256px] bg-emerald-50 border-2 border-emerald-200 rounded-lg flex flex-col items-center justify-center text-center p-4">
                            <span className="text-5xl mb-3">✅</span>
                            <span className="text-emerald-700 font-bold text-lg">
                                Vé đã được sử dụng
                            </span>
                            <span className="text-emerald-600 text-sm mt-1">
                                Mã QR đã đóng băng, không thể quét lại
                            </span>
                        </div>
                    )}
                </div>
            ) : (
                <>
                    <div className={`p-2 bg-white rounded-lg shadow-sm border-2 transition-colors duration-300 ${
                        isExpiringSoon ? 'border-red-400' : 'border-gray-200'
                    }`}>
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
                </>
            )}
        </div>
    );
};

export default DynamicTicketCard;