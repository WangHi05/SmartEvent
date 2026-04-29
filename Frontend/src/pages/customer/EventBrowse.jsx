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
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/events/search', {
        params: {
          pageNumber: 1,
          pageSize: 12,
          keyword: searchText,
        },
      });

      const data = response.data || response;
      setEvents(data.items || data.data?.items || []);
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
  }, [searchText]);

  const filteredEvents = useMemo(() => {
    return events.filter((event) => {
      const status = getEventStatusMeta(event);
      const categoryMatch = category === 'Tất cả' || deriveEventCategory(event) === category;
      const statusMatch = statusFilter === 'all' || status.label === statusFilter;
      return categoryMatch && statusMatch;
    });
  }, [category, events, statusFilter]);

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
  };

  return (
    <div className="space-y-8">
      <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-slate-950 text-white shadow-[0_25px_70px_rgba(15,23,42,0.18)]">
        <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-orange-600 px-6 py-8 sm:px-8 lg:px-10">
          <div className="absolute -right-10 top-10 h-44 w-44 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute -left-14 bottom-0 h-56 w-56 rounded-full bg-orange-400/10 blur-3xl" />
          <div className="relative grid gap-6 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
            <div className="space-y-4">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.22em] text-white/80 backdrop-blur-sm">
                <SearchOutlined />
                Khám phá sự kiện
              </div>
              <h1 className="max-w-2xl text-4xl font-black tracking-tight sm:text-5xl">Hero banner lớn, search bar và card premium giống website bán vé chuyên nghiệp.</h1>
              <p className="max-w-2xl text-base leading-8 text-white/75 sm:text-lg">
                Giữ nguyên API, route và nút đặt vé hiện có. Chỉ nâng cấp UI để người dùng duyệt sự kiện nhanh hơn, rõ ràng hơn và đẹp hơn.
              </p>
              <div className="flex flex-wrap gap-3">
                <Button type="primary" size="large" className="!h-12 !rounded-2xl !border-white !bg-white !px-6 !font-semibold !text-slate-950" onClick={() => navigate('/customer/home')}>
                  Về trang chủ
                </Button>
                <Button size="large" className="!h-12 !rounded-2xl !border-white/15 !bg-white/10 !px-6 !font-semibold !text-white hover:!border-white/30 hover:!bg-white/15" onClick={() => navigate('/customer/my-orders')}>
                  Lịch sử đặt vé
                </Button>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Sự kiện hiện có</p>
                <p className="mt-2 text-3xl font-black text-white">{events.length.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Đang diễn ra</p>
                <p className="mt-2 text-3xl font-black text-white">{events.filter((event) => getEventStatusMeta(event).key === 'live').length.toLocaleString('vi-VN')}</p>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.2em] text-white/55">Top bán chạy</p>
                <p className="mt-2 text-3xl font-black text-white">#{events.length ? 1 : '-'}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-4 rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <CustomerSectionTitle
          kicker="Bộ lọc"
          title="Tìm kiếm nhanh theo keyword, danh mục và trạng thái"
          description="Keyword từ thanh header sẽ được đẩy vào đây. Tabs danh mục lọc hoàn toàn client-side, không đổi API."
        />

        <div className="grid gap-4 xl:grid-cols-[1.2fr_0.6fr_0.6fr]">
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
                  ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
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
      ) : filteredEvents.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <Empty description="Không tìm thấy sự kiện nào" />
          <Button
            className="mt-4 !rounded-2xl"
            onClick={() => {
              setSearchText('');
              setCategory('Tất cả');
              setStatusFilter('all');
              setSearchParams({});
            }}
          >
            Xoá bộ lọc
          </Button>
        </div>
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-2">
            {filteredEvents.map((event) => (
              <CustomerEventCard
                key={event.id}
                event={event}
                onViewDetail={() => navigate(`/tickets/booking/${event.id}`)}
                onBookTicket={() => navigate(`/tickets/booking/${event.id}`)}
              />
            ))}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
              <CustomerSectionTitle kicker="Trending" title="Top 3 bán chạy" description="Xếp hạng theo mức độ lấp đầy chỗ ngồi." />
              <div className="mt-4 space-y-4">
                {trendingEvents.map((event, index) => (
                  <div key={event.id} className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-2 flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 font-black text-white">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-slate-950">{event.name}</p>
                        <p className="text-xs text-slate-500">{deriveEventCategory(event)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500">{formatCapacityLabel(event)}</p>
                    <Button className="mt-3 w-full !rounded-2xl" onClick={() => navigate(`/tickets/booking/${event.id}`)}>
                      Xem chi tiết
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 to-orange-600 p-5 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/70">Sắp diễn ra</p>
              <div className="mt-4 space-y-3">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-white/70">Chưa có sự kiện sắp diễn ra.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/tickets/booking/${event.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-left text-sm font-semibold text-white transition hover:bg-white/15"
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
