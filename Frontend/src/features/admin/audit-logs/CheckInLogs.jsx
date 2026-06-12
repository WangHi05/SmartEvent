import React, { useState, useEffect } from 'react';
import { Card, Select, Table, Tag, Typography, Statistic, Row, Col, Button } from 'antd';
import { QrcodeOutlined, CheckCircleOutlined, CloseCircleOutlined, TeamOutlined, EnvironmentOutlined, ReloadOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import dayjs from 'dayjs';

const { Title, Text } = Typography;

const CheckInLogs = () => {
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);
  
  const [logs, setLogs] = useState([]);
  const [summary, setSummary] = useState({ totalCount: 0, successCount: 0, failedCount: 0, totalPeople: 0 });
  
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });

  // 1. Load danh sách TẤT CẢ sự kiện (cả cũ lẫn mới) để xem báo cáo
  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const res = await axiosClient.get('/events/search', { params: { pageSize: 100 } });
        let eventList = Array.isArray(res.items) ? res.items : Array.isArray(res.data?.items) ? res.data.items : Array.isArray(res.data) ? res.data : [];
        setEvents(eventList);
        
        if (eventList.length > 0) {
          setSelectedEventId(eventList[0].id);
        }
      } catch (err) {
        console.error("Lỗi lấy sự kiện:", err);
      }
    };
    fetchEvents();
  }, []);

  // 2. Load dữ liệu log check-in khi đổi Sự kiện hoặc đổi Trang
  const fetchLogs = async (page = 1, size = pagination.pageSize) => {
    if (!selectedEventId) return;
    setLoading(true);
    try {
      const response = await axiosClient.get('/checkin-report', {
        params: { eventId: selectedEventId, pageIndex: page, pageSize: size }
      });
      
      const data = response.data || response;
      setLogs(data.items || []);
      setSummary({
        totalCount: data.totalCount || 0,
        successCount: data.successCount || 0,
        failedCount: data.failedCount || 0,
        totalPeople: data.totalPeople || 0
      });
      setPagination(prev => ({ ...prev, current: page, pageSize: size, total: data.totalCount || 0 }));
    } catch (error) {
      console.error("Lỗi lấy lịch sử check-in:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1); // Mặc định về trang 1 khi đổi sự kiện
  }, [selectedEventId]);

  const handleTableChange = (newPagination) => {
    fetchLogs(newPagination.current, newPagination.pageSize);
  };

  // 3. Cấu hình các cột của Bảng Dữ Liệu
  const columns = [
    {
      title: 'Thời gian quét',
      dataIndex: 'checkedAt',
      key: 'checkedAt',
      render: (text) => <strong className="text-gray-700">{dayjs(text).format('HH:mm:ss - DD/MM/YYYY')}</strong>,
      width: '15%',
    },
    {
      title: 'Cổng (Vị trí)',
      dataIndex: 'gateName',
      key: 'gateName',
      render: (text) => <><EnvironmentOutlined className="text-blue-500 mr-1"/> {text}</>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'checkInResult',
      key: 'checkInResult',
      render: (status) => (
        status === 'Success' 
          ? <Tag color="success" icon={<CheckCircleOutlined />}>Hợp lệ</Tag>
          : <Tag color="error" icon={<CloseCircleOutlined />}>Từ chối</Tag>
      ),
    },
    {
      title: 'Số người',
      dataIndex: 'peopleCount',
      key: 'peopleCount',
      render: (count) => <span className="font-bold text-blue-700">{count} người</span>,
    },
    {
      title: 'Nhân viên soát vé',
      dataIndex: 'staffId',
      key: 'staffId',
      render: (text) => <Tag color="default">{text}</Tag>,
    },
    {
      title: 'Ghi chú / Lỗi',
      dataIndex: 'failureReason',
      key: 'failureReason',
      render: (text, record) => (
        <span className={record.checkInResult === 'Failed' ? "text-red-500 font-medium" : "text-gray-400"}>
          {text || '-'}
        </span>
      ),
    }
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-2 gap-4">
        <div>
          <Title level={2} className="!mb-1">Báo cáo Truy vết Soát vé</Title>
          <Text type="secondary">Xem lịch sử quét mã QR và lưu lượng khách chi tiết qua từng cổng</Text>
        </div>
        
        <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
          <span className="font-semibold text-gray-600 whitespace-nowrap">Chọn Sự kiện:</span>
          <Select
            value={selectedEventId}
            onChange={(val) => setSelectedEventId(val)}
            className="w-full sm:w-80"
            variant="borderless"
            placeholder="Chọn sự kiện để xem báo cáo..."
            options={events.map(e => ({ label: e.name, value: e.id }))}
          />
          <Button icon={<ReloadOutlined />} type="text" onClick={() => fetchLogs(pagination.current)} />
        </div>
      </div>

      {/* THẺ THỐNG KÊ (STATISTIC CARDS) */}
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-blue-100 rounded-2xl h-full">
            <Statistic 
              title={<span className="text-gray-500 font-semibold">Tổng lượt quét QR</span>} 
              value={summary.totalCount} 
              prefix={<QrcodeOutlined className="text-blue-500" />} 
              valueStyle={{ fontWeight: 'bold', color: '#1f2937' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-green-100 rounded-2xl h-full" style={{ backgroundColor: '#f0fdf4' }}>
            <Statistic 
              title={<span className="text-green-700 font-semibold">Quét Thành công</span>} 
              value={summary.successCount} 
              prefix={<CheckCircleOutlined className="text-green-500" />} 
              valueStyle={{ fontWeight: 'bold', color: '#15803d' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-red-100 rounded-2xl h-full" style={{ backgroundColor: '#fef2f2' }}>
            <Statistic 
              title={<span className="text-red-700 font-semibold">Quét Lỗi / Vé giả</span>} 
              value={summary.failedCount} 
              prefix={<CloseCircleOutlined className="text-red-500" />} 
              valueStyle={{ fontWeight: 'bold', color: '#b91c1c' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card className="shadow-sm border-purple-100 rounded-2xl h-full bg-gradient-to-br from-white to-purple-50">
            <Statistic 
              title={<span className="text-purple-700 font-semibold">Tổng số Khách đã vào</span>} 
              value={summary.totalPeople} 
              prefix={<TeamOutlined className="text-purple-500" />} 
              valueStyle={{ fontWeight: 'bold', color: '#6d28d9' }}
              suffix="người"
            />
          </Card>
        </Col>
      </Row>

      {/* BẢNG DỮ LIỆU LOGS */}
      <Card className="shadow-sm border-gray-200 rounded-2xl" styles={{ body: { padding: 0 } }}>
        <Table
          columns={columns}
          dataSource={logs}
          rowKey="id"
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
            showTotal: (total) => `Tổng cộng ${total} lượt quét`
          }}
          onChange={handleTableChange}
          scroll={{ x: 800 }}
          className="rounded-2xl overflow-hidden"
        />
      </Card>
    </div>
  );
};

export default CheckInLogs;