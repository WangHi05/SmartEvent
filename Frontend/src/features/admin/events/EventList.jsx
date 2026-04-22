import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import dayjs from 'dayjs';
import EventForm from './EventForm';

/**
 * Component danh sách Events
 * Đã nâng cấp: Server-side Pagination & Search với kỹ thuật Debounce
 */
const EventList = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });
  
  const [searchText, setSearchText] = useState('');
  // State để lưu từ khóa sau khi đã debounce (ngừng gõ)
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  const [formVisible, setFormVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // KỸ THUẬT DEBOUNCE: Đợi 500ms sau khi người dùng ngừng gõ mới cập nhật từ khóa tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);

    // Cleanup function: Xóa timeout cũ nếu người dùng tiếp tục gõ
    return () => {
      clearTimeout(handler);
    };
  }, [searchText]);

  // Fetch dữ liệu mỗi khi page, pageSize hoặc từ khóa tìm kiếm (đã debounce) thay đổi
  const fetchEvents = useCallback(async (page = 1, pageSize = 10, keyword = '') => {
    setLoading(true);
    try {
      // ĐỔI SANG GỌI API SEARCH CHÚNG TA VỪA TẠO Ở BACKEND
      const response = await axiosClient.get('/events/search', {
        params: { 
          pageNumber: page, 
          pageSize: pageSize,
          keyword: keyword // Truyền từ khóa xuống Database để tìm
        },
      });
      
      const data = response.data || response; // Lấy data an toàn
      
      setEvents(data.items || []);
      setPagination({
        current: data.pageNumber || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Không thể tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  }, []); // useCallback giúp hàm không bị tạo lại liên tục

  // Gọi API lần đầu và mỗi khi debouncedSearch thay đổi
  useEffect(() => {
    // Reset về trang 1 mỗi khi đổi từ khóa tìm kiếm
    fetchEvents(1, pagination.pageSize, debouncedSearch);
  }, [debouncedSearch, fetchEvents]);

  // Xử lý xóa event
  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/events/${id}`);
      message.success('Xóa sự kiện thành công');
      fetchEvents(pagination.current, pagination.pageSize, debouncedSearch);
    } catch (error) {
      console.error('Error deleting event:', error);
      message.error(error.response?.data?.message || 'Không thể xóa sự kiện');
    }
  };

  // Xử lý edit
  const handleEdit = (record) => {
    setSelectedEvent(record);
    setFormVisible(true);
  };

  // Xử lý create
  const handleCreate = () => {
    setSelectedEvent(null);
    setFormVisible(true);
  };

  // Xử lý khi user bấm chuyển trang trên UI
  const handleTableChange = (newPagination) => {
    fetchEvents(newPagination.current, newPagination.pageSize, debouncedSearch);
  };

  // Xử lý quản lý ticket types
  const handleManageTicketTypes = (record) => {
    setSelectedEventForTicketTypes(record);
    setTicketTypesVisible(true);
  };

  // Columns cho table
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
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
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
      title: 'Giá vé',
      dataIndex: 'basePrice',
      key: 'basePrice',
      render: (price) => `${price?.toLocaleString('vi-VN')} VNĐ`,
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: (_, record) => {
        // Tạm thời tính trạng thái theo thời gian. 
        // Sau này có trường Status từ DB sẽ map thẳng enum ở đây
        const now = new Date();
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        
        if (now < start) return <Tag color="blue">Sắp diễn ra</Tag>;
        if (now >= start && now <= end) return <Tag color="green">Đang diễn ra</Tag>;
        return <Tag color="gray">Đã kết thúc</Tag>;
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button type="link" icon={<EditOutlined />} onClick={() => handleEdit(record)}>
            Sửa
          </Button>
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
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between' }}>
        <Input
          placeholder="Tìm kiếm theo tên hoặc mô tả..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Tạo sự kiện mới
        </Button>
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
        onSuccess={() => fetchEvents(pagination.current, pagination.pageSize, debouncedSearch)}
        eventData={selectedEvent}
      />
    </div>
  );
};

export default EventList;