import React from 'react';
import { AlertTriangle, QrCode } from 'lucide-react';

// Component hiển thị gợi ý từ AI (Mục tiêu: Phát hiện quá tải)
const AIInsightCard = () => {
  return (
    <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
      <div className="flex items-start justify-between relative z-10">
        <div>
          <h4 className="flex items-center text-lg font-bold mb-2">
            <AlertTriangle className="mr-2 text-yellow-300" size={20} />
            Cảnh báo & Gợi ý từ AI
          </h4>
          <p className="text-indigo-100 text-sm mb-4 max-w-xl">
            Hệ thống phát hiện dự báo khung giờ <strong>18:00 - 19:00</strong> hôm nay sẽ có lượng khách đoàn Check-in tăng đột biến tại <strong>Cổng A</strong>.
          </p>
          <div className="flex space-x-3">
            <button className="bg-white text-indigo-700 px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-50 transition-colors shadow-sm">
              Điều phối thêm nhân viên
            </button>
            <button className="bg-indigo-700 bg-opacity-50 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-opacity-70 transition-colors border border-indigo-400">
              Xem chi tiết dự báo
            </button>
          </div>
        </div>
      </div>
      
      {/* Background decoration */}
      <div className="absolute right-0 bottom-0 opacity-10 transform translate-x-4 translate-y-4">
        <QrCode size={120} />
      </div>
    </div>
  );
};

export default AIInsightCard;