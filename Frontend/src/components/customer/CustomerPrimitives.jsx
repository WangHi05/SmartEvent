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
/* SECTION TITLE — gọn, chữ đen, không badge cầu kỳ                        */
/* ---------------------------------------------------------------------- */

export const CustomerSectionTitle = ({
  kicker,
  title,
  description,
  action,
  className = ''
}) => (
  <div className={`flex flex-col gap-3 border-b border-gray-200 pb-4 md:flex-row md:items-end md:justify-between ${className}`}>
    <div className="max-w-2xl space-y-1">
      {kicker ? (
        <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-green-700">
          <TrendingUp size={13} />
          {kicker}
        </div>
      ) : null}

      <h2 className="text-xl font-bold text-gray-900 sm:text-2xl">
        {title}
      </h2>

      {description ? (
        <p className="max-w-2xl text-sm leading-6 text-gray-500">
          {description}
        </p>
      ) : null}
    </div>

    {action ? <div className="shrink-0">{action}</div> : null}
  </div>
);

/* ---------------------------------------------------------------------- */
/* METRIC CARD — nền trắng, viền mỏng, icon nền màu nhạt (không gradient)  */
/* ---------------------------------------------------------------------- */

export const CustomerMetricCard = ({
  icon: Icon,
  label,
  value,
  hint,
  accent = 'bg-green-50 text-green-700'
}) => (
  <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
    <div className="flex items-start justify-between gap-3">
      <div className="space-y-1">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {label}
        </p>
        <p className="text-xl font-bold leading-tight text-gray-900">
          {value}
        </p>
        {hint ? <p className="text-xs text-gray-500">{hint}</p> : null}
      </div>

      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${accent}`}>
        {Icon ? <Icon size={18} /> : null}
      </div>
    </div>
  </div>
);

/* ---------------------------------------------------------------------- */
/* EVENT CARD — kiểu Ticketbox: ảnh trên, ribbon trạng thái, giá xanh lá   */
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
      ? { text: 'Đang diễn ra', className: 'bg-green-600 text-white' }
      : status.key === 'ended'
        ? { text: 'Đã diễn ra', className: 'bg-orange-500 text-white' }
        : null;

  return (
    <article
      className={[
        'group flex h-full flex-col overflow-hidden rounded-xl border border-gray-200 bg-white',
        'transition-shadow duration-200 hover:shadow-md',
        className
      ].join(' ')}
    >
      <div className="relative aspect-[16/10] w-full shrink-0 overflow-hidden" style={imageStyle}>
        {statusBadge ? (
          <span className={`absolute right-0 top-0 rounded-bl-lg px-2.5 py-1 text-[11px] font-semibold ${statusBadge.className}`}>
            {statusBadge.text}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-4">
        <span className="mb-1 text-[11px] font-medium uppercase tracking-wide text-gray-400">
          {category}
        </span>

        <h3 className="line-clamp-2 min-h-[44px] text-[15px] font-semibold leading-snug text-gray-900">
          {event?.name || 'Sự kiện nổi bật'}
        </h3>

        <p className="mt-2 text-sm font-bold text-green-600">
          {priceSummary.text}
        </p>

        <div className="mt-3 space-y-1.5 text-xs text-gray-500">
          <div className="flex items-center gap-1.5">
            <CalendarDays size={13} className="shrink-0 text-gray-400" />
            <span className="line-clamp-1">{formatDateRange(event?.startTime, event?.endTime)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="shrink-0 text-gray-400" />
            <span className="line-clamp-1">{event?.location || ''}</span>
          </div>
        </div>

        <div className="mt-3 border-t border-gray-100 pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[11px] text-gray-500">
            <span>Sức bán</span>
            <span>{formatCapacityLabel(event)}</span>
          </div>
          <Progress
            percent={progress}
            showInfo={false}
            size="small"
            strokeColor={isSoldOut ? '#dc2626' : '#16a34a'}
            trailColor="#e5e7eb"
          />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2">
          <Button
            className="!h-9 !rounded-lg !border-gray-300 !text-sm !font-medium !text-gray-700 hover:!border-green-600 hover:!text-green-700"
            onClick={onViewDetail}
          >
            Chi tiết
          </Button>

          <Button
            type="primary"
            className="!h-9 !rounded-lg !border-green-600 !bg-green-600 !text-sm !font-medium hover:!border-green-700 hover:!bg-green-700"
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

/* ---------------------------------------------------------------------- */
/* RANKING ITEM — hàng ngang, số thứ hạng đặc, gọn gàng                    */
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

  const imageStyle = event?.imageUrl
    ? {
        backgroundImage: `url(${event.imageUrl})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }
    : {
        backgroundColor: '#0F172A'
      };

  return (
    <article
      className={[
        'flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-3',
        'transition-shadow duration-200 hover:shadow-md',
        'md:flex-row md:items-center',
        className
      ].join(' ')}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-gray-900 text-sm font-bold text-white">
        #{rank}
      </div>

      <div className="h-24 w-full shrink-0 overflow-hidden rounded-lg md:h-20 md:w-32" style={imageStyle} />

      <div className="min-w-0 flex-1 space-y-1">
        <h3 className="truncate text-[15px] font-semibold text-gray-900">
          {event?.name || 'Sự kiện nổi bật'}
        </h3>
        <p className="text-xs text-gray-500">{formatDateRange(event?.startTime, event?.endTime)}</p>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">{deriveEventCategory(event)}</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 text-gray-600">{formatCapacityLabel(event)}</span>
          <span className="font-bold text-green-600">{priceSummary.text}</span>
        </div>
      </div>

      <div className="flex shrink-0 gap-2 md:flex-col">
        <Button
          className="!h-9 !rounded-lg !border-gray-300 !text-sm !text-gray-700 hover:!border-green-600 hover:!text-green-700"
          onClick={onViewDetail}
        >
          Chi tiết
        </Button>

        <Button
          type="primary"
          className="!h-9 !rounded-lg !border-green-600 !bg-green-600 !text-sm hover:!border-green-700 hover:!bg-green-700"
          icon={<ArrowRight size={14} />}
          onClick={onBookTicket}
          disabled={status.key === 'ended' || getCapacityPercent(event) >= 100}
        >
          Đặt vé
        </Button>
      </div>
    </article>
  );
};