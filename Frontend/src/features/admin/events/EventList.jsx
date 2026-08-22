import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Input, Select, DatePicker, Tabs } from 'antd';
import ArchivedEvents from './ArchivedEvents';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined, CheckCircleOutlined } from '@ant-design/icons';  
import axiosClient from '../../../api/axiosClient';
import * as signalR from '@microsoft/signalr';
import dayjs from 'dayjs';
import EventForm from './EventForm';
import { formatVietnamDateTime } from '../../../utils/vietnamTime';

const { RangePicker } = DatePicker;

const EVENT_STATUS = {
  Active: 1,
  Ongoing: 2,
  PendingApproval: 5,
  Archived: 6,
};

const statusColorMap = {
  [EVENT_STATUS.Active]: 'blue',
  [EVENT_STATUS.Ongoing]: 'green',
  [EVENT_STATUS.PendingApproval]: 'gold',
  [EVENT_STATUS.Archived]: 'purple',
};

const statusLabelMap = {
  [EVENT_STATUS.Active]: 'Sắp diễn ra',
  [EVENT_STATUS.Ongoing]: 'Đang diễn ra',
  [EVENT_STATUS.PendingApproval]: 'Chờ duyệt',
  [EVENT_STATUS.Archived]: 'Đã lưu trữ',
};

const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(undefined);
  const [dateRange, setDateRange] = useState(null);

  const [formVisible, setFormVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // KỸ THUẬT DEBOUNCE
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const fetchEvents = useCallback(async (
    page = 1,
    pageSize = 10,
    keyword = '',
    status = statusFilter,
    range = dateRange,
    isSilent = false,
  ) => {
    if (!isSilent) setLoading(true);

    try {
      const params = {
        pageNumber: page,
        pageSize: pageSize,
        keyword: keyword,
        includeAll: true,
      };

      if (status !== undefined && status !== null) {
        params.status = status;
      }

      if (range && range[0] && range[1]) {
        params.fromDate = range[0].startOf('day').toISOString();
        params.toDate = range[1].endOf('day').toISOString();
      }

      const response = await axiosClient.get('/events/search', { params });

      const data = response.data || response;
      setEvents(data.items || []);
      setPagination(prev => ({
        ...prev,
        current: data.pageNumber || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      }));
    } catch (error) {
      console.error('Error fetching events:', error);
      if (!isSilent) message.error('Không thể tải danh sách sự kiện. Vui lòng kiểm tra kết nối Backend.');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [statusFilter, dateRange]);

  // Gọi API lần đầu + mỗi khi filter đổi
  useEffect(() => {
    fetchEvents(1, pagination.pageSize, debouncedSearch, statusFilter, dateRange);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, statusFilter, dateRange]);

  // CƠ CHẾ SIGNALR: Lắng nghe thay đổi Real-time
  useEffect(() => {
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const baseUrl = configuredBaseUrl
      ? configuredBaseUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '')
      : import.meta.env.PROD
        ? window.location.origin
        : 'http://localhost:5013';
    const hubUrl = `${baseUrl}/gateHub`;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect()
      .build();

    connection.on("TicketCheckedIn", (data) => {
      console.log("⚡ Nhận dữ liệu Real-time:", data);

      setEvents(prevEvents => prevEvents.map(evt =>
        evt.id === data.eventId
          ? { ...evt, currentOccupancy: data.newOccupancy, isFull: data.isFull }
          : evt
      ));
    });

    // Backend tự động chuyển trạng thái Event (Active -> Ongoing -> Archived) mỗi phút
    // qua Hangfire, rồi bắn sự kiện này — Frontend chỉ cần tải lại danh sách, không cần F5.
    connection.on("EventStatusChanged", (data) => {
      console.log("⚡ Trạng thái sự kiện thay đổi:", data);
      fetchEvents(pagination.current, pagination.pageSize, debouncedSearch, statusFilter, dateRange, true);
    });

    connection.start()
      .then(() => console.log('✅ Đã kết nối SignalR Real-time Dashboard'))
      .catch(err => console.error('❌ Lỗi kết nối SignalR: ', err));

    return () => {
      connection.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/events/${id}`);
      message.success('Xóa sự kiện thành công');
      fetchEvents(pagination.current, pagination.pageSize, debouncedSearch, statusFilter, dateRange);
    } catch (error) {
      console.error('Error deleting event:', error);
      message.error(error.response?.data?.message || 'Không thể xóa sự kiện');
    }
  };

  const handleApprove = async (id) => {
    try {
      await axiosClient.post(`/events/${id}/approve`);
      message.success('Đã duyệt sự kiện, giờ khách hàng có thể xem được');
      fetchEvents(pagination.current, pagination.pageSize, debouncedSearch, statusFilter, dateRange);
    } catch (error) {
      console.error('Error approving event:', error);
      message.error(error.response?.data?.message || 'Không thể duyệt sự kiện');
    }
  };

  const handleEdit = (record) => {
    setSelectedEvent(record);
    setFormVisible(true);
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setFormVisible(true);
  };

  const handleTableChange = (newPagination) => {
    fetchEvents(newPagination.current, newPagination.pageSize, debouncedSearch, statusFilter, dateRange);
  };

  const handleResetFilters = () => {
    setSearchText('');
    setStatusFilter(undefined);
    setDateRange(null);
  };

  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'name',
      key: 'name',
      render: (text) => <strong>{text}</strong>,
    },
    {
      title: 'Địa điểm',
      dataIndex: 'location',
      key: 'location',
    },
    {
      title: 'Thời gian bắt đầu',
      dataIndex: 'startTime',
      key: 'startTime',
      render: (date) => formatVietnamDateTime(date),
    },
    {
      title: 'Sức chứa',
      key: 'capacity',
      render: (_, record) => (
        <span>
          {record.currentOccupancy} / {record.maxCapacity}
          {record.isFull && <Tag color="red" style={{ marginLeft: 8 }}>Hết chỗ</Tag>}
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => (
        <Tag color={statusColorMap[record.status] || 'default'}>
          {statusLabelMap[record.status] || 'Không xác định'}
        </Tag>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 260,
      render: (_, record) => (
        <Space size="small" wrap>
          {record.status === EVENT_STATUS.PendingApproval && (
            <Popconfirm
              title="Duyệt sự kiện này?"
              description="Sự kiện sẽ hiển thị cho khách hàng ngay sau khi duyệt."
              onConfirm={() => handleApprove(record.id)}
              okText="Duyệt"
              cancelText="Hủy"
            >
              <Button type="link" icon={<CheckCircleOutlined />} style={{ color: '#52c41a' }}>
                Duyệt
              </Button>
            </Popconfirm>
          )}
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Sửa
          </Button>
          {record.status === EVENT_STATUS.PendingApproval && (
            <Popconfirm
              title="Xác nhận xóa sự kiện?"
              description="Bạn có chắc chắn muốn xóa sự kiện này không?"
              onConfirm={() => handleDelete(record.id)}
              okText="Xóa"
              cancelText="Hủy"
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Xóa
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  const eventManagementContent = (
    <div>
      <div style={{ marginBottom: 16, display: 'flex', flexWrap: 'wrap', gap: 12, justifyContent: 'space-between', alignItems: 'center' }}>
        <Space wrap>
          <Input
            placeholder="Tìm kiếm theo tên hoặc mô tả..."
            prefix={<SearchOutlined />}
            style={{ width: '100%', maxWidth: 280 }}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
          <Select
            placeholder="Lọc trạng thái"
            style={{ width: 170 }}
            allowClear
            value={statusFilter}
            onChange={(value) => setStatusFilter(value)}
            options={[
            { value: EVENT_STATUS.Active, label: 'Sắp diễn ra' },
            { value: EVENT_STATUS.Ongoing, label: 'Đang diễn ra' },
          ]}
          />
          <RangePicker
            placeholder={['Từ ngày', 'Đến ngày']}
            value={dateRange}
            onChange={(range) => setDateRange(range)}
            format="DD/MM/YYYY"
          />
          {(statusFilter !== undefined || dateRange || searchText) && (
            <Button onClick={handleResetFilters}>Xóa bộ lọc</Button>
          )}
        </Space>
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchEvents(pagination.current, pagination.pageSize, debouncedSearch, statusFilter, dateRange)}>
            Refresh
          </Button>
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            Tạo sự kiện mới
          </Button>
        </Space>
      </div>

      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng cộng ${total} sự kiện`
        }}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />
      <EventForm
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setSelectedEvent(null);
        }}
        onSuccess={() => fetchEvents(pagination.current, pagination.pageSize, debouncedSearch, statusFilter, dateRange)}
        eventData={selectedEvent}
      />
    </div>
  );

  return (
    <div style={{ padding: '24px' }}>
      <Tabs
        defaultActiveKey="manage"
        items={[
          { key: 'manage', label: 'Quản lý sự kiện', children: eventManagementContent },
          { key: 'archived', label: 'Sự kiện đã lưu trữ', children: <ArchivedEvents /> },
        ]}
      />
    </div>
  );
};

export default EventList;