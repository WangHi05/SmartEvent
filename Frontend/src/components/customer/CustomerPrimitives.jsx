import React from 'react';
import dayjs from 'dayjs';
import { Button, Progress, Tag } from 'antd';
import {
  ArrowRight,
  CalendarDays,
  Clock3,
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
    return { label: 'Sắp diễn ra', color: 'gold', key: 'upcoming' };
  }

  const startValue = start.valueOf();
  const endValue = end.valueOf();

  if (now < startValue) {
    return { label: 'Sắp diễn ra', color: 'gold', key: 'upcoming' };
  }

  if (now >= startValue && now <= endValue) {
    return { label: 'Đang diễn ra', color: 'green', key: 'live' };
  }

  return { label: 'Đã kết thúc', color: 'default', key: 'ended' };
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
  const currentOccupancy = Number(event?.currentOccupancy || 0);

  if (!maxCapacity) {
    return 0;
  }

  return Math.min(100, Math.round((currentOccupancy / maxCapacity) * 100));
};

export const formatCapacityLabel = (event) => {
  const currentOccupancy = Number(event?.currentOccupancy || 0);
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
        text: `Giá từ ${formatVndCurrency(fallbackPrice)}`,
        value: fallbackPrice
      };
    }

    return { type: 'updating', text: 'Đang cập nhật', value: null };
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
      text: `Giá từ ${formatVndCurrency(minPrice)}`,
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

  return { type: 'updating', text: 'Đang cập nhật', value: null };
};

export const CustomerSectionTitle = ({
  kicker,
  title,
  description,
  action,
  className = ''
}) => (
  <div className={`flex flex-col gap-4 md:flex-row md:items-end md:justify-between ${className}`}>
    <div className="max-w-2xl space-y-2">
      {kicker ? (
        <div className="inline-flex items-center gap-2 rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-orange-700">
          <TrendingUp size={12} />
          {kicker}
        </div>
      ) : null}

      <h2 className="text-[22px] font-bold tracking-[-0.01em] text-slate-900 sm:text-[26px]">
        {title}
      </h2>

      {description ? (
        <p className="max-w-2xl text-sm font-normal leading-7 text-slate-500 sm:text-[15px]">
          {description}
        </p>
      ) : null}
    </div>

    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

export const CustomerMetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'from-orange-500 to-amber-500'
}) => (
  <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
          {label}
        </p>
        <p className="text-[22px] font-bold leading-tight text-slate-900">
          {value}
        </p>
        {hint ? <p className="text-sm font-normal leading-6 text-slate-500">{hint}</p> : null}
      </div>

      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${accent} text-white shadow-lg`}>
        {Icon ? <Icon size={20} /> : null}
      </div>
    </div>
  </div>
);

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
        backgroundImage: `linear-gradient(180deg, rgba(15,23,42,0.06), rgba(15,23,42,0.75)), url(${event.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)'
      };

  const statusClassName =
    status.key === 'live'
      ? 'border border-emerald-200 bg-emerald-50 text-emerald-700'
      : status.key === 'upcoming'
        ? 'border border-blue-200 bg-blue-50 text-blue-700'
        : 'border border-slate-200 bg-slate-100 text-slate-600';

  return (
    <article
      className={[
        'group flex h-full min-h-[560px] flex-col overflow-hidden rounded-[30px]',
        'border border-slate-200/70 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.10)]',
        'transition duration-300 hover:-translate-y-1 hover:shadow-[0_26px_72px_rgba(15,23,42,0.14)]',
        className
      ].join(' ')}
    >
      <div className="relative h-72 shrink-0 overflow-hidden" style={imageStyle}>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/88 via-slate-950/18 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-br from-slate-950/0 via-indigo-950/10 to-blue-600/15" />

        <div className="absolute left-4 top-4 flex max-w-[calc(100%-2rem)] flex-wrap gap-2">
          <Tag className={`!m-0 !rounded-full !px-3 !py-1 !font-semibold ${statusClassName}`}>
            {status.label}
          </Tag>

          <Tag className="!m-0 !max-w-[130px] !rounded-full !border-white/20 !bg-slate-950/35 !px-3 !py-1 !text-white backdrop-blur-sm">
            <span className="block truncate">{category}</span>
          </Tag>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-5 text-white">
          <p className="mb-2 line-clamp-2 text-[11px] font-semibold uppercase leading-6 tracking-[0.14em] text-white/72">
            {formatDateRange(event?.startTime, event?.endTime)}
          </p>

          <h3 className="line-clamp-2 min-h-[64px] text-[22px] font-bold leading-[1.18] tracking-[-0.01em]">
            {event?.name || 'Sự kiện nổi bật'}
          </h3>
        </div>
      </div>

      <div className="flex flex-1 flex-col p-6">
        <div className="space-y-2 text-sm text-slate-600">
          <div className="flex min-h-[40px] items-start gap-2">
            <CalendarDays size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <span className="line-clamp-2">
              {formatDateRange(event?.startTime, event?.endTime)}
            </span>
          </div>

          <div className="flex min-h-[22px] items-start gap-2">
            <MapPin size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <span className="line-clamp-1">
              {event?.location || 'Địa điểm đang cập nhật'}
            </span>
          </div>

          <div className="flex min-h-[22px] items-start gap-2">
            <Clock3 size={16} className="mt-0.5 shrink-0 text-blue-600" />
            <span className="line-clamp-1">
              {priceSummary.text}
            </span>
          </div>
        </div>

        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            <span className="shrink-0">Sức bán</span>
            <span className="truncate text-right">{formatCapacityLabel(event)}</span>
          </div>

          <Progress
            percent={progress}
            showInfo={false}
            strokeColor={isSoldOut ? '#ef4444' : '#2563eb'}
            trailColor="#e2e8f0"
          />
        </div>

        <div className="mt-auto pt-5">
          <div className="grid grid-cols-2 gap-3">
            <Button
              className="!h-12 !rounded-2xl !border-slate-300 !font-semibold !text-slate-700 hover:!border-blue-300 hover:!text-blue-700"
              onClick={onViewDetail}
            >
              Xem chi tiết
            </Button>

            <Button
              type="primary"
              className="!h-12 !rounded-2xl !border-orange-500 !bg-orange-500 !font-semibold shadow-lg shadow-orange-500/20 hover:!border-orange-600 hover:!bg-orange-600"
              onClick={onBookTicket}
              disabled={isEnded || isSoldOut}
            >
              {isEnded ? 'Đã kết thúc' : isSoldOut ? 'Hết chỗ' : 'Đặt vé'}
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
};

export const CustomerRankingItem = ({
  rank,
  event,
  onViewDetail,
  onBookTicket,
  className = ''
}) => {
  const status = getEventStatusMeta(event);
  const priceSummary = getEventPriceSummary(event);

  const imageStyle = event?.imageUrl
    ? {
        backgroundImage: `url(${event.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        backgroundImage: 'linear-gradient(135deg, #0f172a 0%, #1d4ed8 55%, #38bdf8 100%)'
      };

  return (
    <article
      className={[
        'group flex flex-col gap-4 rounded-[28px] border border-slate-200/70 bg-white p-4',
        'shadow-[0_20px_60px_rgba(15,23,42,0.10)] transition duration-300',
        'hover:-translate-y-1 hover:shadow-[0_26px_72px_rgba(15,23,42,0.14)]',
        'md:flex-row md:items-center',
        className
      ].join(' ')}
    >
      <div className="flex items-center gap-4 md:min-w-[92px]">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-sky-400 text-2xl font-black text-white shadow-lg shadow-blue-600/20">
          #{rank}
        </div>
      </div>

      <div className="h-28 w-full overflow-hidden rounded-2xl md:h-28 md:w-44 md:shrink-0" style={imageStyle}>
        <div className="flex h-full w-full items-end bg-gradient-to-t from-slate-950/70 via-slate-950/20 to-transparent p-3 text-white">
          <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
            {status.label}
          </span>
        </div>
      </div>

      <div className="min-w-0 flex-1 space-y-3">
        <div className="space-y-1">
          <h3 className="truncate text-[20px] font-bold leading-tight tracking-[-0.01em] text-slate-950">
            {event?.name || 'Sự kiện nổi bật'}
          </h3>
          <p className="text-sm font-normal leading-6 text-slate-500">
            {formatDateRange(event?.startTime, event?.endTime)}
          </p>
        </div>

        <div className="flex flex-wrap gap-2 text-[11px] font-medium text-slate-500">
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {deriveEventCategory(event)}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {formatCapacityLabel(event)}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1">
            {priceSummary.text}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 md:flex-col">
        <Button
          className="!h-10 !rounded-2xl !border-slate-300 !text-slate-700 hover:!border-blue-300 hover:!text-blue-700"
          onClick={onViewDetail}
        >
          Chi tiết
        </Button>

        <Button
          type="primary"
          className="!h-10 !rounded-2xl !border-orange-500 !bg-orange-500 hover:!border-orange-600 hover:!bg-orange-600"
          icon={<ArrowRight size={16} />}
          onClick={onBookTicket}
          disabled={status.key === 'ended' || getCapacityPercent(event) >= 100}
        >
          Đặt vé
        </Button>
      </div>
    </article>
  );
};