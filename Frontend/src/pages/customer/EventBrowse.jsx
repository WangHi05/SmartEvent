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

  // Fetch events: GỬI TOÀN BỘ ĐIỀU KIỆN LỌC XUỐNG BACKEND
  const fetchEvents = async () => {
    setLoading(true);
    try {
      // Chuyển đổi trạng thái text sang enum/số để Backend dễ hiểu
      let apiStatus = undefined;
      if (statusFilter === 'Sắp diễn ra') apiStatus = 1;
      else if (statusFilter === 'Đang diễn ra') apiStatus = 2;
      else if (statusFilter === 'Đã kết thúc') apiStatus = 3;

      const response = await axiosClient.get('/events/search', {
        params: {
          pageNumber: pageNumber,
          pageSize: 12,
          keyword: searchText || undefined,
          category: category !== 'Tất cả' ? category : undefined, // Gửi category xuống API
          status: apiStatus // Gửi status xuống API
        },
      });

      const data = response.data || response;
      setEvents(data.items || data.data?.items || []);

      if (data.totalPages) {
        setTotalPages(data.totalPages);
      } else if (data.data?.totalPages) {
        setTotalPages(data.data.totalPages);
      } else if (data.totalCount || data.data?.totalCount) {
        const count = data.totalCount || data.data?.totalCount;
        setTotalPages(Math.ceil(count / 12));
      } else {
        setTotalPages(1); 
      }

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

  // Lắng nghe sự thay đổi của TẤT CẢ các bộ lọc để gọi lại API
  useEffect(() => {
    const timer = setTimeout(fetchEvents, 350);
    return () => clearTimeout(timer);
  }, [searchText, pageNumber, category, statusFilter]); 

  // XÓA BỎ LỌC TRÊN CLIENT SIDE - Sử dụng trực tiếp mảng events từ Backend trả về

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
    
    // Đặt lại về trang 1 khi người dùng thay đổi tiêu chí tìm kiếm/lọc
    setPageNumber(1); 
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[36px] border border-slate-200 bg-slate-950 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950 to-blue-700 px-6 py-10 sm:px-8 lg:px-12 xl:px-14">
          <div className="absolute -right-10 top-10 h-44 w-44 rounded-full bg-purple-400/15 blur-3xl" />
          <div className="absolute -left-14 bottom-0 h-56 w-56 rounded-full bg-sky-400/15 blur-3xl" />
          <div className="relative grid gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="space-y-5">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-sm">
                <SearchOutlined />
                Khám phá sự kiện
              </div>
              <h1 className="max-w-3xl text-4xl font-black tracking-tight sm:text-5xl xl:text-6xl">Premium Event Platform cho trải nghiệm khám phá sự kiện chuyên nghiệp hơn.</h1>
              <p className="max-w-3xl text-base leading-8 text-white/75 sm:text-lg xl:text-xl">
                Dữ liệu giờ đây đã được lọc trực tiếp từ Database (Server-side) giúp loại bỏ tình trạng đứt quãng trang.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="primary" size="large" className="!h-12 !rounded-2xl !border-white !bg-white !px-6 !font-semibold !text-slate-950 hover:!border-slate-100 hover:!bg-slate-50" onClick={() => navigate('/customer/home')}>
                  Về trang chủ
                </Button>
                <Button size="large" className="!h-12 !rounded-2xl !border-white/15 !bg-slate-950/20 !px-6 !font-semibold !text-white hover:!border-white/25 hover:!bg-white/15" onClick={() => navigate('/customer/my-orders')}>
                  Lịch sử đặt vé
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">

              <div className="rounded-[24px] border border-white/16 bg-white/8 p-4 backdrop-blur-md">

                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Sự kiện hiện có</p>

                <p className="mt-2 text-3xl font-black text-white">{events.length.toLocaleString('vi-VN')}</p>

              </div>

              <div className="rounded-[24px] border border-white/16 bg-white/8 p-4 backdrop-blur-md">

                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Đang diễn ra</p>

                <p className="mt-2 text-3xl font-black text-white">{events.filter((event) => getEventStatusMeta(event).key === 'live').length.toLocaleString('vi-VN')}</p>

              </div>

              <div className="rounded-[24px] border border-white/16 bg-white/8 p-4 backdrop-blur-md">

                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Top bán chạy</p>

                <p className="mt-2 text-3xl font-black text-white">#{events.length ? 1 : '-'}</p>

              </div>

            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[30px] border border-slate-200 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] lg:p-7">
        <CustomerSectionTitle
          kicker="Bộ lọc"
          title="Tìm kiếm nhanh theo keyword, danh mục và trạng thái"
          description="Dữ liệu lọc được gửi thẳng xuống máy chủ để xử lý tốc độ cao."
        />

        <div className="grid gap-4 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
          <Input.Search
            placeholder="Tìm kiếm sự kiện, nghệ sĩ, workshop..."
            prefix={<SearchOutlined />}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            onSearch={(value) => applySearchParams(value, category, statusFilter)}
            allowClear
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

        <div className="flex flex-wrap gap-2">
          {EVENT_CATEGORIES.map((item) => (
            <button
              key={item.value}
              onClick={() => {
                setCategory(item.label);
                applySearchParams(searchText, item.label, statusFilter);
              }}
              className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                category === item.label
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-700'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white">
          <Spin size="large" tip="Đang tải..." />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <Empty description="Không tìm thấy sự kiện nào" />
          <Button
            className="mt-4 !rounded-2xl"
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
        <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
          <div className="flex flex-col">
            <div className="grid items-stretch gap-8 sm:grid-cols-2 xl:grid-cols-3">
              {events.map((event) => (
                <CustomerEventCard
                  key={event.id}
                  event={event}
                  onViewDetail={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
                  onBookTicket={() => navigate(`/tickets/booking/${event.slug || 'su-kien'}/${event.id}`)}
                />
              ))}
            </div>

            {/* Bộ UI Nút Phân Trang */}
            {totalPages > 1 && (
              <div className="mt-12 flex items-center justify-center gap-3 border-t border-slate-200 pt-8">
                <Button 
                  size="large" 
                  onClick={() => setPageNumber(prev => Math.max(prev - 1, 1))} 
                  disabled={pageNumber <= 1}
                  className="!rounded-xl font-semibold !text-slate-600 hover:!text-blue-600 hover:!border-blue-300"
                >
                  Trang trước
                </Button>
                
                <div className="flex items-center justify-center rounded-xl bg-slate-50 px-5 py-2.5 text-sm font-semibold text-slate-600 border border-slate-200 shadow-sm">
                  Trang {pageNumber} / {totalPages}
                </div>
                
                <Button 
                  type="primary" 
                  size="large" 
                  onClick={() => setPageNumber(prev => Math.min(prev + 1, totalPages))} 
                  disabled={pageNumber >= totalPages}
                  className="!rounded-xl font-semibold !bg-blue-600 hover:!bg-blue-700 shadow-lg shadow-blue-600/20"
                >
                  Trang sau
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-5 xl:sticky xl:top-28 xl:self-start">
            <div className="rounded-[30px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <CustomerSectionTitle kicker="Trending" title="Top 3 bán chạy" description="Xếp hạng theo mức độ lấp đầy chỗ ngồi." />
              <div className="mt-4 space-y-4">
                {trendingEvents.map((event, index) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-sky-400 font-black text-white">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{event.name}</p>
                        <p className="text-xs text-slate-500">{deriveEventCategory(event)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{formatCapacityLabel(event)}</p>
                    <Button className="mt-3 w-full !rounded-2xl !border-slate-300 !text-slate-700 hover:!border-blue-300 hover:!text-blue-700 hover:!bg-blue-50" onClick={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}>
                      Xem chi tiết
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[30px] border border-slate-200 bg-gradient-to-br from-slate-950 to-blue-950 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Sắp diễn ra</p>
              <div className="mt-4 space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-white/70">Chưa có sự kiện sắp diễn ra.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/tickets/booking/${event.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:border-white/20 hover:bg-white/15"
                    >
                      <span className="line-clamp-1">{event.name}</span>
                      <ArrowRight />
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