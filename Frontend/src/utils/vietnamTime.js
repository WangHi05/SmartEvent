const VIETNAM_TIME_ZONE = 'Asia/Ho_Chi_Minh';

export const toVietnamDate = (value) => {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

export const formatVietnamDateTime = (value, { withSeconds = false } = {}) => {
  const date = toVietnamDate(value);
  if (!date) {
    return '';
  }

  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VIETNAM_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: withSeconds ? '2-digit' : undefined,
    hour12: false,
  });

  return formatter.format(date).replace(', ', ' ');
};

export const formatVietnamDateRange = (startValue, endValue) => {
  if (!startValue || !endValue) {
    return '';
  }

  return `${formatVietnamDateTime(startValue)} - ${formatVietnamDateTime(endValue)}`;
};
