import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { message } from 'antd';
import { getEventPriceSummary } from '../components/customer/CustomerPrimitives';

const formatDateTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    });
};

/* ─────────────── Skeleton ─────────────── */
const Pulse = ({ className }) => (
    <div className={`animate-pulse rounded-lg bg-gray-100 ${className}`} />
);

const LoadingSkeleton = () => (
    <div className="min-h-screen bg-[#F7F6F3]">
        <div className="h-[380px] animate-pulse bg-gray-200 md:h-[500px] lg:h-[560px]" />
        <div className="relative z-10 mx-auto -mt-20 max-w-[1400px] px-4 pb-16 md:px-8 lg:px-10">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px]">
                <div className="space-y-5">
                    <div className="rounded-[24px] bg-white p-7 shadow-sm">
                        <Pulse className="h-7 w-1/2" />
                        <Pulse className="mt-5 h-4 w-full" />
                        <Pulse className="mt-3 h-4 w-5/6" />
                        <Pulse className="mt-3 h-4 w-4/6" />
                    </div>
                    <div className="grid gap-3 md:grid-cols-2">
                        <Pulse className="h-24" />
                        <Pulse className="h-24" />
                    </div>
                </div>
                <Pulse className="h-72 rounded-[24px]" />
            </div>
        </div>
    </div>
);

/* ─────────────── Not Found ─────────────── */
const NotFound = ({ onBack }) => (
    <div className="flex min-h-screen items-center justify-center bg-[#F7F6F3]">
        <div className="max-w-sm px-6 text-center">
            <div className="mb-6 text-6xl">🎭</div>
            <h2 className="mb-2 text-2xl font-semibold text-gray-800">Sự kiện không tồn tại</h2>
            <p className="mb-8 text-sm text-gray-500">Sự kiện đã bị xóa hoặc không còn hoạt động.</p>
            <button
                onClick={onBack}
                className="rounded-full bg-gray-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-700"
            >
                ← Về trang chủ
            </button>
        </div>
    </div>
);

/* ─────────────── Status Badge ─────────────── */
const StatusBadge = ({ label, type }) => {
    const styles = {
        active: 'border border-emerald-200 bg-emerald-50 text-emerald-700',
        soldout: 'border border-red-200 bg-red-50 text-red-600',
        upcoming: 'border border-blue-200 bg-blue-50 text-blue-700',
        closed: 'border border-gray-200 bg-gray-100 text-gray-500',
        ended: 'border border-gray-200 bg-gray-100 text-gray-500',
    };

    const dots = {
        active: 'bg-emerald-500 animate-pulse',
        soldout: 'bg-red-500',
        upcoming: 'bg-blue-500',
        closed: 'bg-gray-400',
        ended: 'bg-gray-400',
    };

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${styles[type] || styles.closed}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dots[type] || dots.closed}`} />
            {label}
        </span>
    );
};

/* ─────────────── Info Card ─────────────── */
const InfoCard = ({ emoji, label, value, sub }) => (
    <div className="flex gap-3 rounded-[20px] border border-gray-100 bg-white p-4 shadow-[0_8px_28px_rgba(15,23,42,0.05)] transition-colors hover:bg-gray-50">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#F7F6F3] text-lg leading-none">
            {emoji}
        </div>
        <div className="min-w-0">
            <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">{label}</p>
            <p className="break-words text-sm font-semibold leading-snug text-gray-800">{value}</p>
            {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
    </div>
);

/* ─────────────── Main Component ─────────────── */
const EventDetail = () => {
    const { slug, id } = useParams();
    const navigate = useNavigate();
    const [eventData, setEventData] = useState(null);
    const [ticketTypes, setTicketTypes] = useState([]);
    const [relatedEvents, setRelatedEvents] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchEventDetail = async () => {
            try {
                const [eventRes, ticketRes, relatedRes] = await Promise.all([
                    axiosClient.get(`/events/${id}`),
                    axiosClient.get(`/events/${id}/ticket-types`),
                    axiosClient.get('/events/search', {
                        params: {
                            pageNumber: 1,
                            pageSize: 24,
                            keyword: '',
                        },
                    }),
                ]);

                const data = eventRes.data || eventRes;
                if (data.slug && data.slug !== slug) {
                    navigate(`/event/${data.slug}/${id}`, { replace: true });
                    return;
                }
                setEventData(data);

                const ticketData = ticketRes.data || ticketRes;
                const tickets = ticketData?.data || ticketData?.items || ticketData || [];
                const normalized = Array.isArray(tickets) ? tickets : tickets.items || [];
                setTicketTypes(normalized);

                const relatedPayload = relatedRes.data || relatedRes;
                const relatedList =
                    relatedPayload?.items ||
                    relatedPayload?.data?.items ||
                    relatedPayload?.data ||
                    relatedPayload ||
                    [];

                const currentId = data.id || data.Id || id;

                const randomRelated = Array.isArray(relatedList)
                    ? relatedList
                        .filter((event) => {
                            const eventId = event.id || event.Id;
                            return eventId && eventId !== currentId;
                        })
                        .sort(() => Math.random() - 0.5)
                        .slice(0, 4)
                    : [];

                setRelatedEvents(randomRelated);
            } catch (error) {
                console.error('Lỗi lấy dữ liệu sự kiện:', error);
                message.error('Không tìm thấy sự kiện hoặc sự kiện đã bị xóa.');
            } finally {
                setLoading(false);
            }
        };

        fetchEventDetail();
    }, [id, slug, navigate]);

    if (loading) return <LoadingSkeleton />;
    if (!eventData) return <NotFound onBack={() => navigate('/')} />;

    const now = new Date();
    const eventEnd = new Date(eventData.endTime);

    const isEventCancelledOrDraft = eventData.status === 0 || eventData.status === 4;
    const isEventEnded = now > eventEnd;

    let hasActiveSale = false;
    let isUpcomingSale = false;
    let isSaleEnded = false;
    let isAllSoldOut = !!eventData.isFull;

    if (ticketTypes.length > 0) {
        const activeTickets = ticketTypes.filter(t => t.isActive ?? t.IsActive ?? true);

        if (activeTickets.length > 0) {
            hasActiveSale = activeTickets.some(t => {
                const ss = new Date(t.saleStartTime ?? t.SaleStartTime);
                const se = new Date(t.saleEndTime ?? t.SaleEndTime);
                const rem = t.remainingQuantity ?? t.RemainingQuantity ?? 0;

                return now >= ss && now <= se && rem > 0;
            });

            if (!hasActiveSale) {
                isUpcomingSale = activeTickets.every(t => now < new Date(t.saleStartTime ?? t.SaleStartTime));
                isSaleEnded = activeTickets.every(t => now > new Date(t.saleEndTime ?? t.SaleEndTime));
                isAllSoldOut = activeTickets.every(t => (t.remainingQuantity ?? t.RemainingQuantity ?? 0) <= 0);
            }
        }
    } else {
        hasActiveSale = !isAllSoldOut && !isEventCancelledOrDraft && !isEventEnded;
    }

    const canBuy = hasActiveSale && !isEventCancelledOrDraft && !isEventEnded;

    let badgeType = 'active';
    let badgeLabel = 'Đang Mở Bán';
    let btnText = 'Mua Vé Ngay';
    let btnIcon = '🎟️';

    if (isEventCancelledOrDraft || isEventEnded) {
        badgeType = isEventEnded ? 'ended' : 'closed';
        badgeLabel = isEventEnded ? 'Đã Kết Thúc' : 'Đã Khóa';
        btnText = badgeLabel;
        btnIcon = '🔒';
    } else if (isAllSoldOut) {
        badgeType = 'soldout';
        badgeLabel = 'Hết Vé';
        btnText = 'Đã Hết Vé';
        btnIcon = '❌';
    } else if (isUpcomingSale) {
        badgeType = 'upcoming';
        badgeLabel = 'Sắp Mở Bán';
        btnText = 'Sắp Mở Bán';
        btnIcon = '📅';
    } else if (isSaleEnded) {
        badgeType = 'closed';
        badgeLabel = 'Đã Đóng Bán';
        btnText = 'Đã Đóng Bán';
        btnIcon = '🔒';
    }

    const priceSummary = getEventPriceSummary(eventData, ticketTypes);
    const displayPrice = priceSummary.text;
    const isFree = priceSummary.value === 0 || displayPrice === 'Miễn phí';

    const currentUrl = window.location.href;
    const heroBackground = eventData.bannerUrl || eventData.imageUrl;

    return (
        <>
            <Helmet>
                <title>{eventData.name} | Hệ Thống Bán Vé</title>
                <meta name="description" content={eventData.description || 'Mua vé tham gia sự kiện ngay hôm nay!'} />
                <link rel="canonical" href={currentUrl} />
                <meta property="og:title" content={eventData.name} />
                <meta property="og:description" content={eventData.description} />
                <meta property="og:url" content={currentUrl} />
            </Helmet>

            <div className="min-h-screen bg-[#F7F6F3]" style={{ fontFamily: "'DM Sans', 'Be Vietnam Pro', sans-serif" }}>
                {/* ── Hero ── */}
                <div className="relative h-[580px] w-full overflow-hidden md:h-[700px] lg:h-[760px]">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: heroBackground
                                ? `url('${heroBackground}')`
                                : 'linear-gradient(to bottom right, #1a0533, #2d1060, #6b21a8)',
                            backgroundPosition: 'center center',
                        }}
                    />

                    <div className="absolute inset-0 bg-black/35" />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#F7F6F3] via-black/10 to-black/10" />

                    {!heroBackground && (
                        <>
                            <div
                                className="absolute inset-0 opacity-30"
                                style={{
                                    backgroundImage:
                                        'radial-gradient(ellipse at 70% 20%, #f97316 0%, transparent 55%), radial-gradient(ellipse at 20% 80%, #a855f7 0%, transparent 50%)'
                                }}
                            />
                            <div
                                className="absolute inset-0 opacity-[0.04]"
                                style={{
                                    backgroundImage:
                                        "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")"
                                }}
                            />
                            <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full border border-white/10" />
                            <div className="absolute right-10 top-10 h-40 w-40 rounded-full border border-white/5" />
                        </>
                    )}

                    <button
                        onClick={() => navigate(-1)}
                        className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-sm font-medium text-white/80 backdrop-blur-md transition-all hover:bg-white/15 hover:text-white md:left-8 md:top-6"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                        </svg>
                        Quay lại
                    </button>

                    <div className="relative z-10 mx-auto flex h-full w-full max-w-[1400px] flex-col justify-end px-4 pb-10 md:px-8 lg:px-10">
                        <div className="max-w-4xl">
                            <div className="mb-3">
                                <StatusBadge label={badgeLabel} type={badgeType} />
                            </div>

                            <h1
                                className="line-clamp-2 max-w-4xl text-2xl font-bold leading-tight tracking-tight text-white md:text-4xl lg:text-5xl"
                                style={{ textShadow: '0 2px 20px rgba(0,0,0,0.4)' }}
                            >
                                {eventData.name}
                            </h1>

                            <div className="mt-4 flex flex-wrap gap-2 text-sm text-white/85">
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur">
                                    📍 {eventData.location || 'Đang cập nhật'}
                                </span>
                                <span className="rounded-full border border-white/10 bg-white/10 px-3 py-1 backdrop-blur">
                                    🗓 {formatDateTime(eventData.startTime)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Layout ── */}
                <main className="relative z-10 mx-auto -mt-20 max-w-[1400px] px-4 pb-16 md:px-8 lg:px-10">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_380px] xl:grid-cols-[minmax(0,1.4fr)_400px]">
                        {/* Left content */}
                        <section className="space-y-5">
                            <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_8px_36px_rgba(15,23,42,0.08)] md:p-7">
                                <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-gray-800">
                                    <span className="inline-block h-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 to-purple-600" />
                                    Giới thiệu sự kiện
                                </h2>

                                <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                                    {eventData.description || 'Chưa có mô tả cho sự kiện này.'}
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <InfoCard
                                    emoji="📍"
                                    label="Địa điểm"
                                    value={eventData.location || '—'}
                                />
                                <InfoCard
                                    emoji="🗓"
                                    label="Thời gian"
                                    value={formatDateTime(eventData.startTime)}
                                    sub={`Kết thúc: ${formatDateTime(eventData.endTime)}`}
                                />
                            </div>

                            {ticketTypes.length > 0 && (
                                <div className="overflow-hidden rounded-[24px] border border-gray-100 bg-white shadow-[0_8px_36px_rgba(15,23,42,0.06)]">
                                    <div className="border-b border-gray-100 px-6 py-5 md:px-7">
                                        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-800">
                                            <span className="inline-block h-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 to-purple-600" />
                                            Loại vé
                                        </h2>
                                    </div>

                                    <div className="divide-y divide-gray-50">
                                        {ticketTypes.map((t, i) => {
                                            const price = t.price ?? t.Price ?? 0;
                                            const rem = t.remainingQuantity ?? t.RemainingQuantity;
                                            const name = t.name ?? t.Name ?? `Vé #${i + 1}`;

                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-gray-50/70 md:px-7"
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{name}</p>
                                                        {rem !== undefined && (
                                                            <p className="mt-0.5 text-xs text-gray-400">Còn lại: {rem} vé</p>
                                                        )}
                                                    </div>

                                                    <p className="shrink-0 text-sm font-bold text-gray-900">
                                                        {price === 0 ? (
                                                            <span className="text-emerald-600">Miễn phí</span>
                                                        ) : (
                                                            `${price.toLocaleString('vi-VN')} ₫`
                                                        )}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Right booking card */}
                        <aside className="lg:sticky lg:top-6 lg:self-start">
                            <div className="rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_12px_44px_rgba(15,23,42,0.10)]">
                                <p className="mb-1 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                    Giá vé từ
                                </p>

                                <p className="text-2xl font-bold tracking-tight text-gray-900">
                                    {isFree ? (
                                        <span className="text-emerald-600">Miễn phí</span>
                                    ) : (
                                        displayPrice
                                    )}
                                </p>

                                <div className="mt-4 rounded-2xl bg-[#F7F6F3] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                                        Trạng thái
                                    </p>
                                    <div className="mt-2">
                                        <StatusBadge label={badgeLabel} type={badgeType} />
                                    </div>
                                </div>

                                <div className="mt-4 rounded-2xl bg-[#F7F6F3] p-4">
                                    <p className="text-xs font-semibold uppercase tracking-widest text-gray-400">
                                        Thời gian
                                    </p>
                                    <p className="mt-2 text-sm font-semibold leading-6 text-gray-800">
                                        {formatDateTime(eventData.startTime)}
                                    </p>
                                    <p className="mt-1 text-xs text-gray-400">
                                        Kết thúc: {formatDateTime(eventData.endTime)}
                                    </p>
                                </div>

                                <button
                                    disabled={!canBuy}
                                    onClick={() => canBuy && navigate(`/tickets/booking/${eventData.slug}/${eventData.id}`)}
                                    className={`
                                        mt-5 flex h-12 w-full items-center justify-center gap-2.5 rounded-2xl text-sm font-semibold
                                        transition-all duration-200 focus:outline-none focus:ring-4
                                        ${canBuy
                                            ? 'bg-gray-900 text-white shadow-sm hover:scale-[1.01] hover:bg-gray-700 focus:ring-gray-200'
                                            : 'cursor-not-allowed bg-gray-100 text-gray-400'
                                        }
                                    `}
                                >
                                    <span className="text-base leading-none">{btnIcon}</span>
                                    {btnText}
                                    {canBuy && <span className="opacity-60">→</span>}
                                </button>

                                <p className="mt-3 text-center text-xs text-gray-400">
                                    Giá vé và trạng thái được cập nhật theo cấu hình hiện tại.
                                </p>
                            </div>
                        </aside>
                    </div>

                    {/* Notes when participating */}
                    <section className="mt-6 space-y-3 rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_8px_36px_rgba(15,23,42,0.06)] md:p-7">
                        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-800">
                            <span className="inline-block h-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 to-purple-600" />
                            Lưu ý khi tham gia
                        </h2>

                        <ul className="space-y-3 text-sm leading-6 text-gray-600">
                            <li className="flex gap-3">
                                <span className="shrink-0 text-lg leading-none">📋</span>
                                <span>Vui lòng đến sự kiện đúng giờ để tham gia và nhận vé</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="shrink-0 text-lg leading-none">🎫</span>
                                <span>Mang theo vé điện tử hoặc ID để nhập cảnh tham dự</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="shrink-0 text-lg leading-none">📱</span>
                                <span>Bạn sẽ nhận được thông tin sự kiện trong mục "Vé của tôi"</span>
                            </li>
                            <li className="flex gap-3">
                                <span className="shrink-0 text-lg leading-none">🚫</span>
                                <span>Vé không hoàn lại tiền đối với trường hợp vé đã check-in</span>
                            </li>
                        </ul>
                    </section>

                    {/* Ticket information */}
                    <section className="mt-6 space-y-3 rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_8px_36px_rgba(15,23,42,0.06)] md:p-7">
                        <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-800">
                            <span className="inline-block h-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 to-purple-600" />
                            Thông tin vé
                        </h2>

                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3.5">
                                <span className="font-semibold text-gray-700">Hình thức vé:</span>
                                <span>Vé điện tử (E-ticket)</span>
                            </div>
                            <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3.5">
                                <span className="font-semibold text-gray-700">Gửi vé:</span>
                                <span>Trong vé của bạn sau khi đặt hàng</span>
                            </div>
                            <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3.5">
                                <span className="font-semibold text-gray-700">Điều khoản:</span>
                                <span>Không chuyển nhượng, không đưa cho người khác</span>
                            </div>
                        </div>
                    </section>

                    {/* Related events */}
                    {relatedEvents.length > 0 && (
                        <section className="mt-6 space-y-4 rounded-[24px] border border-gray-100 bg-white p-6 shadow-[0_8px_36px_rgba(15,23,42,0.06)] md:p-7">
                            <h2 className="flex items-center gap-2.5 text-base font-semibold text-gray-800">
                                <span className="inline-block h-5 w-[3px] rounded-full bg-gradient-to-b from-orange-400 to-purple-600" />
                                Sự kiện liên quan
                            </h2>

                            <div className="grid gap-4 md:grid-cols-2">
                                {relatedEvents.map((event) => {
                                    const eventId = event.id || event.Id;
                                    const eventSlug = event.slug || event.Slug;
                                    const eventName = event.name || event.Name || 'Sự kiện';
                                    const eventLocation = event.location || event.Location || 'Đang cập nhật';
                                    const eventStartTime = event.startTime || event.StartTime;
                                    const eventImage = event.imageUrl || event.ImageUrl || event.bannerUrl || event.BannerUrl;

                                    return (
                                        <button
                                            key={eventId}
                                            type="button"
                                            onClick={() => {
                                                if (eventSlug && eventId) {
                                                    navigate(`/event/${eventSlug}/${eventId}`);
                                                } else if (eventId) {
                                                    navigate(`/event/su-kien/${eventId}`);
                                                }
                                            }}
                                            className="group flex w-full gap-3 rounded-2xl bg-gray-50 p-4 text-left transition hover:-translate-y-0.5 hover:bg-gray-100"
                                        >
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-2xl bg-gradient-to-br from-orange-100 to-purple-100">
                                                {eventImage ? (
                                                    <img
                                                        src={eventImage}
                                                        alt={eventName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-xl">
                                                        🎫
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-1 text-sm font-semibold text-gray-800 group-hover:text-purple-700">
                                                    {eventName}
                                                </p>

                                                <p className="mt-1 line-clamp-1 text-xs text-gray-500">
                                                    📍 {eventLocation}
                                                </p>

                                                <p className="mt-1 text-xs text-gray-400">
                                                    🗓 {formatDateTime(eventStartTime)}
                                                </p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    )}
                </main>
            </div>
        </>
    );
};

export default EventDetail;