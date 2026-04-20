import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import apiClient from '../../../services/apiClient';
import dayjs from 'dayjs';
import EventForm from './EventForm';

/**
 * Component danh sách Events với chức năng CRUD
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
  const [formVisible, setFormVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // Fetch danh sách events
  const fetchEvents = async (page = 1, pageSize = 10) => {
    setLoading(true);
    try {
      const response = await apiClient.get('/api/events', {
        params: { pageNumber: page, pageSize },
      });
      setEvents(response.data.items);
      setPagination({
        current: response.data.pageNumber,
        pageSize: response.data.pageSize,
        total: response.data.totalCount,
      });
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Không thể tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  // Xử lý xóa event
  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/api/events/${id}`);
      message.success('Xóa sự kiện thành công');
      fetchEvents(pagination.current, pagination.pageSize);
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

  // Xử lý phân trang
  const handleTableChange = (newPagination) => {
    fetchEvents(newPagination.current, newPagination.pageSize);
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
      filteredValue: searchText ? [searchText] : null,
      onFilter: (value, record) =>
        record.name.toLowerCase().includes(value.toLowerCase()),
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
      sorter: (a, b) => new Date(a.startTime) - new Date(b.startTime),
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
      render: (_, record) => {
        const now = new Date();
        const start = new Date(record.startTime);
        const end = new Date(record.endTime);
        
        if (now < start) {
          return <Tag color="blue">Sắp diễn ra</Tag>;
        } else if (now >= start && now <= end) {
          return <Tag color="green">Đang diễn ra</Tag>;
        } else {
          return <Tag color="gray">Đã kết thúc</Tag>;
        }
      },
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
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
          placeholder="Tìm kiếm theo tên sự kiện"
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={handleCreate}
        >
          Tạo sự kiện mới
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      <EventForm
        visible={formVisible}
        onClose={() => {
          setFormVisible(false);
          setSelectedEvent(null);
        }}
        onSuccess={() => fetchEvents(pagination.current, pagination.pageSize)}
        eventData={selectedEvent}
      />
    </div>
  );
};

export default EventList;
