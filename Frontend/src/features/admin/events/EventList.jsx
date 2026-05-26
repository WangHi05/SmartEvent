import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Space, Tag, Popconfirm, message, Input } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import * as signalR from '@microsoft/signalr';
import dayjs from 'dayjs';
import EventForm from './EventForm';
import { formatVietnamDateTime } from '../../../utils/vietnamTime';

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
  
  const [formVisible, setFormVisible] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // KỸ THUẬT DEBOUNCE
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const fetchEvents = useCallback(async (page = 1, pageSize = 10, keyword = '', isSilent = false) => {
    if (!isSilent) setLoading(true);
    
    try {
      const response = await axiosClient.get('/events/search', {
        params: { pageNumber: page, pageSize: pageSize, keyword: keyword },
      });
      
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
  }, []); 

  // Gọi API lần đầu
  useEffect(() => {
    fetchEvents(1, pagination.pageSize, debouncedSearch);
  }, [debouncedSearch, fetchEvents]);

  // CƠ CHẾ SIGNALR: Lắng nghe thay đổi Real-time 
  useEffect(() => {
    const connection = new signalR.HubConnectionBuilder()
      .withUrl("http://localhost:5013/gateHub")
      .withAutomaticReconnect()
      .build();

    connection.on("TicketCheckedIn", (data) => {
      console.log("⚡ Nhận dữ liệu Real-time:", data);
      
      // Update UI ngay lập tức mà không cần gọi lại API GET
      setEvents(prevEvents => prevEvents.map(evt => 
        evt.id === data.eventId 
          ? { ...evt, currentOccupancy: data.newOccupancy, isFull: data.isFull } 
          : evt
      ));
    });

    connection.start()
      .then(() => console.log('✅ Đã kết nối SignalR Real-time Dashboard'))
      .catch(err => console.error('❌ Lỗi kết nối SignalR: ', err));

    // Cleanup khi rời khỏi trang
    return () => {
      connection.stop();
    };
  }, []);

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

  const handleEdit = (record) => {
    setSelectedEvent(record);
    setFormVisible(true);
  };

  const handleCreate = () => {
    setSelectedEvent(null);
    setFormVisible(true);
  };

  const handleTableChange = (newPagination) => {
    fetchEvents(newPagination.current, newPagination.pageSize, debouncedSearch);
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
      render: (_, record) => {
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
      <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Input
          placeholder="Tìm kiếm theo tên hoặc mô tả..."
          prefix={<SearchOutlined />}
          style={{ width: 300 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
        <Space>
          <Button icon={<ReloadOutlined />} onClick={() => fetchEvents(pagination.current, pagination.pageSize, debouncedSearch)}>
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
        onSuccess={() => fetchEvents(pagination.current, pagination.pageSize, debouncedSearch)}
        eventData={selectedEvent}
      />
    </div>
  );
};

export default EventList;