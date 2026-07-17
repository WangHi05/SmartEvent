import React from 'react';
import dayjs from 'dayjs';
import { Button, Progress } from 'antd';
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  TrendingUp
} from 'lucide-react';
import { formatVietnamDateRange } from '../../utils/vietnamTime';

export const EVENT_CATEGORIES = [
  { label: 'Tất cả', value: 'all' },
  { label: 'Nhạc sống', value: 'Nhạc sống' },
  { label: 'Hội thảo', value: 'Hội thảo' },
  { label: 'Thể thao', value: 'Thể thao' },
  { label: 'Triển lãm', value: 'Triển lãm' },
  { label: 'Workshop', value: 'Workshop' },
  { label: 'Công nghệ', value: 'Công nghệ' },
  { label: 'Khác', value: 'Khác' }
];

const CATEGORY_MATCHERS = [
  { label: 'Nhạc sống', terms: ['concert', 'music', 'show', 'live', 'hòa nhạc', 'ca nhạc', 'festival'] },
  { label: 'Hội thảo', terms: ['hội thảo', 'seminar', 'conference', 'talk', 'forum'] },
  { label: 'Thể thao', terms: ['sport', 'thể thao', 'match', 'game', 'cup', 'giải đấu'] },
  { label: 'Triển lãm', terms: ['triển lãm', 'expo', 'exhibition', 'fair'] },
  { label: 'Workshop', terms: ['workshop', 'hands-on', 'training', 'bootcamp'] },
  { label: 'Công nghệ', terms: ['tech', 'công nghệ', 'ai', 'startup', 'it', 'developer'] }
];

const normalizeText = (value) => (value || '').toString().toLowerCase();

export const deriveEventCategory = (event) => {
  const haystack = normalizeText(
    `${event?.categoryName || ''} ${event?.name || ''} ${event?.description || ''}`
  );

  const match = CATEGORY_MATCHERS.find((item) =>
    item.terms.some((term) => haystack.includes(term))
  );

  return match?.label || 'Khác';
};

export const getEventStatusMeta = (event) => {
  const now = dayjs().valueOf();
  const start = dayjs(event?.startTime);
  const end = dayjs(event?.endTime);

  if (!start.isValid() || !end.isValid()) {
    return { label: 'Sắp diễn ra', color: 'blue', key: 'upcoming' };
  }

  const startValue = start.valueOf();
  const endValue = end.valueOf();

  if (now < startValue) {
    return { label: 'Sắp diễn ra', color: 'blue', key: 'upcoming' };
  }

  if (now >= startValue && now <= endValue) {
    return { label: 'Đang diễn ra', color: 'orange', key: 'live' };
  }

  return { label: 'Đã diễn ra', color: 'default', key: 'ended' };
};

export const formatCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Liên hệ';
  }

  return `${Number(value).toLocaleString('vi-VN')}đ`;
};

export const formatDateRange = (startTime, endTime) => {
  return formatVietnamDateRange(startTime, endTime);
};

export const getCapacityPercent = (event) => {
  const maxCapacity = Number(event?.maxCapacity || 0);
  const currentOccupancy = Number(event?.currentOccupancy || event?.currentSeatsSold || event?.seatsSold || event?.soldCount || 0);

  if (!maxCapacity) {
    return 0;
  }

  return Math.min(100, Math.round((currentOccupancy / maxCapacity) * 100));
};

export const formatCapacityLabel = (event) => {
  const currentOccupancy = Number(event?.currentOccupancy || event?.currentSeatsSold || event?.seatsSold || event?.soldCount || 0);
  const maxCapacity = Number(event?.maxCapacity || 0);

  return `${currentOccupancy.toLocaleString('vi-VN')} / ${maxCapacity.toLocaleString('vi-VN')} chỗ`;
};

const getEventTicketTypes = (event, ticketTypes) => {
  if (Array.isArray(ticketTypes) && ticketTypes.length > 0) {
    return ticketTypes;
  }

  if (Array.isArray(event?.ticketTypes) && event.ticketTypes.length > 0) {
    return event.ticketTypes;
  }

  if (Array.isArray(event?.TicketTypes) && event.TicketTypes.length > 0) {
    return event.TicketTypes;
  }

  return [];
};

const getTicketRemainingQuantity = (ticketType) => {
  const remainingQuantity = Number(ticketType?.remainingQuantity ?? ticketType?.RemainingQuantity ?? 0);
  const remainingCapacity = Number(ticketType?.remainingCapacity ?? ticketType?.RemainingCapacity ?? 0);

  return Math.max(remainingQuantity, remainingCapacity);
};

export const formatVndCurrency = (value) => {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'Liên hệ';
  }

  return formatCurrency(value);
};

export const getEventPriceSummary = (event, ticketTypes) => {
  const tickets = getEventTicketTypes(event, ticketTypes);

  if (tickets.length === 0) {
    const fallbackPrice = Number(event?.basePrice ?? event?.price ?? event?.ticketPrice);

    if (Number.isFinite(fallbackPrice) && fallbackPrice > 0) {
      return {
        type: 'price',
        text: `Từ ${formatVndCurrency(fallbackPrice)}`,
        value: fallbackPrice
      };
    }

    return { type: 'updating', text: '', value: null };
  }

  const now = dayjs();
  let minPrice = Number.POSITIVE_INFINITY;
  let hasUpcoming = false;
  let hasEnded = false;
  let hasSoldOut = false;

  tickets.forEach((ticketType) => {
    const isActive = ticketType?.isActive ?? ticketType?.IsActive ?? true;
    const saleStartTime = dayjs(ticketType?.saleStartTime ?? ticketType?.SaleStartTime);
    const saleEndTime = dayjs(ticketType?.saleEndTime ?? ticketType?.SaleEndTime);
    const remainingQuantity = getTicketRemainingQuantity(ticketType);
    const price = Number(ticketType?.price ?? ticketType?.Price ?? 0);

    if (!isActive) {
      hasEnded = true;
      return;
    }

    if (saleStartTime.isValid() && now.isBefore(saleStartTime)) {
      hasUpcoming = true;
      return;
    }

    if (saleEndTime.isValid() && now.isAfter(saleEndTime)) {
      hasEnded = true;
      return;
    }

    if (!(remainingQuantity > 0)) {
      hasSoldOut = true;
      return;
    }

    minPrice = Math.min(minPrice, price);
  });

  if (Number.isFinite(minPrice)) {
    return {
      type: 'price',
      text: `Từ ${formatVndCurrency(minPrice)}`,
      value: minPrice
    };
  }

  if (hasUpcoming) {
    return { type: 'upcoming', text: 'Chưa mở bán', value: null };
  }

  if (hasSoldOut) {
    return { type: 'soldout', text: 'Hết vé', value: null };
  }

  if (hasEnded) {
    return { type: 'ended', text: 'Đã kết thúc bán', value: null };
  }

  return { type: 'updating', text: '—', value: null };
};

/* ---------------------------------------------------------------------- */
/* SECTION TITLE — Gam màu nóng (Orange)                                  */
/* ---------------------------------------------------------------------- */
export const CustomerSectionTitle = ({
  kicker,
  title,
  description,
  action,
  className = ''
}) => (
  <div className={`flex flex-col gap-3 border-b border-slate-200 pb-4 md:flex-row md:items-end md:justify-between ${className}`}>
    <div className="max-w-2xl space-y-1">
      {kicker ? (
        <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-orange-600">
          <TrendingUp size={13} />
          {kicker}
        </div>
      ) : null}

      <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl tracking-tight">
        {title}
      </h2>

      {description ? (
        <p className="max-w-2xl text-sm leading-relaxed text-slate-500">
          {description}
        </p>
      ) : null}
    </div>

    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

/* ---------------------------------------------------------------------- */
/* METRIC CARD — Nền trắng viền Slate lạnh                               */
/* ---------------------------------------------------------------------- */
export const CustomerMetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'bg-orange-50 text-orange-700 border border-orange-100'
}) => (
  <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
          {label}
        </p>
        <p className="text-2xl font-black leading-tight text-slate-800 tracking-tight">
          {value}
        </p>
        {hint ? <p className="text-xs text-slate-400 font-medium">{hint}</p> : null}
      </div>

      <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-inner ${accent}`}>
        {Icon ? <Icon size={18} /> : null}
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------------- */
/* RANKING ITEM — Hiện phân số "0 / 966 chỗ" chuẩn chỉnh theo yêu cầu      */
/* ---------------------------------------------------------------------- */
export const CustomerRankingItem = ({
  rank,
  event,
  onViewDetail,
  onBookTicket,
  className = ''
}) => {
  const status = getEventStatusMeta(event);
  const priceSummary = getEventPriceSummary(event);
  const progress = getCapacityPercent(event);

  const imageStyle = event?.imageUrl
    ? {
        backgroundImage: `url(${event.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        backgroundColor: '#0F172A'
      };

  const isBtnDisabled = status.key === 'ended' || progress >= 100;

  return (
    <article
      className={[
        'flex flex-col gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm',
        'transition-all duration-300 hover:shadow-md md:flex-row md:items-center',
        className
      ].join(' ')}
    >
      <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-black ${rank === 1 ? 'bg-orange-600 text-white shadow-sm' : rank === 2 ? 'bg-orange-50 text-orange-700 border border-orange-100' : 'bg-slate-100 text-slate-600'}`}>
        #{rank}
      </div>

      <div className="h-20 w-full shrink-0 overflow-hidden rounded-xl border border-slate-100 md:h-16 md:w-24" style={imageStyle} />

      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="truncate text-sm font-bold text-slate-800 hover:text-orange-600 cursor-pointer transition-colors" onClick={onViewDetail}>
          {event?.name || 'Sự kiện nổi bật'}
        </h3>
        <p className="text-xs font-semibold text-slate-400">{formatDateRange(event?.startTime, event?.endTime)}</p>
        <div className="flex flex-wrap items-center gap-2 text-[11px] font-bold">
          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-600 border border-slate-200/40">{deriveEventCategory(event)}</span>
          <span className="rounded-md bg-slate-100 px-2.5 py-0.5 text-slate-600 border border-slate-200/40">{formatCapacityLabel(event)}</span>
          <span className="text-orange-600 font-extrabold">{priceSummary.text}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 md:flex-row items-center">
        <Button
          className="!h-8 !rounded-lg !border-slate-200 !text-xs !font-bold !text-slate-700 hover:!border-orange-500 hover:!text-orange-600 transition-all shadow-none"
          onClick={onViewDetail}
        >
          Chi tiết
        </Button>

        {/* 👉 ĐÃ FIX CHO RANKING ITEM: Khử màu xanh đè khi disabled để không bị chìm chữ Đặt Vé */}
        <Button
          type="primary"
          className={`!h-8 !rounded-lg !text-xs !font-bold shadow-sm transition-all min-w-[90px] ${
            isBtnDisabled 
              ? '!bg-slate-100 !text-slate-400 !border-slate-200' 
              : '!border-orange-600 !bg-orange-600 hover:!bg-orange-500 hover:!bg-orange-500 text-white'
          }`}
          icon={isBtnDisabled ? null : <ArrowRight size={12} />}
          onClick={onBookTicket}
          disabled={isBtnDisabled}
        >
          Đặt vé
        </Button>
      </div>
    </article>
  );
};

/* ---------------------------------------------------------------------- */
/* EVENT CARD — Gam màu nóng (Orange)                                     */
/* ---------------------------------------------------------------------- */
export const CustomerEventCard = ({
  event,
  onViewDetail,
  onBookTicket,
  className = ''
}) => {
  const status = getEventStatusMeta(event);
  const category = deriveEventCategory(event);
  const progress = getCapacityPercent(event);
  const isEnded = status.key === 'ended';
  const isSoldOut = progress >= 100;
  const priceSummary = getEventPriceSummary(event);

  const imageStyle = event?.imageUrl
    ? {
        backgroundImage: `url(${event.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        backgroundColor: '#0F172A'
      };

  const statusBadge =
    status.key === 'live'
      ? { text: 'Đang diễn ra', className: 'bg-orange-600 text-white font-bold shadow-md shadow-orange-900/20' }
      : status.key === 'ended'
        ? { text: 'Đã diễn ra', className: 'bg-slate-500 text-white font-medium' }
        : null;

  return (
    <article
      className={[
        'group flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white',
        'transition-all duration-300 hover:shadow-xl hover:border-orange-300/80',
        className
      ].join(' ')}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden border-b border-slate-100" style={imageStyle}>
        {statusBadge ? (
          <span className={`absolute right-0 top-0 rounded-bl-xl px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-widest ${statusBadge.className}`}>
            {statusBadge.text}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-5 space-y-3">
        <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
          {category}
        </span>

        <h3  
          className="line-clamp-2 min-h-[44px] text-sm font-bold leading-snug text-slate-800 hover:text-orange-600 cursor-pointer transition-colors"
          onClick={onViewDetail}
        >
          {event?.name || 'Sự kiện nổi bật'}
        </h3>

        <p className="text-sm font-extrabold text-orange-600 tracking-tight">
          {priceSummary.text}
        </p>

        <div className="space-y-1.5 pt-1 text-xs font-semibold text-slate-500 flex-1">
          <div className="flex items-center gap-2">
            <CalendarDays size={13} className="shrink-0 text-slate-400" />
            <span className="line-clamp-1 text-slate-500">{formatDateRange(event?.startTime, event?.endTime)}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin size={13} className="shrink-0 text-slate-400" />
            <span className="line-clamp-1 text-slate-500">{event?.location || ''}</span>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-100 space-y-1">
          <div className="flex items-center justify-between text-[11px] font-bold">
            <span className="text-slate-400">Sức bán</span>
            <span className="text-slate-600 font-semibold">{formatCapacityLabel(event)}</span>
          </div>
          <Progress
            percent={progress}
            showInfo={false}
            size="small"
            strokeColor={isSoldOut ? '#64748b' : '#ea580c'}
            trailColor="#f1f5f9"
            strokeWidth={5}
            className="m-0"
          />
        </div>

        <div className="mt-2 grid grid-cols-2 gap-2.5 pt-1">
          <Button
            className="w-full !h-9 !rounded-xl !text-xs !font-bold !text-slate-700 !border-slate-200 hover:!border-orange-500 hover:!text-orange-600 transition-all shadow-none"
            onClick={onViewDetail}
          >
            Chi tiết
          </Button>

          {/* 👉 ĐÃ FIX CHO EVENT CARD: Thay đổi cụm class linh hoạt để chữ Đã kết thúc nổi bần bật lên */}
          <Button
            type="primary"
            className={`w-full !h-9 !rounded-xl !text-xs !font-bold shadow-sm transition-all ${
              isEnded || isSoldOut 
                ? '!bg-slate-100 !text-slate-400 !border-slate-200' 
                : '!bg-orange-600 !border-orange-600 hover:!bg-orange-500 hover:!bg-orange-500 text-white'
            }`}
            onClick={onBookTicket}
            disabled={isEnded || isSoldOut}
          >
            {isEnded ? 'Đã kết thúc' : isSoldOut ? 'Hết chỗ' : 'Đặt vé'}
          </Button>
        </div>
      </div>
    </article>
  );
};