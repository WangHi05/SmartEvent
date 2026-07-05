import React, { useEffect, useMemo, useState } from 'react';
import { Button, Carousel, Spin, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  CalendarDays,
  Coffee,
  GalleryHorizontal,
  Laptop2,
  Mic2,
  Music2,
  Ticket,
  Users,
  Volleyball,
  Flame,
  ShieldCheck
} from 'lucide-react';
import axiosClient from '../../api/axiosClient';
import {
  CustomerEventCard,
  CustomerMetricCard,
  CustomerRankingItem,
  CustomerSectionTitle,
  EVENT_CATEGORIES,
  getCapacityPercent,
  getEventStatusMeta
} from '../../components/customer/CustomerPrimitives';

const heroSlides = [
  {
    eyebrow: 'Nền tảng bán vé sự kiện',
    title: 'Khám phá sự kiện hấp dẫn nhất hôm nay',
    description: 'Đặt vé nhanh, an toàn, cập nhật liên tục từ hệ thống.',
    cta: 'Đặt vé ngay'
  },
  {
    eyebrow: 'Sự kiện nổi bật',
    title: 'Concert, workshop, hội thảo và thể thao',
    description: 'Hàng trăm sự kiện đang mở bán, chọn lọc theo danh mục bạn quan tâm.',
    cta: 'Khám phá sự kiện'
  },
  {
    eyebrow: 'SmartEvent',
    title: 'Trải nghiệm đặt vé trực tuyến chuyên nghiệp',
    description: 'Thanh toán bảo mật, vé điện tử, hỗ trợ khách hàng 24/7.',
    cta: 'Xem lịch đặt vé'
  }
];

const HomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get('/events/search', {
          params: { pageNumber: 1, pageSize: 24, keyword: '' }
        });
        const payload = response?.data || response;
        setEvents(payload?.items || payload?.data?.items || []);
      } catch (error) {
        console.error('Error loading home events:', error);
        message.error('Không thể tải sự kiện nổi bật');
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const metrics = useMemo(() => {
    const totalEvents = events.length;
    const liveEvents = events.filter((event) => getEventStatusMeta(event).key === 'live').length;
    const soldOutEvents = events.filter((event) => getCapacityPercent(event) >= 100).length;

    return [
      {
        label: 'Sự kiện đang mở bán',
        value: totalEvents.toLocaleString('vi-VN'),
        hint: 'Dữ liệu realtime',
        icon: Ticket,
        accent: 'bg-green-50 text-green-700'
      },
      {
        label: 'Đang diễn ra',
        value: liveEvents.toLocaleString('vi-VN'),
        hint: 'Theo thời gian thực',
        icon: Flame,
        accent: 'bg-orange-50 text-orange-600'
      },
      {
        label: 'Sold-out',
        value: soldOutEvents.toLocaleString('vi-VN'),
        hint: 'Đã hết chỗ',
        icon: Users,
        accent: 'bg-gray-100 text-gray-700'
      }
    ];
  }, [events]);

  const featuredEvents = useMemo(() => events.slice(0, 6), [events]);

  const trendingEvents = useMemo(
    () => [...events].sort((a, b) => getCapacityPercent(b) - getCapacityPercent(a)).slice(0, 5),
    [events]
  );

  const upcomingEvents = useMemo(
    () => [...events].filter((event) => getEventStatusMeta(event).key === 'upcoming').slice(0, 8),
    [events]
  );

  const categoryChips = useMemo(() => EVENT_CATEGORIES.filter((item) => item.value !== 'all'), []);

  return (
    <div className="space-y-10 pb-4">
      {/* HERO */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
        <Carousel autoplay autoplaySpeed={5000}>
          {heroSlides.map((slide) => (
            <div key={slide.title}>
              <div className="grid min-h-[320px] items-center gap-8 px-6 py-10 sm:px-10 lg:grid-cols-[1.3fr_0.7fr] lg:px-14">
                <div className="max-w-2xl space-y-4">
                  <span className="inline-block rounded bg-green-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
                    {slide.eyebrow}
                  </span>

                  <h1 className="text-3xl font-bold leading-tight text-white sm:text-4xl">
                    {slide.title}
                  </h1>

                  <p className="text-sm leading-6 text-gray-300 sm:text-base">
                    {slide.description}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      type="primary"
                      size="large"
                      className="!h-11 !rounded-lg !border-green-600 !bg-green-600 !px-6 !font-semibold hover:!border-green-700 hover:!bg-green-700"
                      onClick={() => navigate('/customer/events')}
                    >
                      {slide.cta}
                      <ArrowRight size={16} className="ml-2" />
                    </Button>

                    <Button
                      size="large"
                      className="!h-11 !rounded-lg !border-gray-500 !bg-transparent !px-6 !font-semibold !text-white hover:!border-white hover:!text-white"
                      onClick={() => navigate('/customer/my-orders')}
                    >
                      Lịch sử đặt vé
                    </Button>
                  </div>
                </div>

                <div className="hidden rounded-lg border border-white/10 bg-white/5 p-5 lg:block">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Danh mục nổi bật</p>
                  <div className="mt-3 space-y-2">
                    {categoryChips.slice(0, 4).map((category) => (
                      <button
                        key={category.value}
                        onClick={() => navigate(`/customer/events?category=${encodeURIComponent(category.label)}`)}
                        className="block w-full rounded-md border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-gray-200 transition hover:border-green-500 hover:text-white"
                      >
                        {category.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </section>

      {/* METRICS */}
      <section className="grid gap-4 sm:grid-cols-3">
        <CustomerMetricCard {...metrics[0]} />
        <CustomerMetricCard {...metrics[1]} />
        <CustomerMetricCard {...metrics[2]} />
      </section>

      {/* CATEGORIES */}
      <section className="space-y-4">
        <CustomerSectionTitle
          kicker="Danh mục"
          title="Khám phá sự kiện theo chủ đề"
          description="Chọn một danh mục để lọc nhanh sự kiện bạn quan tâm."
        />

        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-7">
          {categoryChips.map((category, index) => {
            const icons = [Music2, Mic2, Volleyball, GalleryHorizontal, Ticket, Laptop2, Coffee];
            const Icon = icons[index] || Ticket;

            return (
              <button
                key={category.value}
                onClick={() => navigate(`/customer/events?category=${encodeURIComponent(category.label)}`)}
                className="group flex flex-col items-center gap-2 rounded-lg border border-gray-200 bg-white p-4 text-center transition hover:border-green-500 hover:shadow-sm"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-50 text-green-700 transition group-hover:bg-green-600 group-hover:text-white">
                  <Icon size={17} />
                </div>
                <p className="text-sm font-medium text-gray-800">{category.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* FEATURED EVENTS */}
      <section className="space-y-4">
        <CustomerSectionTitle
          kicker="Sự kiện nổi bật"
          title="Đang mở bán"
          action={(
            <Link
              to="/customer/events"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-green-700 hover:text-green-800"
            >
              Xem tất cả
              <ArrowRight size={15} />
            </Link>
          )}
        />

        {loading ? (
          <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-white">
            <Spin size="large" tip="Đang tải sự kiện..." />
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {featuredEvents.map((event) => (
              <CustomerEventCard
                key={event.id}
                event={event}
                onViewDetail={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
                onBookTicket={() => navigate(`/tickets/booking/${event.slug || 'su-kien'}/${event.id}`)}
              />
            ))}
          </div>
        )}
      </section>

      {/* RANKING */}
      <section className="space-y-4">
        <CustomerSectionTitle
          kicker="Top bán chạy"
          title="Xếp hạng theo lượt đặt vé"
        />

        <div className="space-y-3">
          {trendingEvents.map((event, index) => (
            <CustomerRankingItem
              key={event.id}
              rank={index + 1}
              event={event}
              onViewDetail={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
              onBookTicket={() => navigate(`/tickets/booking/${event.slug || 'su-kien'}/${event.id}`)}
            />
          ))}
        </div>
      </section>

      {/* UPCOMING */}
      <section className="space-y-4">
        <CustomerSectionTitle
          kicker="Sắp diễn ra"
          title="Sự kiện sắp tới"
        />

        <div className="-mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
          {upcomingEvents.length === 0 ? (
            <div className="w-full rounded-xl border border-dashed border-gray-300 bg-white px-6 py-10 text-center text-sm text-gray-500">
              Chưa có sự kiện sắp diễn ra.
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div key={event.id} className="min-w-[260px] max-w-[260px] flex-none">
                <CustomerEventCard
                  event={event}
                  onViewDetail={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
                  onBookTicket={() => navigate(`/tickets/booking/${event.slug || 'su-kien'}/${event.id}`)}
                  className="h-full"
                />
              </div>
            ))
          )}
        </div>
      </section>

      {/* CTA */}
      <section className="rounded-xl border border-gray-200 bg-gray-900 p-8">
        <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-xl font-bold text-white">Sẵn sàng cho sự kiện tiếp theo?</h3>
            <p className="mt-1 text-sm text-gray-300">Đặt vé nhanh, thanh toán an toàn, hỗ trợ 24/7.</p>
          </div>

          <div className="flex gap-3">
            <Button
              type="primary"
              size="large"
              className="!h-11 !rounded-lg !border-green-600 !bg-green-600 !px-6 !font-semibold hover:!border-green-700 hover:!bg-green-700"
              onClick={() => navigate('/customer/events')}
            >
              Khám phá ngay
            </Button>
            <Button
              size="large"
              className="!h-11 !rounded-lg !border-gray-500 !bg-transparent !px-6 !font-semibold !text-white hover:!border-white"
              onClick={() => navigate('/customer/contact')}
            >
              Liên hệ hỗ trợ
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default HomePage;