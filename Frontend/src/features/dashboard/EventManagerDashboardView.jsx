import React, { useEffect, useState } from 'react';
import { Card, Row, Col, Spin, Table, Select, Button } from 'antd';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import axiosClient from '../../api/axiosClient';
import StatCard from '../../components/StatCard';
import { TrendingUp, QrCode, Users, Calendar, Download } from 'lucide-react';

const formatCurrency = (value) => `${(value || 0).toLocaleString('vi-VN')} đ`;

const formatRevenueAxisLabel = (value, period) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (period === 'month') {
    return `T${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  if (period === 'year') {
    return `${date.getFullYear()}`;
  }

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });
};

const formatRevenueTooltipLabel = (value, period) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  if (period === 'month') {
    return `Tháng ${date.getMonth() + 1}/${date.getFullYear()}`;
  }

  if (period === 'year') {
    return `Năm ${date.getFullYear()}`;
  }

  return date.toLocaleDateString('vi-VN', {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const EventManagerDashboardView = () => {
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [period, setPeriod] = useState('day');
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  // Fetch overview
  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await axiosClient.get('/dashboard/director/overview');
        setOverview(res);
      } catch (err) {
        console.error('Error loading overview:', err);
      }
    };
    loadOverview();
  }, []);

  // Fetch revenue chart data
  useEffect(() => {
    const loadRevenue = async () => {
      setRevenueLoading(true);
      try {
        const res = await axiosClient.get(`/dashboard/director/revenue?period=${period}`);
        setRevenue(res || []);
      } catch (err) {
        console.error('Error loading revenue:', err);
      } finally {
        setRevenueLoading(false);
      }
    };
    loadRevenue();
  }, [period]);

  // Fetch top events
  useEffect(() => {
    const loadTopEvents = async () => {
      try {
        const res = await axiosClient.get('/dashboard/director/top-events');
        setTopEvents(res || []);
      } catch (err) {
        console.error('Error loading top events:', err);
      }
    };
    loadTopEvents();
  }, []);

  useEffect(() => {
    if (overview && revenue.length > 0 && topEvents.length > 0) {
      setLoading(false);
    } else if (!loading) {
      setLoading(false);
    }
  }, [overview, revenue, topEvents]);

  const handleExportReport = async () => {
    try {
      setExporting(true);
      if (selectedEventId) {
        // Export specific event
        const response = await axiosClient.get(
          `/dashboard/director/export-event-report?eventId=${selectedEventId}`,
          { responseType: 'blob' }
        );
        // Find the event name from topEvents
        const event = topEvents.find(e => e.eventId === selectedEventId);
        let fileName = `BC_Tong_Hop.xlsx`;
        if (event && event.eventName) {
          // Sanitize event name: replace spaces with underscores and remove special characters
          const sanitizedName = event.eventName
            .replace(/\s+/g, '_')
            .replace(/[^\w\u0080-\uFFFF_-]/g, '');
          fileName = `Bao_Cao_${sanitizedName}.xlsx`;
        }
        downloadFile(response, fileName);
      } else {
        // Export summary report
        const response = await axiosClient.get(
          '/dashboard/director/export-summary-report',
          { responseType: 'blob' }
        );
        downloadFile(response, `BC_Tong_Hop.xlsx`);
      }
    } catch (err) {
      console.error('Error exporting report:', err);
      alert('Lỗi khi xuất báo cáo: ' + (err.message || 'Vui lòng thử lại'));
    } finally {
      setExporting(false);
    }
  };

  const downloadFile = (blob, filename) => {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (loading && !overview) return <div className="p-6 text-center"><Spin /></div>;

  // Top events table columns
  const columns = [
    {
      title: 'Tên Sự kiện',
      dataIndex: 'eventName',
      key: 'eventName',
      width: 200,
    },
    {
      title: 'Vé Bán',
      dataIndex: 'ticketsSold',
      key: 'ticketsSold',
      width: 100,
      render: (val) => <span className="font-semibold text-blue-600">{val}</span>,
    },
    {
      title: 'Doanh thu',
      dataIndex: 'revenue',
      key: 'revenue',
      width: 150,
      render: (val) => <span className="font-semibold text-green-600">{val.toLocaleString('vi-VN')} đ</span>,
    },
    {
      title: 'Check-in Rate',
      dataIndex: 'checkinRate',
      key: 'checkinRate',
      width: 130,
      render: (val) => (
        <div className="w-full bg-gray-200 rounded-full h-6 overflow-hidden">
          <div
            className="bg-gradient-to-r from-blue-500 to-purple-600 h-full flex items-center justify-center text-xs font-bold text-white"
            style={{ width: `${Math.min(val, 100)}%` }}
          >
            {val}%
          </div>
        </div>
      ),
    },
    {
      title: 'Chọn',
      key: 'select',
      width: 70,
      align: 'center',
      render: (_, record) => (
        <div
          onClick={(e) => {
            e.stopPropagation();
            setSelectedEventId(selectedEventId === record.eventId ? null : record.eventId);
          }}
          className="cursor-pointer flex justify-center"
        >
          <div
            className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
              selectedEventId === record.eventId
                ? 'bg-green-500 border-green-500'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {selectedEventId === record.eventId && (
              <span className="text-white font-bold text-sm">✓</span>
            )}
          </div>
        </div>
      ),
    },
  ];

  const chartHeight = 320;

  return (
    <div className="space-y-6 fade-in-up p-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Tổng doanh thu"
          value={`${(overview?.totalRevenue ?? 0).toLocaleString('vi-VN')} đ`}
          icon={TrendingUp}
          trend="up"
          trendValue="+8%"
          color="bg-blue-500"
        />
        <StatCard
          title="Vé đã bán"
          value={`${overview?.totalTicketsSold ?? 0}`}
          icon={QrCode}
          trend="up"
          trendValue="+12%"
          color="bg-emerald-500"
        />
        <StatCard
          title="Khách hàng"
          value={`${overview?.totalCustomers ?? 0}`}
          icon={Users}
          trend="stable"
          trendValue="Ổn định"
          color="bg-violet-500"
        />
        <StatCard
          title="Sự kiện"
          value={`${overview?.totalEvents ?? 0}`}
          icon={Calendar}
          trend="up"
          trendValue="Quản lý"
          color="bg-orange-500"
        />
      </div>

      {/* Additional Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border border-gray-100 rounded-xl shadow-sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600">{overview?.fillRate ?? 0}%</div>
            <p className="text-gray-600 text-sm mt-2">Tỷ lệ lấp đầy sự kiện</p>
          </div>
        </Card>
        <Card className="border border-gray-100 rounded-xl shadow-sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">{overview?.totalCheckinsToday ?? 0}</div>
            <p className="text-gray-600 text-sm mt-2">Check-in hôm nay</p>
          </div>
        </Card>
        <Card className="border border-gray-100 rounded-xl shadow-sm">
          <div className="text-center">
            <div className="text-3xl font-bold text-red-600">{overview?.unusedTickets ?? 0}</div>
            <p className="text-gray-600 text-sm mt-2">Vé chưa sử dụng</p>
          </div>
        </Card>
      </div>

      {/* Revenue Chart */}
      <Card className="border border-gray-100 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-800">Biểu đồ Doanh thu</h3>
          <Select
            value={period}
            onChange={setPeriod}
            style={{ width: 120 }}
            options={[
              { label: 'Ngày', value: 'day' },
              { label: 'Tháng', value: 'month' },
              { label: 'Năm', value: 'year' },
            ]}
          />
        </div>
        {revenueLoading ? (
          <div className="text-center py-16">
            <Spin />
          </div>
        ) : revenue.length > 0 ? (
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenue} margin={{ top: 10, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                <XAxis
                  dataKey="period"
                  tickFormatter={(value) => formatRevenueAxisLabel(value, period)}
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  minTickGap={24}
                  tickMargin={10}
                />
                <YAxis
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickLine={false}
                  axisLine={false}
                  width={80}
                  tickFormatter={(value) => Number(value).toLocaleString('vi-VN')}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '12px',
                    boxShadow: '0 12px 24px rgba(15, 23, 42, 0.08)',
                  }}
                  labelFormatter={(label) => formatRevenueTooltipLabel(label, period)}
                  formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                />
                <Legend verticalAlign="bottom" height={24} />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu"
                  stroke="#2563eb"
                  strokeWidth={3}
                  dot={{ r: 4, strokeWidth: 2, fill: '#ffffff' }}
                  activeDot={{ r: 7, strokeWidth: 2 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <div className="text-center py-16 text-gray-500">Không có dữ liệu doanh thu</div>
        )}
      </Card>

      {/* Top Events Table */}
      <Card className="border border-gray-100 rounded-xl shadow-sm">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Top Sự kiện bán chạy</h3>
            {selectedEventId && (
              <p className="text-sm text-green-600 mt-1 font-medium">
                ✓ Đã chọn: <span className="font-semibold">{topEvents.find(e => e.eventId === selectedEventId)?.eventName}</span>
              </p>
            )}
          </div>
          <Button 
            icon={<Download size={16} />} 
            type="primary"
            loading={exporting}
            onClick={handleExportReport}
            title={selectedEventId ? `Xuất báo cáo chi tiết: ${topEvents.find(e => e.eventId === selectedEventId)?.eventName}` : "Xuất báo cáo tổng hợp tất cả sự kiện"}
          >
            Xuất Excel
          </Button>
        </div>
        <Table
          columns={columns}
          dataSource={topEvents}
          rowKey={(record) => record.eventId}
          pagination={{ pageSize: 10 }}
          loading={false}
          scroll={{ x: 900 }}
          bordered={false}
          className="custom-table"
        />
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Event Distribution (if data available) */}
        <Card className="border border-gray-100 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Phân bố sự kiện theo trạng thái</h3>
          {topEvents.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topEvents.slice(0, 5)}
                    dataKey="ticketsSold"
                    nameKey="eventName"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ eventName, percent }) => `${eventName}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {topEvents.slice(0, 5).map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => `${value} vé`} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">Không có dữ liệu</div>
          )}
        </Card>

        {/* Checkin Performance */}
        <Card className="border border-gray-100 rounded-xl shadow-sm">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Hiệu suất Check-in</h3>
          {topEvents.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={topEvents.slice(0, 5)}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 200, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                  <XAxis type="number" />
                  <YAxis dataKey="eventName" type="category" width={190} />
                  <Tooltip />
                  <Bar dataKey="checkinRate" name="Check-in Rate (%)" fill="#10B981" radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-16 text-gray-500">Không có dữ liệu</div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EventManagerDashboardView;
