import React from 'react';
import { Plus, Edit, Trash2 } from 'lucide-react';

// Dữ liệu giả lập danh sách sự kiện
const EVENTS_DATA = [
  { id: 1, name: 'Lễ hội Ẩm thực Mùa hè 2024', status: 'Active', sold: 1200, capacity: 2000, date: '20-11-2024', location: 'Công viên Bờ Kè' },
  { id: 2, name: 'Concert Rock Việt: Bão Đêm', status: 'Pending', sold: 0, capacity: 5000, date: '05-12-2024', location: 'Sân vận động Q7' },
  { id: 3, name: 'Workshop AI & Tech Trends', status: 'Ended', sold: 150, capacity: 150, date: '15-10-2024', location: 'Hội trường A' },
];

const EventListView = () => {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header của bảng */}
      <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
        <div>
           <h3 className="text-lg font-bold text-gray-800">Danh sách Sự kiện</h3>
           <p className="text-sm text-gray-500">Quản lý các sự kiện đang diễn ra và sắp tới</p>
        </div>
        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-blue-700 transition-colors shadow-sm text-sm font-medium">
          <Plus size={18} className="mr-2" /> Tạo sự kiện mới
        </button>
      </div>

      {/* Bảng dữ liệu */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead className="bg-gray-50 text-gray-500 uppercase text-xs tracking-wider">
            <tr>
              <th className="p-4 font-semibold">Tên sự kiện</th>
              <th className="p-4 font-semibold">Thời gian & Địa điểm</th>
              <th className="p-4 font-semibold">Trạng thái</th>
              <th className="p-4 font-semibold">Tiến độ bán vé</th>
              <th className="p-4 font-semibold text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {EVENTS_DATA.map((event) => (
              <tr key={event.id} className="hover:bg-gray-50 transition-colors group">
                <td className="p-4">
                  <div className="font-semibold text-gray-800">{event.name}</div>
                  <div className="text-xs text-gray-400 mt-1">ID: #{event.id}</div>
                </td>
                <td className="p-4 text-sm">
                  <div className="text-gray-700 font-medium">{event.date}</div>
                  <div className="text-gray-500 text-xs">{event.location}</div>
                </td>
                <td className="p-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${
                    event.status === 'Active' ? 'bg-green-100 text-green-700 border-green-200' : 
                    event.status === 'Pending' ? 'bg-yellow-100 text-yellow-700 border-yellow-200' : 
                    'bg-gray-100 text-gray-600 border-gray-200'
                  }`}>
                    {event.status === 'Active' ? 'Đang bán' : event.status === 'Pending' ? 'Sắp mở' : 'Đã kết thúc'}
                  </span>
                </td>
                <td className="p-4 w-1/4">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-gray-700">{Math.round((event.sold/event.capacity)*100)}%</span>
                    <span className="text-gray-500">{event.sold}/{event.capacity} vé</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-500 ${
                        (event.sold / event.capacity) > 0.8 ? 'bg-red-500' : 'bg-blue-600'
                      }`}
                      style={{ width: `${(event.sold / event.capacity) * 100}%` }}
                    ></div>
                  </div>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end space-x-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button className="p-2 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200" title="Chỉnh sửa">
                        <Edit size={16} />
                    </button>
                    <button className="p-2 bg-white border border-gray-200 rounded hover:bg-red-50 hover:text-red-600 hover:border-red-200" title="Xóa">
                        <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default EventListView;