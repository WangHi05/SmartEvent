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

  const fetchEvents = async () => {
    setLoading(true);
    try {
      let apiStatus = undefined;
      if (statusFilter === 'Sắp diễn ra') apiStatus = 1;
      else if (statusFilter === 'Đang diễn ra') apiStatus = 2;
      else if (statusFilter === 'Đã kết thúc') apiStatus = 3;

      const response = await axiosClient.get('/events/search', {
        params: {
          pageNumber: pageNumber,
          pageSize: 12,
          keyword: searchText || undefined,
          category: category !== 'Tất cả' ? category : undefined,
          status: apiStatus
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
      {/* HERO */}
      <section className="overflow-hidden rounded-xl border border-gray-200 bg-gray-900">
        <div className="grid gap-8 px-6 py-10 sm:px-8 lg:grid-cols-[1.3fr_0.7fr] lg:px-12">
          <div className="space-y-4">
            <span className="inline-flex items-center gap-1.5 rounded bg-green-600 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-white">
              <SearchOutlined />
              Khám phá sự kiện
            </span>

            <h1 className="max-w-2xl text-3xl font-bold leading-tight text-white sm:text-4xl">
              Tìm sự kiện phù hợp với bạn
            </h1>

            <p className="max-w-2xl text-sm leading-6 text-gray-300 sm:text-base">
              Dữ liệu được lọc trực tiếp từ hệ thống theo thời gian thực.
            </p>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="primary"
                size="large"
                className="!h-11 !rounded-lg !border-green-600 !bg-green-600 !px-6 !font-semibold hover:!border-green-700 hover:!bg-green-700"
                onClick={() => navigate('/customer/home')}
              >
                Về trang chủ
              </Button>
              <Button
                size="large"
                className="!h-11 !rounded-lg !border-gray-500 !bg-transparent !px-6 !font-semibold !text-white hover:!border-white"
                onClick={() => navigate('/customer/my-orders')}
              >
                Lịch sử đặt vé
              </Button>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Sự kiện hiện có</p>
              <p className="mt-1.5 text-2xl font-bold text-white">{events.length.toLocaleString('vi-VN')}</p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Đang diễn ra</p>
              <p className="mt-1.5 text-2xl font-bold text-white">
                {events.filter((event) => getEventStatusMeta(event).key === 'live').length.toLocaleString('vi-VN')}
              </p>
            </div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-4">
              <p className="text-xs uppercase tracking-wide text-gray-400">Top bán chạy</p>
              <p className="mt-1.5 text-2xl font-bold text-white">#{events.length ? 1 : '-'}</p>
            </div>
          </div>
        </div>
      </section>

      {/* FILTERS */}
      <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 lg:p-6">
        <CustomerSectionTitle
          kicker="Bộ lọc"
          title="Tìm theo từ khoá, danh mục và trạng thái"
        />

        <div className="grid gap-3 xl:grid-cols-[1.4fr_0.8fr_0.8fr]">
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
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                category === item.label
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </section>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Spin size="large" tip="Đang tải..." />
        </div>
      ) : events.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Empty description="Không tìm thấy sự kiện nào" />
          <Button
            className="mt-4 !rounded-lg"
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
            <div className="grid items-stretch gap-4 sm:grid-cols-2 xl:grid-cols-3">
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
              <div className="mt-10 flex items-center justify-center gap-3 border-t border-gray-200 pt-6">
                <Button
                  size="large"
                  onClick={() => setPageNumber((prev) => Math.max(prev - 1, 1))}
                  disabled={pageNumber <= 1}
                  className="!rounded-lg !font-medium !text-gray-600 hover:!border-green-500 hover:!text-green-700"
                >
                  Trang trước
                </Button>

                <div className="flex items-center justify-center rounded-lg border border-gray-200 bg-gray-50 px-4 py-2 text-sm font-medium text-gray-600">
                  Trang {pageNumber} / {totalPages}
                </div>

                <Button
                  type="primary"
                  size="large"
                  onClick={() => setPageNumber((prev) => Math.min(prev + 1, totalPages))}
                  disabled={pageNumber >= totalPages}
                  className="!rounded-lg !border-green-600 !bg-green-600 !font-medium hover:!border-green-700 hover:!bg-green-700"
                >
                  Trang sau
                </Button>
              </div>
            )}
          </div>

          <aside className="space-y-4 xl:sticky xl:top-24 xl:self-start">
            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <CustomerSectionTitle kicker="Trending" title="Top 3 bán chạy" />
              <div className="mt-4 space-y-3">
                {trendingEvents.map((event, index) => (
                  <div key={event.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-2 flex items-center gap-2.5">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gray-900 text-sm font-bold text-white">
                        #{index + 1}
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-gray-900">{event.name}</p>
                        <p className="text-xs text-gray-500">{deriveEventCategory(event)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-gray-500">{formatCapacityLabel(event)}</p>
                    <Button
                      size="small"
                      className="mt-2.5 w-full !rounded-lg !border-gray-300 !text-gray-700 hover:!border-green-500 hover:!text-green-700"
                      onClick={() => navigate(`/event/${event.slug || 'su-kien'}/${event.id}`)}
                    >
                      Xem chi tiết
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-gray-200 bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Sắp diễn ra</p>
              <div className="mt-3 space-y-2">
                {upcomingEvents.length === 0 ? (
                  <p className="text-sm text-gray-500">Chưa có sự kiện sắp diễn ra.</p>
                ) : (
                  upcomingEvents.map((event) => (
                    <button
                      key={event.id}
                      onClick={() => navigate(`/tickets/booking/${event.id}`)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2.5 text-left text-sm font-medium text-gray-700 transition hover:border-green-500 hover:text-green-700"
                    >
                      <span className="line-clamp-1">{event.name}</span>
                      <ArrowRight size={15} className="shrink-0" />
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