import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Tag, Popconfirm, message, Input } from 'antd';
import { UndoOutlined, SearchOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import { formatVietnamDateTime } from '../../../utils/vietnamTime';

const ArchivedEvents = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');

  // Debounce ô tìm kiếm
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 500);
    return () => clearTimeout(handler);
  }, [searchText]);

  const fetchArchivedEvents = useCallback(async (page = 1, pageSize = 10, keyword = '') => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/events/archived', {
        params: { pageNumber: page, pageSize, keyword: keyword || undefined },
      });

      const data = response.data || response;
      setEvents(data.items || []);
      setPagination((prev) => ({
        ...prev,
        current: data.pageNumber || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      }));
    } catch (error) {
      console.error('Error fetching archived events:', error);
      message.error('Không thể tải danh sách sự kiện đã lưu trữ');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchArchivedEvents(1, pagination.pageSize, debouncedSearch);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch]);

  const handleUnarchive = async (id) => {
    try {
      await axiosClient.post(`/events/${id}/unarchive`);
      message.success('Đã khôi phục sự kiện thành công');
      fetchArchivedEvents(pagination.current, pagination.pageSize, debouncedSearch);
    } catch (error) {
      console.error('Error unarchiving event:', error);
      message.error(error.response?.data?.message || 'Không thể khôi phục sự kiện');
    }
  };

  const handleTableChange = (newPagination) => {
    fetchArchivedEvents(newPagination.current, newPagination.pageSize, debouncedSearch);
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
        </span>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'status',
      render: () => <Tag color="purple">Đã lưu trữ</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      fixed: 'right',
      width: 160,
      render: (_, record) => (
        <Popconfirm
          title="Khôi phục sự kiện này?"
          description="Sự kiện sẽ hiển thị lại cho khách hàng."
          onConfirm={() => handleUnarchive(record.id)}
          okText="Khôi phục"
          cancelText="Hủy"
        >
          <Button type="link" icon={<UndoOutlined />}>
            Khôi phục
          </Button>
        </Popconfirm>
      ),
    },
  ];

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <Input
          placeholder="Tìm kiếm theo tên sự kiện..."
          prefix={<SearchOutlined />}
          style={{ width: '100%', maxWidth: 320 }}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <Table
        columns={columns}
        dataSource={events}
        rowKey="id"
        loading={loading}
        pagination={{
          ...pagination,
          showSizeChanger: true,
          showTotal: (total) => `Tổng cộng ${total} sự kiện đã lưu trữ`,
        }}
        onChange={handleTableChange}
        scroll={{ x: 1000 }}
      />
    </div>
  );
};

export default ArchivedEvents;