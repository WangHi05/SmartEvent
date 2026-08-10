import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line
} from 'recharts';
import { Users, QrCode, TrendingUp, Calendar, Wallet, BadgeDollarSign, Percent, Download } from 'lucide-react';
import { Card, Select, Spin, Table, Button } from 'antd';
import axiosClient from '../../api/axiosClient';
import StatCard from '../../components/StatCard';
import AIInsightCard from './AIInsightCard'; // Import component AI bên dưới

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

  return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Ho_Chi_Minh' });
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
    timeZone: 'Asia/Ho_Chi_Minh',
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

const DashboardView = () => {
  const [overview, setOverview] = useState(null);
  const [revenue, setRevenue] = useState([]);
  const [topEvents, setTopEvents] = useState([]);
  const [recentOrders, setRecentOrders] = useState([]);
  const [period, setPeriod] = useState('day');
  const [loadingRevenue, setLoadingRevenue] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    const loadOverview = async () => {
      try {
        const res = await axiosClient.get('/dashboard/admin/overview');
        setOverview(res);
      } catch (error) {
        console.error('Error loading admin overview:', error);
      }
    };

    const loadTopEvents = async () => {
      try {
        const res = await axiosClient.get('/dashboard/admin/top-events');
        setTopEvents(res || []);
      } catch (error) {
        console.error('Error loading top events:', error);
      }
    };

    const loadRecentOrders = async () => {
      try {
        const res = await axiosClient.get('/dashboard/admin/recent-orders');
        setRecentOrders(res || []);
      } catch (error) {
        console.error('Error loading recent orders:', error);
      }
    };

    loadOverview();
    loadTopEvents();
    loadRecentOrders();
  }, []);

  useEffect(() => {
    const loadRevenue = async () => {
      setLoadingRevenue(true);
      try {
        const res = await axiosClient.get(`/dashboard/admin/revenue?period=${period}`);
        setRevenue(res || []);
      } catch (error) {
        console.error('Error loading revenue chart:', error);
      } finally {
        setLoadingRevenue(false);
      }
    };

    loadRevenue();
  }, [period]);

  const orderColumns = [
    { title: 'Mã đơn', dataIndex: 'orderId', key: 'orderId', width: 180 },
    { title: 'Khách hàng', dataIndex: 'buyerName', key: 'buyerName' },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (value) => <span className="font-semibold text-blue-600">{formatCurrency(value)}</span>,
    },
    { title: 'SL', dataIndex: 'quantity', key: 'quantity', width: 70 },
    { title: 'PTTT', dataIndex: 'paymentMethod', key: 'paymentMethod', width: 110 },
    { title: 'Trạng thái', dataIndex: 'orderStatus', key: 'orderStatus', width: 110 },
  ];

  const handleExportReport = async () => {
    try {
      setExporting(true);
      if (selectedEventId) {
        // Export specific event
        const response = await axiosClient.get(
          `/dashboard/admin/export-event-report?eventId=${selectedEventId}`,
          { responseType: 'blob' }
        );
        downloadFile(response, `BC_${selectedEventId}.xlsx`);
      } else {
        // Export summary report
        const response = await axiosClient.get(
          '/dashboard/admin/export-summary-report',
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

  return (
    <div className="space-y-6 fade-in-up">
      {/* 1. Hàng Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng doanh thu" value={formatCurrency(overview?.totalRevenue)} icon={TrendingUp} trend="up" trendValue={`+${overview?.revenueGrowthPercent ?? 0}%`} color="bg-blue-500" />
        <StatCard title="Vé đã bán" value={`${overview?.totalTicketsSold ?? 0}`} icon={QrCode} trend="up" trendValue="theo hệ thống" color="bg-emerald-500" />
        <StatCard title="Khách Check-in" value={`${overview?.totalCheckinsToday ?? 0}`} icon={Users} trend="stable" trendValue="hôm nay" color="bg-violet-500" />
        <StatCard title="Sự kiện" value={`${overview?.totalEvents ?? 0}`} icon={Calendar} trend="up" trendValue="đang quản lý" color="bg-orange-500" />
      </div>

      {/* 2. Phần phân tích AI */}
      <AIInsightCard overviewData={overview}/>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-blue-50 text-blue-600"><Wallet size={22} /></div>
            <div>
              <p className="text-sm text-gray-500">Tỷ lệ lấp đầy</p>
              <div className="text-2xl font-bold text-gray-900">{overview?.fillRate ?? 0}%</div>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-emerald-50 text-emerald-600"><BadgeDollarSign size={22} /></div>
            <div>
              <p className="text-sm text-gray-500">Tổng đơn hàng</p>
              <div className="text-2xl font-bold text-gray-900">{overview?.totalOrders ?? 0}</div>
            </div>
          </div>
        </Card>
        <Card className="rounded-xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-orange-50 text-orange-600"><Percent size={22} /></div>
            <div>
              <p className="text-sm text-gray-500">Vé chưa dùng</p>
              <div className="text-2xl font-bold text-gray-900">{overview?.unusedTickets ?? 0}</div>
            </div>
          </div>
        </Card>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Doanh thu theo thời gian</h3>
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
        {loadingRevenue ? (
          <div className="h-64 flex items-center justify-center"><Spin /></div>
        ) : revenue.length === 0 ? (
          <div className="h-64 flex items-center justify-center text-center text-gray-500">
            <div>
              <p className="font-medium text-gray-700">Chưa có dữ liệu doanh thu để vẽ biểu đồ</p>
              <p className="text-sm mt-1">Cần có đơn hàng đã thanh toán thành công với PaymentStatus = Completed và PaidAt hợp lệ.</p>
            </div>
          </div>
        ) : (
          <div className="h-64 w-full" style={{ minWidth: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={300} minHeight={256} debounce={50}>
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
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Top sự kiện bán chạy</h3>
            <Button 
              icon={<Download size={16} />} 
              type="default"
              loading={exporting}
              onClick={handleExportReport}
              title={selectedEventId ? "Xuất báo cáo chi tiết sự kiện đã chọn" : "Xuất báo cáo tổng hợp tất cả sự kiện"}
            >
              Xuất Excel
            </Button>
          </div>
          <div className="space-y-3">
            {topEvents.slice(0, 5).map((item) => (
              <div 
                key={item.eventId} 
                className={`flex items-center justify-between rounded-lg border px-4 py-3 cursor-pointer transition-colors ${
                  selectedEventId === item.eventId 
                    ? 'border-blue-400 bg-blue-50' 
                    : 'border-gray-100 hover:bg-gray-50'
                }`}
                onClick={() => setSelectedEventId(selectedEventId === item.eventId ? null : item.eventId)}
              >
                <div>
                  <div className="font-semibold text-gray-900">{item.eventName}</div>
                  <div className="text-sm text-gray-500">{item.ticketsSold} vé - {formatCurrency(item.revenue)}</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-gray-700">{item.checkinRate}%</div>
                  <div className="text-xs text-gray-500">Check-in</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Giao dịch gần đây</h3>
          <Table columns={orderColumns} dataSource={recentOrders} rowKey={(row) => row.orderId} pagination={{ pageSize: 5 }} size="small" />
        </div>
      </div>
    </div>
  );
};

export default DashboardView;