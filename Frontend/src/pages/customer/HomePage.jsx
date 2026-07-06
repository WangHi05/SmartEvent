import React, { useEffect, useMemo, useState } from 'react';
import { Button, Carousel, Spin, message } from 'antd';
import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Flame,
  Music2,
  Mic2,
  Volleyball,
  GalleryHorizontal,
  Ticket,
  Laptop2,
  Coffee,
  Users,
  Compass,
  Sparkles
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
    eyebrow: 'SHOW THỰC CẢNH ĐẶC SẮC',
    title: 'SÂN KHẤU KỊCH HUYỀN ẢO: NGUYỄN DU HỒ XUÂN HƯƠNG',
    description: 'Một tác phẩm nghệ thuật đỉnh cao, chạm tới mọi cung bậc cảm xúc của người xem. Đặt vé trực tuyến giữ chỗ đẹp ngay hôm nay.',
    cta: 'Đặt vé ngay',
    imageUrl: 'https://images.unsplash.com/photo-1503095396549-807759245b35?q=80&w=1200&auto=format&fit=crop'
  },
  {
    eyebrow: 'ĐẠI NHẠC HỘI LIVE CONCERT',
    title: 'MYSTIC NIGHT: KAY TRẦN - TĂNG PHÚC',
    description: 'Bùng nổ không gian âm nhạc thời thượng cùng dàn nghệ sĩ trending hàng đầu. Hệ thống quét mã QR kiểm soát cổng siêu tốc không lo ùn tắc.',
    cta: 'Khám phá sự kiện',
    imageUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop'
  },
  {
    eyebrow: 'WORKSHOP & TRIỂN LÃM SÁNG TẠO',
    title: 'KẾT NỐI KHÔNG GIAN VÀ IDOL CỦA BẠN',
    description: 'Chuỗi sự kiện giao lưu, chia sẻ kinh nghiệm và kết nối cộng đồng thông minh. Quản lý luồng khách tự động tích hợp công nghệ AI.',
    cta: 'Xem lịch đặt vé',
    imageUrl: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?q=80&w=1200&auto=format&fit=crop'
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
          params: { pageNumber: 1, pageSize: 50, keyword: '' }
        });
        const payload = response?.data || response;
        setEvents(payload?.items || payload?.data?.items || []);
      } catch (error) {
        console.error('Error loading home events:', error);
        message.error('Không thể tải danh sách sự kiện');
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
        accent: 'bg-slate-100 text-slate-800 border border-slate-200'
      },
      {
        label: 'Đang diễn ra',
        value: liveEvents.toLocaleString('vi-VN'),
        hint: 'Theo thời gian thực',
        icon: Flame,
        accent: 'bg-indigo-50 text-indigo-700 border border-indigo-100'
      },
      {
        label: 'Sold-out',
        value: soldOutEvents.toLocaleString('vi-VN'),
        hint: 'Đã hết chỗ',
        icon: Users,
        accent: 'bg-slate-50 text-slate-600 border border-slate-200'
      }
    ];
  }, [events]);

  const featuredEvents = useMemo(() => events.slice(0, 4), [events]);

  const musicEvents = useMemo(() => {
    return events.filter(e => {
      const categoryStr = String(e.category?.name || e.categoryName || e.category || '').toLowerCase();
      const titleStr = String(e.name || e.title || '').toLowerCase();
      
      return categoryStr.includes('nhạc') || 
             categoryStr.includes('music') || 
             categoryStr.includes('concert') ||
             titleStr.includes('nhạc') ||
             titleStr.includes('concert');
    }).slice(0, 4);
  }, [events]);

  const tourEvents = useMemo(() => {
    return events.filter(e => {
      const categoryStr = String(e.category?.name || e.categoryName || e.category || '').toLowerCase();
      const titleStr = String(e.name || e.title || '').toLowerCase();
      
      return categoryStr.includes('tham quan') || 
             categoryStr.includes('triển lãm') || 
             categoryStr.includes('workshop') || 
             categoryStr.includes('hội thảo') ||
             titleStr.includes('workshop') ||
             titleStr.includes('hội thảo') ||
             titleStr.includes('triển lãm');
    }).slice(0, 4);
  }, [events]);

  const trendingEvents = useMemo(
    () => [...events].sort((a, b) => getCapacityPercent(b) - getCapacityPercent(a)).slice(0, 5),
    [events]
  );

  const categoryChips = useMemo(() => EVENT_CATEGORIES.filter((item) => item.value !== 'all'), []);

  return (
    <div className="space-y-12 pb-10 bg-slate-50/50 min-h-screen">
      {/* 🎬 HERO BANNER ĐỘNG - ĐÃ FIX FIX CHIỀU CAO ĐỒNG BỘ KHÔNG BỊ KHUYẾT */}
      <section className="overflow-hidden rounded-2xl border border-slate-200 shadow-md bg-slate-950 h-[430px]">
        <Carousel autoplay autoplaySpeed={4000} effect="fade">
          {heroSlides.map((slide) => (
            <div key={slide.title} className="relative overflow-hidden h-[430px] flex items-center">
              
              {/* Ảnh nền phủ kín 100% diện tích slide cha */}
              <div 
                className="absolute inset-0 bg-cover bg-center opacity-100 pointer-events-none transition-all duration-1000 h-full w-full"
                style={{ backgroundImage: `url(${slide.imageUrl})` }}
              />
              
              <div className="absolute inset-0 bg-gradient-to-r from-black/40 via-black/10 to-transparent pointer-events-none h-full w-full" />
              
              {/* Nội dung căn giữa hoàn hảo nhờ flex items-center */}
              <div className="w-full grid gap-8 px-6 sm:px-12 lg:grid-cols-[1.3fr_0.7fr] lg:px-16 relative z-10 py-6">
                <div className="max-w-xl space-y-4 bg-slate-950/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/15 shadow-2xl text-white">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-indigo-200 border border-indigo-400/20">
                    <Sparkles size={11} /> {slide.eyebrow}
                  </span>

                  <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl lg:text-4xl tracking-tight">
                    {slide.title}
                  </h1>

                  <p className="text-xs leading-relaxed text-slate-200 sm:text-sm font-normal line-clamp-2">
                    {slide.description}
                  </p>

                  <div className="flex flex-wrap gap-3 pt-2">
                    <Button
                      type="primary"
                      size="large"
                      className="!h-11 !rounded-xl !border-indigo-600 !bg-indigo-600 !px-6 !text-xs !font-bold hover:!border-indigo-500 hover:!bg-indigo-500 shadow-md transition-all transform hover:scale-[1.01]"
                      onClick={() => navigate('/customer/events')}
                    >
                      {slide.cta}
                      <ArrowRight size={14} className="ml-1.5" />
                    </Button>

                    <Button
                      size="large"
                      className="!h-11 !rounded-xl !border-white/30 !bg-white/10 !px-6 !text-xs !font-semibold !text-white hover:!border-white hover:!bg-white/20 transition-all"
                      onClick={() => navigate('/customer/my-orders')}
                    >
                      Lịch sử đặt vé
                    </Button>
                  </div>
                </div>

                <div className="hidden rounded-2xl border border-white/15 bg-slate-950/70 backdrop-blur-md p-6 lg:block relative z-10 shadow-2xl h-fit self-center">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-300 mb-3.5 flex items-center gap-2">
                    <Compass size={13} className="text-indigo-400" /> Danh mục thịnh hành
                  </p>
                  <div className="space-y-2">
                    {categoryChips.slice(0, 4).map((category) => (
                      <button
                        key={category.value}
                        onClick={() => navigate(`/customer/events?category=${encodeURIComponent(category.label)}`)}
                        className="block w-full rounded-xl border border-white/5 bg-white/5 px-4 py-2.5 text-left text-xs text-slate-200 transition-all hover:border-indigo-500/50 hover:bg-white/10 hover:text-white font-semibold"
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

      {/* 📊 KHỐI METRICS */}
      <section className="grid gap-5 sm:grid-cols-3">
        <CustomerMetricCard {...metrics[0]} />
        <CustomerMetricCard {...metrics[1]} />
        <CustomerMetricCard {...metrics[2]} />
      </section>

      {/* 🗂️ CHIP LIST DANH MỤC */}
      <section className="space-y-5 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-sm">
        <CustomerSectionTitle
          kicker="DANH MỤC SỰ KIỆN"
          title="Tìm kiếm sự kiện theo sở thích"
          description="Hệ thống lọc tự động phân loại thông minh giúp bạn tìm kiếm nhanh chóng nhất."
        />

        <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 lg:grid-cols-7">
          {categoryChips.map((category, index) => {
            const icons = [Music2, Mic2, Volleyball, GalleryHorizontal, Ticket, Laptop2, Coffee];
            const Icon = icons[index] || Ticket;

            return (
              <button
                key={category.value}
                onClick={() => navigate(`/customer/events?category=${encodeURIComponent(category.label)}`)}
                className="group flex flex-col items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-center transition-all hover:border-indigo-500 hover:bg-white hover:shadow-md"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 transition-all group-hover:bg-indigo-600 group-hover:text-white shadow-sm">
                  <Icon size={20} />
                </div>
                <p className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600">{category.label}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* 🌟 PHÂN KHU 1: ĐANG MỞ BÁN NỔI BẬT */}
      <section className="space-y-5">
        <CustomerSectionTitle
          kicker="ĐANG MỞ BÁN"
          title="SỰ KIỆN NỔI BẬT NHẤT"
          action={(
            <Link
              to="/customer/events"
              className="inline-flex items-center gap-1.5 text-sm font-bold text-indigo-600 hover:text-indigo-700 bg-indigo-50 px-3 py-1.5 rounded-lg transition-all"
            >
              Xem tất cả <ArrowRight size={14} />
            </Link>
          )}
        />

        {loading ? (
          <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Spin size="large" tip="Đang tải dữ liệu sự kiện..." />
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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

      {/* 🎵 PHÂN KHU 2: CA NHẠC & NGHỆ THUẬT */}
      <section className="space-y-5 border-t border-slate-200/60 pt-8">
        <CustomerSectionTitle
          kicker="CHỦ ĐỀ ĐANG HOT"
          title="Ca Nhạc & Nghệ Thuật Sân Khấu"
          description="Tận hưởng không gian âm nhạc thời thượng cùng hệ thống phân luồng check-in an toàn."
          action={(
            <Link
              to="/customer/events?category=Nhạc sống"
              className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline"
            >
              Xem thêm sự kiện ca nhạc
            </Link>
          )}
        />

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center"><Spin /></div>
        ) : musicEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-400 font-medium">
            Chưa có sự kiện thuộc chủ đề Ca nhạc trực tuyến.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {musicEvents.map((event) => (
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

      {/* 🗺️ PHÂN KHU 3: THAM QUAN & WORKSHOP */}
      <section className="space-y-5 border-t border-slate-200/60 pt-8">
        <CustomerSectionTitle
          kicker="KHÁM PHÁ TRẢI NGHIỆM"
          title="Tham Quan, Triển Lãm & Học Tập"
          description="Nâng cao kiến thức và trải nghiệm thực tế với các buổi workshop chọn lọc."
          action={(
            <Link
              to="/customer/events?category=Workshop"
              className="inline-flex items-center gap-1 text-sm font-bold text-indigo-600 hover:underline"
            >
              Xem thêm trải nghiệm
            </Link>
          )}
        />

        {loading ? (
          <div className="flex min-h-[200px] items-center justify-center"><Spin /></div>
        ) : tourEvents.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-12 text-center text-sm text-slate-400 font-medium">
            Chưa có sự kiện thuộc chủ đề Tham quan hoặc Hội thảo.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tourEvents.map((event) => (
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

      {/* 🔥 BẢNG XẾP HẠNG TOP BÁN CHẠY */}
      <section className="space-y-5 border-t border-slate-200/60 pt-8">
        <CustomerSectionTitle
          kicker="XẾP HẠNG THỊ TRƯỜNG"
          title="Top 5 sự kiện bán chạy nhất"
        />

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
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

      {/* 🚀 BOTTOM CTA CONTAINER */}
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-950/40 via-transparent to-slate-950/50 pointer-events-none"></div>
        <div className="flex flex-col items-start gap-6 sm:flex-row sm:items-center sm:justify-between relative z-10">
          <div>
            <h3 className="text-xl font-extrabold text-white tracking-tight">Sẵn sàng cho sự kiện tiếp theo của bạn?</h3>
            <p className="mt-1 text-sm text-slate-300">Đặt vé an toàn, nhận mã QR soát vé cổng tích hợp AI mượt mà.</p>
          </div>

          <div className="flex gap-3 shrink-0">
            <Button
              type="primary"
              size="large"
              className="!h-11 !rounded-xl !border-indigo-600 !bg-indigo-600 !px-6 !font-bold hover:!border-indigo-500 hover:!bg-indigo-500 shadow-md transition-all"
              onClick={() => navigate('/customer/events')}
            >
              Khám phá ngay
            </Button>
            <Button
              size="large"
              className="!h-11 !rounded-xl !border-slate-600 !bg-slate-800/80 !px-6 !font-semibold !text-white hover:!border-slate-400 transition-all"
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