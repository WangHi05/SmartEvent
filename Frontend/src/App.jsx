import React, { useState } from 'react';
import AdminLayout from './layout/AdminLayout';
import DashboardView from './features/dashboard/DashboardView';
import EventListView from './features/events/EventListView';
import { Settings } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Hàm quyết định render nội dung nào dựa trên tab đang chọn
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <DashboardView />;
      case 'events':
        return <EventListView />;
      case 'tickets':
      case 'users':
      case 'settings':
        return (
          <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-white rounded-xl border border-dashed border-gray-300">
            <Settings size={48} className="mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-600">Chức năng đang phát triển</h3>
            <p className="text-sm">Vui lòng quay lại module {activeTab} sau.</p>
          </div>
        );
      default:
        return <DashboardView />;
    }
  };

  return (
    <AdminLayout 
      activeTab={activeTab} 
      setActiveTab={setActiveTab}
      sidebarOpen={sidebarOpen}
      setSidebarOpen={setSidebarOpen}
    >
      {/* Render nội dung động */}
      {renderContent()}
    </AdminLayout>
  );
}

export default App;