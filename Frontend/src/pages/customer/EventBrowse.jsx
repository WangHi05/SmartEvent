import React, { useEffect, useMemo, useState } from 'react';
import { Button, Empty, Input, Select, Spin, message } from 'antd';
import { FilterOutlined, SearchOutlined } from '@ant-design/icons';
import { ArrowRight } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axiosClient from '../../api/axiosClient';
import {
  CustomerEventCard,
  CustomerSectionTitle,
  EVENT_CATEGORIES,
  deriveEventCategory,
  formatCapacityLabel,
  getCapacityPercent,
  getEventStatusMeta,
} from '../../components/customer/CustomerPrimitives';

const EventBrowse = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [category, setCategory] = useState('Tất cả');
  const [statusFilter, setStatusFilter] = useState('all');

  const [pageNumber, setPageNumber] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // 🔄 HÀM FETCH DATA ĐÃ ĐƯỢC VÁ LỖI BỘ LỌC CHÍ MẠNG
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Chỉ gửi keyword lên Server, không gửi category và status tiếng Việt sai lệch
      const response = await axiosClient.get('/events/search', {
        params: {
          pageNumber: 1,
          pageSize: 100, // Lấy cụm pool lớn để lọc client-side chính xác theo logic DB
          keyword: searchText || undefined,
        },
      });

      const data = response.data || response;
      const rawItems = data.items || data.data?.items || [];

      // 👉 TIẾN HÀNH LỌC THÔNG MINH BẰNG CHÍNH LOGIC KHỚP TỪ KHÓA CỦA HAI BẠN
      const filteredEvents = rawItems.filter((event) => {
        // 1. Kiểm tra danh mục
        if (category !== 'Tất cả') {
          const eventCat = deriveEventCategory(event);
          if (eventCat !== category) return false;
        }
        
        // 2. Kiểm tra trạng thái thời gian thực
        if (statusFilter !== 'all') {
          const eventStatus = getEventStatusMeta(event);
          if (statusFilter === 'Sắp diễn ra' && eventStatus.key !== 'upcoming') return false;
          if (statusFilter === 'Đang diễn ra' && eventStatus.key !== 'live') return false;
          if (statusFilter === 'Đã kết thúc' && eventStatus.key !== 'ended') return false;
        }
        return true;
      });

      // Tính toán lại tổng số trang dựa trên tập dữ liệu thực tế sau khi lọc
      const limit = 12;
      setTotalPages(Math.max(1, Math.ceil(filteredEvents.length / limit)));

      // Cắt mảng để hiển thị đúng trang hiện tại (Client-side Pagination bảo bọc an toàn)
      setEvents(filteredEvents.slice((pageNumber - 1) * limit, pageNumber * limit));

    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Không thể tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const keyword = searchParams.get('keyword') || '';
    const nextCategory = searchParams.get('category') || 'Tất cả';
    const nextStatus = searchParams.get('status') || 'all';

    if (keyword !== searchText) setSearchText(keyword);
    if (nextCategory !== category) setCategory(nextCategory);
    if (nextStatus !== statusFilter) setStatusFilter(nextStatus);
  }, [searchParams]);

  useEffect(() => {
    const timer = setTimeout(fetchEvents, 350);
    return () => clearTimeout(timer);
  }, [searchText, pageNumber, category, statusFilter]);

  const trendingEvents = useMemo(
    () => [...events].sort((a, b) => getCapacityPercent(b) - getCapacityPercent(a)).slice(0, 3),
    [events]
  );

  const upcomingEvents = useMemo(
    () => [...events].filter((event) => getEventStatusMeta(event).key === 'upcoming').slice(0, 6),
    [events]
  );

  const applySearchParams = (nextKeyword, nextCategory, nextStatus) => {
    const params = {};
    if (nextKeyword) params.keyword = nextKeyword;
    if (nextCategory && nextCategory !== 'Tất cả') params.category = nextCategory;
    if (nextStatus && nextStatus !== 'all') params.status = nextStatus;
    setSearchParams(params);
    setPageNumber(1);
  };

  return (
    <div className="space-y-8">
      {/* HERO HERO */}
      <section className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-lg relative min-h-[340px] flex items-center bg-slate-950">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-100 pointer-events-none transition-all duration-1000 h-full w-full"
          style={{ backgroundImage: `url('https://images.unsplash.com/photo-1511578314322-379afb476865?q=80&w=1200&auto=format&fit=crop')` }}
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/30 via-black/10 to-transparent pointer-events-none h-full w-full" />

        <div className="w-full grid gap-6 px-6 py-8 sm:px-8 lg:grid-cols-[1.3fr_0.7fr] lg:px-12 relative z-10">
          <div className="space-y-4 bg-slate-950/70 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-white/15 shadow-2xl text-white">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-orange-500/30 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-orange-200 border border-orange-400/20">
              <SearchOutlined size={12} />
              Khám phá sự kiện
            </span>

            <h1 className="text-2xl font-black leading-tight text-white sm:text-3xl tracking-tight">
              Tìm sự kiện phù hợp với bạn
            </h1>

            <p className="text-xs leading-relaxed text-slate-200 sm:text-sm font-normal">
              Dữ liệu được lọc trực tiếp từ hệ thống theo thời gian thực.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Button
                type="primary"
                size="large"
                className="!h-10 !rounded-xl !border-orange-600 !bg-orange-600 !px-5 !text-xs !font-bold hover:!border-orange-500 hover:!bg-orange-500 shadow-md transition-all transform hover:scale-[1.01]"
                onClick={() => navigate('/customer/home')}
              >
                Về trang chủ
              </Button>
              <Button
                size="large"
                className="!h-10 !rounded-xl !border-white/30 !bg-white/10 !px-5 !text-xs !font-semibold !text-white hover:!border-white hover:!bg-white/20 transition-all backdrop-blur-sm shadow-sm"
                onClick={() => navigate('/customer/my-orders')}
              >
                Lịch sử đặt vé
              </Button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-1 h-fit self-center">
            <div className="rounded-xl border border-white/15 bg-slate-950/70 backdrop-blur-md p-3.5 shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Sự kiện hiện có</p>
              <p className="mt-0.5 text-xl font-black text-white tracking-tight">{events.length.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-xl border border-white/15 bg-slate-950/70 backdrop-blur-md p-3.5 shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Đang diễn ra</p>
              <p className="mt-0.5 text-xl font-black text-white tracking-tight">
                {events.filter((event) => getEventStatusMeta(event).key === 'live').length.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="rounded-xl border border-white/15 bg-slate-950/70 backdrop-blur-md p-3.5 shadow-2xl">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Top bán chạy</p>
              <p className="mt-0.5 text-xl font-black text-white tracking-tight">#{events.length ? 1 : '-'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 lg:p-6 shadow-sm">
        <CustomerSectionTitle
          kicker="Bộ lọc"
          title="Tìm theo từ khoá, danh mục và trạng thái"
        />

        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <Input.Search
            placeholder="Tìm kiếm sự kiện, nghệ sĩ, workshop..."
            prefix={<SearchOutlined className="text-slate-400" />}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => applySearchParams(value, category, statusFilter)}
            allowClear
            className="custom-search-input"
          />

          <Select
            value={category}
            onChange={(value) => {
              setCategory(value);
              applySearchParams(searchText, value, statusFilter);
            }}
            size="large"
            prefix={<FilterOutlined />}
            options={EVENT_CATEGORIES.map((item) => ({ label: item.label, value: item.label }))}
          />

          <Select
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              applySearchParams(searchText, category, value);
            }}
            size="large"
            options={[
              { label: 'Tất cả trạng thái', value: 'all' },
              { label: 'Sắp diễn ra', value: 'Sắp diễn ra' },
              { label: 'Đang diễn ra', value: 'Đang diễn ra' },
              { label: 'Đã kết thúc', value: 'Đã kết thúc' },
            ]}
          />
        </div>

        <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100 pt-3">
          {EVENT_CATEGORIES.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setCategory(item.label);
                applySearchParams(searchText, item.label, statusFilter);
              }}
              className={`rounded-full px-4 py-1.5 text-xs font-bold transition-all shadow-sm ${
                category === item.label
                  ? 'bg-orange-600 text-white'
                  : 'bg-slate-50 text-slate-600 border border-slate-200/60 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[240px] items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
          <Empty description={<span className="text-slate-400 font-medium">Không tìm thấy sự kiện nào phù hợp</span>} />
          <Button
            className="mt-4 !rounded-xl !h-9 !font-bold !text-slate-700 !border-slate-200 hover:!border-orange-500 hover:!text-orange-600 transition-all shadow-none"
            onClick={() => {
              setSearchText('');
              setCategory('Tất cả');
              setStatusFilter('all');
              setSearchParams({});
              setPageNumber(1);
            }}
          >
            Xoá bộ lọc
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="flex flex-col">
            <div className="grid items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <CustomerEventCard
                  key={event.id}
                  event={event}
                  onViewDetail={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
                  onBookTicket={() => navigate(`/tickets/booking/${event.slug || 'su-kien'}/${event.id}`)}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-10 flex items-center justify-center gap-3 border-t border-slate-200 pt-6">
                <Button
                  size="large"
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="!rounded-xl !font-bold !text-slate-700 !border-slate-200 hover:!border-orange-500 hover:!text-orange-600 transition-all shadow-none"
                >
                  Trang trước
                </Button>

                <div className="flex items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm">
                  Trang {pageNumber} / {totalPages}
                </div>

                <Button
                  type="primary"
                  size="large"
                  onClick={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
                  disabled={pageNumber >= totalPages}
                  className="!rounded-xl !border-orange-600 !bg-orange-600 !font-bold hover:!border-orange-500 hover:!bg-orange-500 text-white shadow-sm transition-all"
                >
                  Trang sau
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <CustomerSectionTitle kicker="Trending" title="Top 3 bán chạy" />
              <div className="mt-4 space-y-3">
                {trendingEvents.map((event, index) => (
                  <div key={event.id} className="rounded-xl border border-slate-100 bg-slate-50/60 p-3.5 space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-black ${index === 0 ? 'bg-orange-600 text-white' : 'bg-slate-200 text-slate-600'}`}>
                        #{index + 1}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-slate-800">{event.name}</p>
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wide">{deriveEventCategory(event)}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500 border-t border-slate-200/50 pt-2">
                      <span>{formatCapacityLabel(event)}</span>
                    </div>
                    <Button
                      size="small"
                      className="w-full !h-8 !rounded-xl !border-slate-200 !text-xs !font-bold !text-slate-700 hover:!border-orange-500 hover:!text-orange-600 transition-all shadow-none"
                      onClick={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">Sắp diễn ra</p>
              <div className="space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-xs font-semibold text-slate-400 bg-slate-50 p-4 rounded-xl text-center border border-dashed border-slate-200">Chưa có sự kiện sắp diễn ra.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/tickets/booking/${event.slug || 'su-kien'}/${event.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-xl border border-slate-200 px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 bg-slate-50/40 hover:border-orange-500 hover:text-orange-600 transition-all hover:bg-white shadow-sm"
                    >
                      <span className="line-clamp-1 flex-1">{event.name}</span>
                      <ArrowRight size={14} className="shrink-0 text-slate-400" />
                    </button>
                  ))
                )}
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
};

export default EventBrowse;