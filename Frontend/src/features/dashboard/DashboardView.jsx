import React from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line 
} from 'recharts';
import { Users, QrCode, TrendingUp, Calendar } from 'lucide-react';
import StatCard from '../../components/StatCard';
import AIInsightCard from './AIInsightCard'; // Import component AI bên dưới

// Dữ liệu giả lập (Sau này bạn sẽ thay bằng API call)
const REVENUE_DATA = [
  { name: 'T2', veDon: 40, veDoan: 24, checkIn: 24 },
  { name: 'T3', veDon: 30, veDoan: 13, checkIn: 22 },
  { name: 'T4', veDon: 20, veDoan: 58, checkIn: 40 },
  { name: 'T5', veDon: 27, veDoan: 39, checkIn: 30 },
  { name: 'T6', veDon: 18, veDoan: 48, checkIn: 50 },
  { name: 'T7', veDon: 60, veDoan: 80, checkIn: 90 },
  { name: 'CN', veDon: 50, veDoan: 75, checkIn: 85 },
];

const DashboardView = () => {
  return (
    <div className="space-y-6 fade-in-up">
      {/* 1. Hàng Thống kê tổng quan */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="Tổng doanh thu" value="125.4tr" icon={TrendingUp} trend="up" trendValue="+12%" color="bg-blue-500" />
        <StatCard title="Vé đã bán" value="1,240" icon={QrCode} trend="up" trendValue="+5%" color="bg-emerald-500" />
        <StatCard title="Khách Check-in" value="856" icon={Users} trend="down" trendValue="-2%" color="bg-violet-500" />
        <StatCard title="Sự kiện sắp tới" value="03" icon={Calendar} trend="up" trendValue="Ổn định" color="bg-orange-500" />
      </div>

      {/* 2. Phần phân tích AI */}
      <AIInsightCard />

      {/* 3. Biểu đồ dữ liệu */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Biểu đồ Vé Đơn vs Vé Đoàn */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Phân tích loại vé bán ra</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="veDon" name="Vé Cá nhân" fill="#3B82F6" radius={[4, 4, 0, 0]} />
                <Bar dataKey="veDoan" name="Vé Đoàn" fill="#8B5CF6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Biểu đồ Check-in Realtime */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Lưu lượng Check-in thực tế</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={REVENUE_DATA}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="checkIn" name="Lượt vào cổng" stroke="#10B981" strokeWidth={3} dot={{r: 4}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardView;