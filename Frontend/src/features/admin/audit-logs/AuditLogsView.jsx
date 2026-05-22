import React, { useState, useEffect } from 'react';
import { Table, Card, Tag, DatePicker, Select, Input, Button, Space, Tooltip } from 'antd';
import { SearchOutlined, ReloadOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import dayjs from 'dayjs';

const { RangePicker } = DatePicker;
const { Option } = Select;

/**
 * Component Audit Logs - Hiển thị lịch sử thao tác
 */
const AuditLogsView = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0,
  });

  // Filters
  const [filters, setFilters] = useState({
    fromDate: null,
    toDate: null,
    action: null,
    entityType: null,
    performedBy: null,
  });

  // Fetch logs
  const fetchLogs = async (page = 1, pageSize = 20) => {
    // Ensure pageSize doesn't exceed 20
    const validPageSize = Math.min(pageSize, 20);
    
    setLoading(true);
    try {
      const params = {
        pageNumber: page,
        pageSize: validPageSize,
        ...filters,
      };

      const response = await axiosClient.get('/auditlogs', { params });
      
      // Lấy data an toàn: Nếu response đã bị bóc vỏ thì dùng luôn response, nếu chưa thì lấy response.data
      const data = response.data || response; 

      setLogs(data.items || []); // Tránh lỗi undefined items
      setPagination({
        current: data.pageNumber || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  // Xử lý filter
  const handleSearch = () => {
    fetchLogs(1, pagination.pageSize);
  };

  const handleReset = () => {
    setFilters({
      fromDate: null,
      toDate: null,
      action: null,
      entityType: null,
      performedBy: null,
    });
    setTimeout(() => fetchLogs(1, pagination.pageSize), 0);
  };

  // Ánh xạ màu cho Action tags
  const getActionColor = (action) => {
    const colorMap = {
      Create: 'green',
      Update: 'blue',
      Delete: 'red',
      Cancel: 'orange',
      Refund: 'purple',
      CheckIn: 'cyan',
      CheckInFailed: 'volcano',
    };
    return colorMap[action] || 'default';
  };

  // Columns
  const columns = [
    {
      title: 'Thời gian',
      dataIndex: 'timestamp',
      key: 'timestamp',
      width: 180,
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm:ss'),
      sorter: (a, b) => new Date(a.timestamp) - new Date(b.timestamp),
    },
    {
      title: 'Hành động',
      dataIndex: 'action',
      key: 'action',
      width: 120,
      render: (action) => <Tag color={getActionColor(action)}>{action}</Tag>,
    },
    {
      title: 'Loại đối tượng',
      dataIndex: 'entityType',
      key: 'entityType',
      width: 130,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: 'Người thực hiện',
      dataIndex: 'performedBy',
      key: 'performedBy',
      width: 150,
      render: (user) => <strong>{user}</strong>,
    },
    {
      title: 'Chi tiết',
      dataIndex: 'details',
      key: 'details',
      ellipsis: {
        showTitle: false,
      },
      render: (details) => (
        <Tooltip placement="topLeft" title={details}>
          {details || '-'}
        </Tooltip>
      ),
    },
    {
      title: 'IP Address',
      dataIndex: 'ipAddress',
      key: 'ipAddress',
      width: 150,
      render: (ip) => ip || '-',
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: 16 }}>
        <InfoCircleOutlined /> Lịch sử thao tác (Audit Logs)
      </h2>

      <Card style={{ marginBottom: 16 }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
            <RangePicker
              placeholder={['Từ ngày', 'Đến ngày']}
              format="DD/MM/YYYY"
              onChange={(dates) => {
                setFilters({
                  ...filters,
                  fromDate: dates?.[0]?.toISOString() || null,
                  toDate: dates?.[1]?.toISOString() || null,
                });
              }}
            />

            <Select
              placeholder="Chọn hành động"
              allowClear
              onChange={(value) => setFilters({ ...filters, action: value })}
              value={filters.action}
            >
              <Option value={null}>Tất cả</Option>
              <Option value="Create">Create</Option>
              <Option value="Update">Update</Option>
              <Option value="Delete">Delete</Option>
              <Option value="Cancel">Cancel</Option>
              <Option value="Refund">Refund</Option>
              <Option value="CheckIn">CheckIn</Option>
              <Option value="CheckInFailed">CheckInFailed</Option>
            </Select>

            <Select
              placeholder="Loại đối tượng"
              allowClear
              onChange={(value) => setFilters({ ...filters, entityType: value })}
              value={filters.entityType}
            >
              <Option value={null}>Tất cả</Option>
              <Option value="Event">Event</Option>
              <Option value="Ticket">Ticket</Option>
              <Option value="User">User</Option>
            </Select>

            <Input
              placeholder="Người thực hiện"
              prefix={<SearchOutlined />}
              allowClear
              onChange={(e) => setFilters({ ...filters, performedBy: e.target.value })}
              value={filters.performedBy}
            />
          </div>

          <div>
            <Button
              type="primary"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              style={{ marginRight: 8 }}
            >
              Tìm kiếm
            </Button>
            <Button icon={<ReloadOutlined />} onClick={handleReset}>
              Làm mới
            </Button>
          </div>
        </Space>
      </Card>

      <Table
        columns={columns}
        dataSource={logs}
        rowKey="id"
        loading={loading}
        pagination={pagination}
        onChange={(newPagination) => {
          fetchLogs(newPagination.current, newPagination.pageSize);
        }}
        scroll={{ x: 1200 }}
      />
    </div>
  );
};

export default AuditLogsView;
