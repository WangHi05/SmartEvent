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
    <div className={`animate-pulse rounded-lg bg-slate-100 ${className}`} />
);

const LoadingSkeleton = () => (
    <div className="min-h-screen bg-slate-50/50">
        <div className="h-[320px] animate-pulse bg-slate-200 md:h-[400px]" />
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
    <div className="flex min-h-[screen] items-center justify-center bg-slate-50/50">
        <div className="max-w-sm px-6 text-center">
            <h2 className="mb-2 text-xl font-bold text-slate-800 tracking-tight">Sự kiện không tồn tại</h2>
            <p className="mb-6 text-sm text-slate-500">Sự kiện đã bị xóa hoặc không còn hoạt động.</p>
            <button
                onClick={onBack}
                className="rounded-xl bg-slate-900 px-6 py-2.5 text-sm font-bold text-white transition-colors hover:bg-slate-800"
            >
                Về trang chủ
            </button>
        </div>
    </div>
);

/* ─────────────── Status Badge MÀU NÓNG ─────────────── */
const StatusBadge = ({ label, type }) => {
    const styles = {
        active: 'border border-orange-200 bg-orange-50 text-orange-700',
        soldout: 'border border-slate-200 bg-slate-100 text-slate-500',
        upcoming: 'border border-blue-200 bg-blue-50 text-blue-700',
        closed: 'border border-slate-200 bg-slate-100 text-slate-400',
        ended: 'border border-slate-200 bg-slate-100 text-slate-400',
    };

    const dots = {
        active: 'bg-orange-500',
        soldout: 'bg-slate-400',
        upcoming: 'bg-blue-500',
        closed: 'bg-slate-400',
        ended: 'bg-slate-400',
    };

    return (
        <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-bold uppercase tracking-wider ${styles[type] || styles.closed}`}>
            <span className={`h-1.5 w-1.5 rounded-full ${dots[type] || dots.closed}`} />
            {label}
        </span>
    );
};

/* ─────────────── Info Card ─────────────── */
const InfoCard = ({ icon: Icon, label, value, sub }) => (
    <div className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-orange-600 shadow-inner">
            <Icon size={18} />
        </div>
        <div className="min-w-0">
          <p className="mb-1 text-[10px] font-extrabold uppercase tracking-widest text-slate-400">{label}</p>
          <p className="break-words text-sm font-bold leading-snug text-slate-800">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400 font-semibold">{sub}</p>}
        </div>
    </div>
);

const SectionHeading = ({ children }) => (
    <h2 className="mb-4 flex items-center gap-2.5 text-sm font-extrabold text-slate-800 uppercase tracking-wider">
        <span className="inline-block h-4 w-[3px] rounded-full bg-orange-600" />
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
                loading && setLoading(false);
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

            <div className="min-h-screen bg-slate-50/50">
                {/* ── Hero Banner ── */}
                <div className="relative h-[360px] w-full overflow-hidden md:h-[420px] bg-slate-950">
                    <div
                        className="absolute inset-0 bg-cover bg-center opacity-70"
                        style={{
                            backgroundImage: heroBackground ? `url('${heroBackground}')` : 'none',
                        }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-50/50 via-slate-950/20 to-transparent" />

                    <button
                        onClick={() => navigate(-1)}
                        className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-white backdrop-blur-sm transition-all hover:bg-white/20 md:left-8 md:top-6"
                    >
                        <ArrowLeft size={14} />
                        Quay lại
                    </button>

                    <div className="relative z-10 mx-auto flex h-full w-full max-w-[1200px] flex-col justify-end px-4 pb-10 md:px-8">
                        <div className="max-w-3xl space-y-3">
                            <div>
                                <StatusBadge label={badgeLabel} type={badgeType} />
                            </div>

                            <h1 className="line-clamp-2 text-2xl font-black leading-tight text-white md:text-4xl tracking-tight drop-shadow-md">
                                {eventData.name}
                            </h1>

                            <div className="flex flex-wrap gap-2 text-xs font-bold text-white/90">
                                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                                    <MapPin size={13} className="text-orange-300" />
                                    {eventData.location || ''}
                                </span>
                                <span className="flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 backdrop-blur-sm shadow-sm">
                                    <CalendarDays size={13} className="text-orange-300" />
                                    {formatDateTime(eventData.startTime)}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Main Layout ── */}
                <main className="relative z-10 mx-auto -mt-8 max-w-[1200px] px-4 pb-16 md:px-8">
                    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.35fr)_360px]">
                        
                        {/* Khối bên trái */}
                        <section className="space-y-5">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                                <SectionHeading>Giới thiệu sự kiện</SectionHeading>
                                <p className="whitespace-pre-line text-sm leading-7 text-slate-600 font-medium">
                                    {eventData.description || 'Chưa có mô tả cho sự kiện này.'}
                                </p>
                            </div>

                            <div className="grid gap-3 md:grid-cols-2">
                                <InfoCard icon={MapPin} label="Địa điểm" value={eventData.location || '—'} />
                                <InfoCard 
                                    icon={CalendarDays} 
                                    label="Thời gian" 
                                    value={formatDateTime(eventData.startTime)} 
                                    sub={`Kết thúc: ${formatDateTime(eventData.endTime)}`} 
                                />
                            </div>

                            {ticketTypes.length > 0 && (
                                <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                                    <div className="border-b border-slate-100 px-6 py-4.5 bg-slate-50/50">
                                        <SectionHeading>Loại vé mở bán</SectionHeading>
                                    </div>

                                    <div className="divide-y divide-slate-100 bg-white">
                                        {ticketTypes.map((t, i) => {
                                            const price = t.price ?? t.Price ?? 0;
                                            const rem = t.remainingQuantity ?? t.RemainingQuantity;
                                            const name = t.name ?? t.Name ?? `Vé #${i + 1}`;

                                            return (
                                                <div key={i} className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-slate-50/40">
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-800">{name}</p>
                                                        {rem !== undefined && (
                                                            <p className="mt-0.5 text-xs text-slate-400 font-semibold">Còn lại: {rem} vé</p>
                                                        )}
                                                    </div>
                                                    <p className="shrink-0 text-sm font-black text-slate-900 tracking-tight">
                                                        {price === 0 ? <span className="text-orange-600">Miễn phí</span> : `${price.toLocaleString('vi-VN')} ₫`}
                                                    </p>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </section>

                        {/* Khối đặt vé bên phải */}
                        <aside className="lg:sticky lg:top-24 lg:self-start">
                            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
                                <div>
                                    <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">Giá vé từ</p>
                                    <p className="text-2xl font-black text-slate-900 tracking-tight mt-0.5">
                                        {isFree ? <span className="text-orange-600">Miễn phí</span> : displayPrice}
                                    </p>
                                </div>

                                <div className="rounded-xl bg-slate-50 border border-slate-200/60 p-4 space-y-3">
                                    <div>
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Trạng thái</p>
                                        <div className="mt-1.5"><StatusBadge label={badgeLabel} type={badgeType} /></div>
                                    </div>
                                    <div className="border-t border-slate-200/60 pt-3">
                                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Thời gian diễn ra</p>
                                        <p className="mt-1 text-xs font-bold text-slate-700">{formatDateTime(eventData.startTime)}</p>
                                        <p className="text-[11px] text-slate-400 font-medium mt-0.5">Đến: {formatDateTime(eventData.endTime)}</p>
                                    </div>
                                </div>

                                <button
                                    disabled={!canBuy}
                                    onClick={() => canBuy && navigate(`/tickets/booking/${eventData.slug}/${eventData.id}`)}
                                    className={`flex h-11 w-full items-center justify-center gap-2 rounded-xl text-xs font-bold transition-all shadow-md ${
                                        canBuy
                                            ? 'bg-orange-600 text-white hover:bg-orange-500 shadow-orange-900/10'
                                            : 'cursor-not-allowed bg-slate-100 text-slate-400 border border-slate-200/60 shadow-none'
                                    }`}
                                >
                                    <ButtonIcon size={15} />
                                    {btnText}
                                    {canBuy && <ArrowRight size={14} className="opacity-80" />}
                                </button>
                                <p className="text-center text-[10px] text-slate-400 font-medium">Giá vé và trạng thái cập nhật thời gian thực.</p>
                            </div>
                        </aside>
                    </div>

                    {/* Lưu ý tham gia */}
                    <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                        <SectionHeading>Lưu ý khi tham gia</SectionHeading>
                        <ul className="grid gap-3.5 sm:grid-cols-2 text-xs font-bold text-slate-600">
                            <li className="flex gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-xl"><ClipboardList size={16} className="shrink-0 text-orange-500" /> <span>Vui lòng đến đúng giờ để check-in cổng an toàn.</span></li>
                            <li className="flex gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-xl"><Ticket size={16} className="shrink-0 text-orange-500" /> <span>Xuất trình mã QR kiểm soát (E-ticket) tại cổng soát vé AI.</span></li>
                            <li className="flex gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-xl"><Smartphone size={16} className="shrink-0 text-orange-500" /> <span>Quản lý danh sách vé đã mua trực tiếp trong mục "Vé của tôi".</span></li>
                            <li className="flex gap-3 bg-slate-50/50 border border-slate-100 p-3 rounded-xl"><Ban size={16} className="shrink-0 text-slate-400" /> <span>Vé không hỗ trợ hoàn trả sau khi đã quét mã soát vé thành công.</span></li>
                        </ul>
                    </section>

                    {/* Sự kiện liên quan */}
                    {relatedEvents.length > 0 && (
                        <section className="mt-6 space-y-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                            <SectionHeading>Sự kiện liên quan</SectionHeading>
                            <div className="grid gap-4 sm:grid-cols-2">
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
                                            onClick={() => navigate(eventSlug && eventId ? `/event/${eventSlug}/${eventId}` : `/event/su-kien/${eventId}`)}
                                            className="group flex w-full gap-4 rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 text-left transition-all hover:border-orange-400 hover:bg-white shadow-sm"
                                        >
                                            <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-100 bg-slate-100">
                                                {eventImage ? <img src={eventImage} alt={eventName} className="h-full w-full object-cover transition-transform group-hover:scale-102" /> : <div className="flex h-full w-full items-center justify-center text-slate-300"><Ticket size={20} /></div>}
                                            </div>
                                            <div className="min-w-0 flex-1 space-y-1">
                                                <p className="line-clamp-1 text-sm font-bold text-slate-800 group-hover:text-orange-600 transition-colors">{eventName}</p>
                                                <p className="flex items-center gap-1.5 text-xs text-slate-400 font-semibold"><MapPin size={12} /><span className="line-clamp-1">{eventLocation}</span></p>
                                                <p className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium"><CalendarDays size={12} />{formatDateTime(eventStartTime)}</p>
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