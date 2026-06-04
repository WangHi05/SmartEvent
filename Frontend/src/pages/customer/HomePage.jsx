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
  Sparkles,
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
    eyebrow: 'Nền tảng bán vé premium',
        title: 'Khám phá sự kiện hấp dẫn theo phong cách Ticketbox',
    description: 'Hero banner lớn, card đẹp, thanh toán mượt và trải nghiệm mua vé chuyên nghiệp trên mọi thiết bị.',
    cta: 'Đặt vé ngay',
    accent: 'from-[#5FBF9A] via-[#66C7BC] to-[#5BBFD6]',
    glow: 'bg-cyan-200/30'
  },
  {
    eyebrow: 'Sự kiện nổi bật',
        title: 'Concert, workshop, hội thảo và thể thao trong một hành trình thú vị',
    description: 'Bộ lọc danh mục, ranking bán chạy, thông tin sức chứa và nút đặt vé được giữ nguyên logic.',
    cta: 'Khám phá sự kiện',
    accent: 'from-[#14B8A6] via-[#2BAFC8] to-[#3B82F6]',
    glow: 'bg-blue-200/30'
  },
  {
    eyebrow: 'SmartEvent for customers',
        title: 'Thiết kế hiện đại, responsive và gần gũi như một website bán vé chuyên nghiệp',
    description: 'Giữ nguyên route, API và các nút hiện có nhưng nâng cấp toàn bộ trải nghiệm thị giác.',
    cta: 'Xem lịch đặt vé',
    accent: 'from-[#10B981] via-[#3BC7C5] to-[#67E8F9]',
    glow: 'bg-emerald-200/30'
  }
];

const HomePage = () => {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeHeroIndex, setActiveHeroIndex] = useState(0);

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
        hint: 'Dữ liệu realtime từ hệ thống',
        icon: Ticket,
        accent: 'from-orange-500 to-amber-500'
      },
      {
        label: 'Đang diễn ra',
        value: liveEvents.toLocaleString('vi-VN'),
        hint: 'Theo dõi theo thời gian thực',
        icon: Flame,
        accent: 'from-emerald-500 to-teal-500'
      },
      {
        label: 'Sold-out',
        value: soldOutEvents.toLocaleString('vi-VN'),
        hint: 'Sự kiện đã hết chỗ',
        icon: Users,
        accent: 'from-slate-800 to-slate-600'
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

  const activeSlide = heroSlides[activeHeroIndex] || heroSlides[0];

  return (
    <div className="space-y-12 pb-4">
      <section
        className={`relative overflow-hidden rounded-[40px] border border-slate-200 bg-gradient-to-br ${activeSlide.accent} text-white shadow-[0_30px_80px_rgba(15,23,42,0.16)] transition-colors duration-700`}
      >
        <Carousel
          autoplay
          autoplaySpeed={5000}
          afterChange={(index) => setActiveHeroIndex(index)}
          dots={{ className: '!bottom-8 [&_li_button]:!bg-white/45 [&_li.slick-active_button]:!bg-white' }}
        >
          {heroSlides.map((slide, index) => (
            <div key={slide.title}>
              <div
                className={`relative min-h-[640px] overflow-hidden bg-gradient-to-br ${slide.accent} px-6 py-12 pb-20 sm:px-10 lg:px-14 xl:px-16`}
              >
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.20),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.14),transparent_30%)]" />
                <div className={`absolute -right-12 top-10 h-56 w-56 rounded-full ${slide.glow} blur-3xl`} />
                <div className="absolute -left-20 bottom-0 h-64 w-64 rounded-full bg-white/10 blur-3xl" />
                <div className="absolute inset-x-0 bottom-0 h-40 bg-gradient-to-t from-black/8 to-transparent" />

                <div className="relative grid items-center gap-10 lg:min-h-[540px] lg:grid-cols-[1.15fr_0.85fr]">
                  <div className="max-w-3xl space-y-7">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/15 px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white shadow-sm backdrop-blur-sm">
                      <Sparkles size={14} />
                      {slide.eyebrow}
                    </div>

                    <h1 className="text-4xl font-extrabold leading-[1.08] tracking-[-0.02em] text-white drop-shadow-[0_10px_24px_rgba(15,23,42,0.12)] sm:text-5xl lg:text-6xl xl:text-7xl">
                      {slide.title}
                    </h1>

                    <p className="max-w-2xl text-base font-normal leading-8 text-slate-950/82 sm:text-lg xl:text-xl">
                      {slide.description}
                    </p>

                    <div className="flex flex-wrap gap-3">
                      <Button
                        type="primary"
                        size="large"
                        className="!h-12 !rounded-2xl !border-orange-300 !bg-white !px-6 !font-medium !text-slate-950 shadow-[0_14px_35px_rgba(15,23,42,0.16)] hover:!border-orange-400 hover:!text-orange-600"
                        onClick={() => navigate('/customer/events')}
                      >
                        {slide.cta}
                        <ArrowRight size={16} className="ml-2" />
                      </Button>

                      <Button
                        size="large"
                        className="!h-12 !rounded-2xl !border-white/25 !bg-white/20 !px-6 !font-medium !text-white shadow-sm backdrop-blur-sm hover:!border-white/45 hover:!bg-white/28"
                        onClick={() => navigate('/customer/my-orders')}
                      >
                        Lịch sử đặt vé
                      </Button>
                    </div>

                    <div className="grid gap-4 pt-4 sm:grid-cols-3">
                      {metrics.map((metric) => (
                        <CustomerMetricCard key={metric.label} {...metric} />
                      ))}
                    </div>
                  </div>

                  <div className="relative">
                    <div className="absolute -left-6 top-8 h-24 w-24 rounded-full bg-white/20 blur-2xl" />

                    <div className="relative overflow-hidden rounded-[34px] border border-white/40 bg-white/68 p-5 text-slate-800 shadow-[0_30px_80px_rgba(15,23,42,0.16)] backdrop-blur-xl">
                      <div className="mb-4 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                            Spotlight {String(index + 1).padStart(2, '0')}
                          </p>
                          <p className="text-lg font-bold text-slate-900">Bản xem nhanh sự kiện</p>
                        </div>

                        <div className="rounded-full border border-white/60 bg-white/55 px-3 py-1 text-xs font-semibold text-slate-600 shadow-sm">
                          Live updates
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="rounded-[26px] border border-white/55 bg-white/45 p-4 shadow-sm">
                          <div className="mb-3 flex items-center gap-3">
                            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/70 text-xl font-black text-slate-700 shadow-sm">
                              S
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">SmartEvent</p>
                              <p className="text-sm text-slate-500">Premium customer journey</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3 text-sm font-medium text-slate-600">
                            <div className="rounded-2xl border border-white/60 bg-white/45 p-3">Carousel hero</div>
                            <div className="rounded-2xl border border-white/60 bg-white/45 p-3">Event ranking</div>
                            <div className="rounded-2xl border border-white/60 bg-white/45 p-3">Category filter</div>
                            <div className="rounded-2xl border border-white/60 bg-white/45 p-3">Responsive grid</div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
                          {categoryChips.slice(0, 3).map((category) => (
                            <button
                              key={category.value}
                              onClick={() => navigate(`/customer/events?category=${encodeURIComponent(category.label)}`)}
                              className="rounded-2xl border border-white/55 bg-white/35 px-4 py-3 text-left text-sm font-semibold text-slate-700 transition hover:-translate-y-0.5 hover:bg-white/55 hover:text-slate-950"
                            >
                              {category.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <CustomerMetricCard
          icon={CalendarDays}
          label="Nội dung cập nhật"
          value={events.length.toLocaleString('vi-VN')}
          hint="Sự kiện đồng bộ từ hệ thống"
          accent="from-orange-500 to-amber-500"
        />
        <CustomerMetricCard
          icon={ShieldCheck}
          label="Thanh toán an toàn"
          value="VNPay"
          hint="Luồng thanh toán hiện có được giữ nguyên"
          accent="from-slate-800 to-slate-600"
        />
        <CustomerMetricCard
          icon={Music2}
          label="Nhiều chủ đề"
          value={EVENT_CATEGORIES.length - 2}
          hint="Nhạc sống, workshop, triển lãm..."
          accent="from-emerald-500 to-teal-500"
        />
      </section>

      <section className="space-y-5">
        <CustomerSectionTitle
          kicker="Danh mục nổi bật"
          title="Khám phá sự kiện theo chủ đề"
          description="Click từng danh mục để vào trang sự kiện và lọc nhanh theo loại nội dung bạn quan tâm."
        />

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
          {categoryChips.map((category, index) => {
            const icons = [Music2, Mic2, Volleyball, GalleryHorizontal, Ticket, Laptop2, Coffee];
            const Icon = icons[index] || Ticket;

            return (
              <button
                key={category.value}
                onClick={() => navigate(`/customer/events?category=${encodeURIComponent(category.label)}`)}
                className="group rounded-3xl border border-slate-200 bg-white p-4 text-left shadow-[0_18px_50px_rgba(15,23,42,0.08)] transition hover:-translate-y-1 hover:border-orange-300 hover:shadow-[0_25px_60px_rgba(249,115,22,0.15)]"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-50 text-orange-600 transition group-hover:bg-orange-500 group-hover:text-white">
                  <Icon size={18} />
                </div>
                <p className="text-base font-bold text-slate-950">{category.label}</p>
                <p className="mt-1 text-sm text-slate-500">Bộ sưu tập sự kiện chọn lọc</p>
              </button>
            );
          })}
        </div>
      </section>

      <section className="space-y-5">
        <CustomerSectionTitle
          kicker="Sự kiện nổi bật"
          title="Card sự kiện premium"
          description="Bố cục dạng Ticketbox với ảnh nổi bật, trạng thái, giá từ, sức chứa và nút đặt vé nhanh."
          action={(
            <Link
              to="/customer/events"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-orange-300 hover:text-orange-700"
            >
              Xem toàn bộ sự kiện
              <ArrowRight size={16} />
            </Link>
          )}
        />

        {loading ? (
          <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white">
            <Spin size="large" tip="Đang tải sự kiện nổi bật..." />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
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

      <section className="space-y-5">
        <CustomerSectionTitle
          kicker="Top bán chạy"
          title="Trending / ranking"
          description="Xếp hạng theo mức độ lấp đầy chỗ ngồi, giữ nguyên dữ liệu hiện tại và chỉ đổi cách trình bày."
        />

        <div className="space-y-4">
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

      <section className="space-y-5">
        <CustomerSectionTitle
          kicker="Upcoming events"
          title="Cuộn ngang các sự kiện sắp tới"
          description="Một rail cuộn mượt trên desktop/mobile để khách hàng duyệt nhanh lịch sắp diễn ra."
        />

        <div className="-mx-2 flex gap-4 overflow-x-auto px-2 pb-2">
          {upcomingEvents.length === 0 ? (
            <div className="rounded-[28px] border border-dashed border-slate-300 bg-white px-6 py-12 text-sm text-slate-500">
              Chưa có sự kiện sắp diễn ra trong danh sách hiện tại.
            </div>
          ) : (
            upcomingEvents.map((event) => (
              <div key={event.id} className="min-w-[280px] max-w-[280px] flex-none">
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

      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-600 p-8 text-white shadow-[0_30px_80px_rgba(15,23,42,0.22)] lg:p-10">
        <div className="grid gap-8 lg:grid-cols-[1.3fr_0.7fr] lg:items-center">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.24em] text-white/80">
              <Sparkles size={14} />
              SmartEvent premium journey
            </div>

            <h3 className="text-3xl font-black tracking-tight sm:text-4xl">
              Mọi thứ sẵn sàng cho trải nghiệm đặt vé chuyên nghiệp
            </h3>

            <p className="max-w-2xl text-sm leading-7 text-white/75 sm:text-base">
              Không thay đổi route, token flow hay API. Chỉ nâng cấp toàn bộ giao diện để trang khách hàng trông như một website bán vé thật sự.
            </p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
            <Button
              type="primary"
              size="large"
              className="!h-12 !rounded-2xl !border-white !bg-white !px-6 !font-semibold !text-slate-950"
              onClick={() => navigate('/customer/events')}
            >
              Bắt đầu khám phá
            </Button>

            <Button
              size="large"
              className="!h-12 !rounded-2xl !border-white/20 !bg-white/10 !px-6 !font-semibold !text-white hover:!border-white/35 hover:!bg-white/15"
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