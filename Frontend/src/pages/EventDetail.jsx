import React, { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useParams, useNavigate } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import { message } from 'antd';
import {
  MapPin,
  CalendarDays,
  Ticket,
  ArrowLeft,
  ArrowRight,
  ClipboardList,
  Smartphone,
  Ban,
  Info,
  Lock,
  Clock,
} from 'lucide-react';
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
    <div className="min-h-screen bg-gray-50">
        <div className="h-[320px] animate-pulse bg-gray-200 md:h-[400px]" />
        <div className="relative z-10 mx-auto -mt-14 max-w-[1200px] px-4 pb-16 md:px-8">
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
                <div className="space-y-5">
                    <div className="rounded-xl bg-white p-6 shadow-sm">
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
                <Pulse className="h-64 rounded-xl" />
            </div>
        </div>
    </div>
);

/* ─────────────── Not Found ─────────────── */
const NotFound = ({ onBack }) => (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="max-w-sm px-6 text-center">
            <h2 className="mb-2 text-xl font-semibold text-gray-800">Sự kiện không tồn tại</h2>
            <p className="mb-6 text-sm text-gray-500">Sự kiện đã bị xóa hoặc không còn hoạt động.</p>
            <button
                onClick={onBack}
                className="rounded-lg bg-gray-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-gray-800"
            >
                Về trang chủ
            </button>
        </div>
    </div>
);

/* ─────────────── Status Badge ─────────────── */
const StatusBadge = ({ label, type }) => {
    const styles = {
        active: 'border border-green-200 bg-green-50 text-green-700',
        soldout: 'border border-red-200 bg-red-50 text-red-600',
        upcoming: 'border border-blue-200 bg-blue-50 text-blue-700',
        closed: 'border border-gray-200 bg-gray-100 text-gray-500',
        ended: 'border border-gray-200 bg-gray-100 text-gray-500',
    };

    const dots = {
        active: 'bg-green-500',
        soldout: 'bg-red-500',
        upcoming: 'bg-blue-500',
        closed: 'bg-gray-400',
        ended: 'bg-gray-400',
    };

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold ${styles[type] || styles.closed}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dots[type] || dots.closed}`} />
            {label}
        </span>
    );
};

/* ─────────────── Info Card ─────────────── */
const InfoCard = ({ icon: Icon, label, value, sub }) => (
    <div className="flex gap-3 rounded-xl border border-gray-200 bg-white p-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
            <Icon size={17} />
        </div>
        <div className="min-w-0">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label}</p>
            <p className="break-words text-sm font-semibold leading-snug text-gray-800">{value}</p>
            {sub && <p className="mt-1 text-xs text-gray-400">{sub}</p>}
        </div>
    </div>
);

const SectionHeading = ({ children }) => (
    <h2 className="mb-4 flex items-center gap-2.5 text-base font-semibold text-gray-800">
        <span className="inline-block h-5 w-[3px] rounded-full bg-green-600" />
        {children}
    </h2>
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
    let ButtonIcon = Ticket;

    if (isEventCancelledOrDraft || isEventEnded) {
        badgeType = isEventEnded ? 'ended' : 'closed';
        badgeLabel = isEventEnded ? 'Đã Kết Thúc' : 'Đã Khóa';
        btnText = badgeLabel;
        ButtonIcon = Lock;
    } else if (isAllSoldOut) {
        badgeType = 'soldout';
        badgeLabel = 'Hết Vé';
        btnText = 'Đã Hết Vé';
        ButtonIcon = Ban;
    } else if (isUpcomingSale) {
        badgeType = 'upcoming';
        badgeLabel = 'Sắp Mở Bán';
        btnText = 'Sắp Mở Bán';
        ButtonIcon = Clock;
    } else if (isSaleEnded) {
        badgeType = 'closed';
        badgeLabel = 'Đã Đóng Bán';
        btnText = 'Đã Đóng Bán';
        ButtonIcon = Lock;
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

            <div className="min-h-screen bg-gray-50">
                {/* ── Hero ── */}
                <div className="relative h-[360px] w-full overflow-hidden md:h-[420px]">
                    <div
                        className="absolute inset-0 bg-cover bg-center"
                        style={{
                            backgroundImage: heroBackground
                                ? `url('${heroBackground}')`
                                : 'none',
                            backgroundColor: heroBackground ? undefined : '#0F172A',
                            backgroundPosition: 'center center',
                        }}
                    />

                    <div className="absolute inset-0 bg-black/40" />
                    <div className="absolute inset-0 bg-gradient-to-t from-gray-50 via-black/10 to-transparent" />

                    <button
                        onClick={() => navigate(-1)}
                        className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-3.5 py-2 text-sm font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/20 md:left-8 md:top-6"
                    >
                        <ArrowLeft size={15} />
                        Quay lại
                    </button>

                    <div className="relative z-10 mx-auto flex h-full w-full max-w-[1200px] flex-col justify-end px-4 pb-8 md:px-8">
                        <div className="max-w-3xl">
                            <div className="mb-3">
                                <StatusBadge label={badgeLabel} type={badgeType} />
                            </div>

                            <h1 className="line-clamp-2 text-2xl font-bold leading-tight text-white md:text-3xl">
                                {eventData.name}
                            </h1>

                            <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/90">
                                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                                    <MapPin size={13} />
                                    {eventData.location || ''}
                                </span>
                                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1">
                                    <CalendarDays size={13} />
                                    {formatDateTime(eventData.startTime)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Layout ── */}
                <main className="relative z-10 mx-auto -mt-10 max-w-[1200px] px-4 pb-16 md:px-8">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
                        {/* Left content */}
                        <section className="space-y-5">
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <SectionHeading>Giới thiệu sự kiện</SectionHeading>
                                <p className="whitespace-pre-line text-sm leading-7 text-gray-600">
                                    {eventData.description || 'Chưa có mô tả cho sự kiện này.'}
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <InfoCard
                                    icon={MapPin}
                                    label="Địa điểm"
                                    value={eventData.location || '—'}
                                />
                                <InfoCard
                                    icon={CalendarDays}
                                    label="Thời gian"
                                    value={formatDateTime(eventData.startTime)}
                                    sub={`Kết thúc: ${formatDateTime(eventData.endTime)}`}
                                />
                            </div>

                            {ticketTypes.length > 0 && (
                                <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                                    <div className="border-b border-gray-100 px-6 py-5">
                                        <SectionHeading>Loại vé</SectionHeading>
                                    </div>

                                    <div className="divide-y divide-gray-100">
                                        {ticketTypes.map((t, i) => {
                                            const price = t.price ?? t.Price ?? 0;
                                            const rem = t.remainingQuantity ?? t.RemainingQuantity;
                                            const name = t.name ?? t.Name ?? `Vé #${i + 1}`;

                                            return (
                                                <div
                                                    key={i}
                                                    className="flex items-center justify-between gap-4 px-6 py-4"
                                                >
                                                    <div>
                                                        <p className="text-sm font-semibold text-gray-800">{name}</p>
                                                        {rem !== undefined && (
                                                            <p className="mt-0.5 text-xs text-gray-400">Còn lại: {rem} vé</p>
                                                        )}
                                                    </div>

                                                    <p className="shrink-0 text-sm font-bold text-gray-900">
                                                        {price === 0 ? (
                                                            <span className="text-green-600">Miễn phí</span>
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
                            <div className="rounded-xl border border-gray-200 bg-white p-6">
                                <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-gray-400">
                                    Giá vé từ
                                </p>

                                <p className="text-2xl font-bold text-gray-900">
                                    {isFree ? (
                                        <span className="text-green-600">Miễn phí</span>
                                    ) : (
                                        displayPrice
                                    )}
                                </p>

                                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                        Trạng thái
                                    </p>
                                    <div className="mt-2">
                                        <StatusBadge label={badgeLabel} type={badgeType} />
                                    </div>
                                </div>

                                <div className="mt-4 rounded-lg bg-gray-50 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">
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
                                        mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg text-sm font-semibold
                                        transition-colors duration-150
                                        ${canBuy
                                            ? 'bg-green-600 text-white hover:bg-green-700'
                                            : 'cursor-not-allowed bg-gray-100 text-gray-400'
                                        }
                                    `}
                                >
                                    <ButtonIcon size={16} />
                                    {btnText}
                                    {canBuy && <ArrowRight size={15} className="opacity-70" />}
                                </button>

                                <p className="mt-3 text-center text-xs text-gray-400">
                                    Giá vé và trạng thái được cập nhật theo cấu hình hiện tại.
                                </p>
                            </div>
                        </aside>
                    </div>

                    {/* Notes when participating */}
                    <section className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-6">
                        <SectionHeading>Lưu ý khi tham gia</SectionHeading>

                        <ul className="space-y-3 text-sm leading-6 text-gray-600">
                            <li className="flex gap-3">
                                <ClipboardList size={17} className="mt-0.5 shrink-0 text-gray-400" />
                                <span>Vui lòng đến sự kiện đúng giờ để tham gia và nhận vé</span>
                            </li>
                            <li className="flex gap-3">
                                <Ticket size={17} className="mt-0.5 shrink-0 text-gray-400" />
                                <span>Mang theo vé điện tử hoặc ID để nhập cảnh tham dự</span>
                            </li>
                            <li className="flex gap-3">
                                <Smartphone size={17} className="mt-0.5 shrink-0 text-gray-400" />
                                <span>Bạn sẽ nhận được thông tin sự kiện trong mục "Vé của tôi"</span>
                            </li>
                            <li className="flex gap-3">
                                <Ban size={17} className="mt-0.5 shrink-0 text-gray-400" />
                                <span>Vé không hoàn lại tiền đối với trường hợp vé đã check-in</span>
                            </li>
                        </ul>
                    </section>

                    {/* Ticket information */}
                    <section className="mt-6 space-y-3 rounded-xl border border-gray-200 bg-white p-6">
                        <SectionHeading>Thông tin vé</SectionHeading>

                        <div className="space-y-3 text-sm text-gray-600">
                            <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3.5">
                                <span className="font-semibold text-gray-700">Hình thức vé:</span>
                                <span>Vé điện tử (E-ticket)</span>
                            </div>
                            <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3.5">
                                <span className="font-semibold text-gray-700">Gửi vé:</span>
                                <span>Trong mục vé của bạn sau khi đặt hàng</span>
                            </div>
                            <div className="flex items-start justify-between gap-3 rounded-lg bg-gray-50 p-3.5">
                                <span className="font-semibold text-gray-700">Điều khoản:</span>
                                <span>Không chuyển nhượng, không đưa cho người khác</span>
                            </div>
                        </div>
                    </section>

                    {/* Related events */}
                    {relatedEvents.length > 0 && (
                        <section className="mt-6 space-y-4 rounded-xl border border-gray-200 bg-white p-6">
                            <SectionHeading>Sự kiện liên quan</SectionHeading>

                            <div className="grid gap-4 md:grid-cols-2">
                                {relatedEvents.map((event) => {
                                    const eventId = event.id || event.Id;
                                    const eventSlug = event.slug || event.Slug;
                                    const eventName = event.name || event.Name || 'Sự kiện';
                                    const eventLocation = event.location || event.Location || '';
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
                                            className="group flex w-full gap-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-left transition hover:border-green-300 hover:bg-white"
                                        >
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-lg bg-gray-200">
                                                {eventImage ? (
                                                    <img
                                                        src={eventImage}
                                                        alt={eventName}
                                                        className="h-full w-full object-cover"
                                                    />
                                                ) : (
                                                    <div className="flex h-full w-full items-center justify-center text-gray-400">
                                                        <Ticket size={20} />
                                                    </div>
                                                )}
                                            </div>

                                            <div className="min-w-0 flex-1">
                                                <p className="line-clamp-1 text-sm font-semibold text-gray-800 group-hover:text-green-700">
                                                    {eventName}
                                                </p>

                                                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                                                    <MapPin size={12} />
                                                    <span className="line-clamp-1">{eventLocation}</span>
                                                </p>

                                                <p className="mt-1 flex items-center gap-1.5 text-xs text-gray-400">
                                                    <CalendarDays size={12} />
                                                    {formatDateTime(eventStartTime)}
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