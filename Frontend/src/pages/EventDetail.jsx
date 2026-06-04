import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { message } from 'antd';

const SkeletonBlock = ({ className }) => (
    <div className={`bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse rounded-xl ${className}`} />
);
 
const LoadingSkeleton = () => (
    <div className="min-h-screen bg-gray-50">
        {/* Hero skeleton */}
        <div className="w-full h-72 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse" />
        <div className="max-w-5xl mx-auto px-4 -mt-16 relative z-10 pb-16">
            <div className="bg-white rounded-2xl shadow-xl p-8 space-y-4">
                <SkeletonBlock className="h-9 w-2/3" />
                <SkeletonBlock className="h-5 w-1/3" />
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                    <SkeletonBlock className="h-28" />
                    <SkeletonBlock className="h-28" />
                    <SkeletonBlock className="h-28" />
                </div>
                <SkeletonBlock className="h-4 w-full mt-4" />
                <SkeletonBlock className="h-4 w-5/6" />
                <SkeletonBlock className="h-4 w-4/6" />
            </div>
        </div>
    </div>
);
 

const NotFound = ({ onBack }) => (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
        <div className="text-center max-w-md">
            <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-12 h-12 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Sự kiện không tồn tại</h2>
            <p className="text-gray-500 mb-8">Sự kiện này đã bị xóa hoặc không còn hoạt động.</p>
            <button
                onClick={onBack}
                className="px-6 py-3 bg-gradient-to-r from-orange-500 to-purple-600 text-white rounded-xl font-semibold hover:opacity-90 transition"
            >
                ← Quay lại trang chủ
            </button>
        </div>
    </div>
);
 

const InfoCard = ({ icon, label, value, accent }) => {
    const accents = {
        orange: 'bg-orange-100 text-orange-600',
        purple: 'bg-purple-100 text-purple-600',
        green:  'bg-green-100  text-green-600',
    };
    return (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-start gap-4 hover:shadow-md transition-shadow">
            <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-xl ${accents[accent]}`}>
                {icon}
            </div>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">{label}</p>
                <p className="text-sm font-semibold text-gray-800 leading-snug break-words">{value}</p>
            </div>
        </div>
    );
};
 

const EventDetail = () => {
    const { slug, id } = useParams();
    const navigate = useNavigate();
    const [eventData, setEventData] = useState(null);
    const [loading, setLoading]     = useState(true);
 
    useEffect(() => {
        const fetchEventDetail = async () => {
            try {
                const response = await axiosClient.get(`/events/${id}`);
                const data = response.data || response;
 
                if (data.slug && data.slug !== slug) {
                    navigate(`/event/${data.slug}/${id}`, { replace: true });
                    return;
                }
                setEventData(data);
            } catch (error) {
                console.error('Lỗi lấy dữ liệu sự kiện:', error);
                message.error('Không tìm thấy sự kiện hoặc sự kiện đã bị xóa.');
            } finally {
                setLoading(false);
            }
        };
        fetchEventDetail();
    }, [id, slug, navigate]);
 
    if (loading)    return <LoadingSkeleton />;
    if (!eventData) return <NotFound onBack={() => navigate('/')} />;
 
    const currentUrl = window.location.href;
    const isSoldOut = eventData.isFull;
    const now = new Date();
    const eventEndTime = new Date(eventData.endTime);

    // 1. Trạng thái cơ bản của sự kiện
    const isEventCancelledOrDraft = eventData.status === 0 || eventData.status === 4;
    const isEventEnded = now > eventEndTime;

    // 2. Phân tích chi tiết từ danh sách TicketTypes do Admin cấu hình
    const ticketTypes = eventData.ticketTypes || eventData.TicketTypes || [];

    let hasActiveSale = false;
    let isUpcomingSale = false;
    let isSaleEnded = false;
    let isAllSoldOut = eventData.isFull;

    if (ticketTypes.length > 0) {
        const activeTickets = ticketTypes.filter(t => t.isActive ?? t.IsActive ?? true);

        if (activeTickets.length > 0) {
            // Có vé nào đang trong khung giờ mở bán và còn chỗ không?
            hasActiveSale = activeTickets.some(t => {
                const saleStart = new Date(t.saleStartTime ?? t.SaleStartTime);
                const saleEnd = new Date(t.saleEndTime ?? t.SaleEndTime);
                const remaining = t.remainingQuantity ?? t.RemainingQuantity ?? 0;
                return now >= saleStart && now <= saleEnd && remaining > 0;
            });

            // Nếu không có vé nào đang mở bán, xác định nguyên nhân chi tiết
            if (!hasActiveSale) {
                isUpcomingSale = activeTickets.every(t => now < new Date(t.saleStartTime ?? t.SaleStartTime));
                isSaleEnded = activeTickets.every(t => now > new Date(t.saleEndTime ?? t.SaleEndTime));
                isAllSoldOut = activeTickets.every(t => (t.remainingQuantity ?? t.RemainingQuantity ?? 0) <= 0);
            }
        }
    } else {
        // Fallback: Nếu không có cấu hình vé chi tiết, dự phòng theo giờ sự kiện
        hasActiveSale = !isAllSoldOut && !isEventCancelledOrDraft && !isEventEnded;
    }

    // 3. Quyết định quyền mua vé cuối cùng
    const canBuy = hasActiveSale && !isEventCancelledOrDraft && !isEventEnded;

    // 4. Cấu hình giao diện (Badge và Nút bấm) theo từng kịch bản
    let statusBadge = { label: 'Đang Mở Bán', cls: 'bg-green-100 text-green-600 border-green-200' };
    let buttonConfig = {
        text: 'Mua Vé Ngay',
        icon: (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
            </svg>
        )
    };

    if (isEventCancelledOrDraft || isEventEnded) {
        statusBadge = { label: 'Đã Đóng', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
        buttonConfig.text = isEventEnded ? 'Đã Kết Thúc' : 'Đã Khóa';
        buttonConfig.icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
    } else if (isAllSoldOut) {
        statusBadge = { label: 'Hết Vé', cls: 'bg-red-100 text-red-600 border-red-200' };
        buttonConfig.text = 'Đã Hết Vé';
        buttonConfig.icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" /></svg>;
    } else if (isUpcomingSale) {
        statusBadge = { label: 'Sắp Mở Bán', cls: 'bg-blue-100 text-blue-600 border-blue-200' };
        buttonConfig.text = 'Sắp Mở Bán';
        buttonConfig.icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>;
    } else if (isSaleEnded) {
        statusBadge = { label: 'Đã Đóng Bán', cls: 'bg-gray-100 text-gray-500 border-gray-200' };
        buttonConfig.text = 'Đã Đóng Bán';
        buttonConfig.icon = <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>;
    }
 
    return (
        <>
            <Helmet>
                <title>{eventData.name} | Hệ Thống Bán Vé</title>
                <meta name="description" content={eventData.description || 'Mua vé tham gia sự kiện ngay hôm nay!'} />
                <link rel="canonical" href={currentUrl} />
                <meta property="og:title"       content={eventData.name} />
                <meta property="og:description" content={eventData.description} />
                <meta property="og:type"        content="website" />
                <meta property="og:url"         content={currentUrl} />
            </Helmet>
 
            <div className="min-h-screen bg-gray-50">
 
                {/* ── Hero Banner ── */}
                <div className="relative w-full h-72 md:h-80 bg-gradient-to-br from-purple-700 via-purple-600 to-orange-500 overflow-hidden">
                    {/* Decorative circles */}
                    <div className="absolute -top-20 -right-20 w-80 h-80 bg-white/10 rounded-full" />
                    <div className="absolute -bottom-16 -left-16 w-72 h-72 bg-white/10 rounded-full" />
                    <div className="absolute top-1/2 right-1/4 w-40 h-40 bg-orange-400/20 rounded-full -translate-y-1/2" />
 
                    {/* Back button */}
                    <div className="absolute top-5 left-4 md:left-8 z-10">
                        <button
                            onClick={() => navigate(-1)}
                            className="flex items-center gap-2 text-white/80 hover:text-white text-sm font-medium bg-white/10 hover:bg-white/20 backdrop-blur-sm px-4 py-2 rounded-full transition-all"
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            Quay lại
                        </button>
                    </div>
 
                    {/* Hero content */}
                    <div className="absolute bottom-8 left-4 md:left-8 right-4 md:right-8 z-10">
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border mb-3 ${statusBadge.cls}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${canBuy ? 'bg-green-500 animate-pulse' : 'bg-current'}`} />
                            {statusBadge.label}
                        </span>
                        <h1 className="text-white text-2xl md:text-4xl font-extrabold leading-tight drop-shadow-lg line-clamp-2">
                            {eventData.name}
                        </h1>
                    </div>
                </div>
 
                {/* ── Main Card – overlaps hero ── */}
                <div className="max-w-5xl mx-auto px-4 md:px-6 -mt-6 relative z-10 pb-16">
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
 
                        {/* ── Info Grid ── */}
                        <div className="p-6 md:p-8 border-b border-gray-100">
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                <InfoCard
                                    icon="📍"
                                    label="Địa điểm"
                                    value={eventData.location}
                                    accent="orange"
                                />
                                <InfoCard
                                    icon="⏰"
                                    label="Thời gian"
                                    value={`${new Date(eventData.startTime).toLocaleString('vi-VN')} – ${new Date(eventData.endTime).toLocaleString('vi-VN')}`}
                                    accent="purple"
                                />
                                <InfoCard
                                    icon="🎟️"
                                    label="Giá vé"
                                    value={`${eventData.basePrice.toLocaleString()} VNĐ`}
                                    accent="green"
                                />
                            </div>
                        </div>
 
                        {/* ── Description ── */}
                        <div className="p-6 md:p-8 border-b border-gray-100">
                            <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                                <span className="w-1 h-5 bg-gradient-to-b from-orange-500 to-purple-600 rounded-full inline-block" />
                                Giới thiệu sự kiện
                            </h2>
                            <div className="text-gray-600 leading-relaxed text-sm md:text-base whitespace-pre-line">
                                {eventData.description || 'Chưa có mô tả cho sự kiện này.'}
                            </div>
                        </div>
 
                        {/* ── CTA Footer ── */}
                        <div className="px-6 md:px-8 py-6 bg-gray-50/60 flex flex-col sm:flex-row items-center justify-between gap-4">
                            <div>
                                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Giá vé từ</p>
                                <p className="text-2xl font-extrabold text-gray-800">
                                    {eventData.basePrice.toLocaleString()}
                                    <span className="text-sm font-semibold text-gray-500 ml-1">VNĐ</span>
                                </p>
                            </div>
 
                            <button
                                disabled={!canBuy}
                                onClick={() => navigate(`/tickets/booking/${eventData.slug}/${eventData.id}`)}
                                className={`
                                    relative overflow-hidden px-10 py-3.5 rounded-xl font-bold text-base
                                    transition-all duration-200 shadow-lg focus:outline-none focus:ring-4
                                    ${canBuy
                                        ? 'bg-gradient-to-r from-orange-500 to-purple-600 text-white hover:from-orange-600 hover:to-purple-700 hover:scale-[1.03] focus:ring-orange-300 shadow-orange-200'
                                        : 'bg-gray-200 text-gray-400 cursor-not-allowed shadow-none'
                                    }
                                `}
                            >
                                <span className="flex items-center gap-2">
                                    {buttonConfig.icon}
                                    {buttonConfig.text}
                                </span>
                            </button>
                        </div>
 
                    </div>
                </div>
            </div>
        </>
    );
};
 
export default EventDetail;
 






