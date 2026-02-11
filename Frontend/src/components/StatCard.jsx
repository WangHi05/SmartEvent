import React from 'react';
import { TrendingUp } from 'lucide-react';

// Component hiển thị thẻ số liệu (Ví dụ: Doanh thu, Vé đã bán)
const StatCard = ({ title, value, icon: Icon, trend, trendValue, color }) => {
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-start justify-between hover:shadow-md transition-shadow">
      <div>
        <p className="text-gray-500 text-sm font-medium">{title}</p>
        <h3 className="text-2xl font-bold text-gray-800 mt-1">{value}</h3>
        
        {/* Hiển thị xu hướng tăng/giảm */}
        <div className={`flex items-center mt-2 text-sm ${trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {trend === 'up' ? (
            <TrendingUp size={16} className="mr-1" />
          ) : (
            <TrendingUp size={16} className="mr-1 rotate-180" />
          )}
          <span>{trendValue} so với hôm qua</span>
        </div>
      </div>
      
      {/* Icon hiển thị bên phải */}
      <div className={`p-3 rounded-lg ${color} text-white shadow-sm`}>
        <Icon size={24} />
      </div>
    </div>
  );
};

export default StatCard;