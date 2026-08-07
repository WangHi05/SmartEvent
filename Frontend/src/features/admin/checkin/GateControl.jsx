import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Typography, Progress, Badge, message, List, Avatar, Spin, Select } from 'antd';
import { AlertOutlined, EnvironmentOutlined, CheckCircleOutlined, ThunderboltOutlined, ReloadOutlined, DashboardOutlined } from '@ant-design/icons';
import { Sparkles, BrainCircuit } from 'lucide-react'; 
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/useAuthStore';

const { Title, Text } = Typography;

const GateControl = () => {
  const user = useAuthStore((state) => state.user);
  const adminName = user?.fullName || user?.FullName || user?.username || 'Admin';

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedGate, setSelectedGate] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');
  const [acknowledgedLogs, setAcknowledgedLogs] = useState([]);

  const [isAiLoading, setIsAiLoading] = useState(false);
  const [aiPrediction, setAiPrediction] = useState('');
  const [aiCommand, setAiCommand] = useState('');

  const [gates, setGates] = useState([]);
  const [isLoadingGates, setIsLoadingGates] = useState(true);

  // --- STATE CHO CHỌN SỰ KIỆN ---
  const [activeEvents, setActiveEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(null);

  const normalizeEventList = (payload) => {
    const items = Array.isArray(payload?.items)
      ? payload.items
      : Array.isArray(payload?.data?.items)
        ? payload.data.items
        : Array.isArray(payload?.data)
          ? payload.data
          : Array.isArray(payload)
            ? payload
            : [];

    return items.map((event, index) => ({
      ...event,
      id: event?.id ?? event?.Id ?? event?.eventId ?? event?.EventId,
      name: event?.name ?? event?.Name ?? event?.title ?? event?.Title ?? `Sự kiện ${index + 1}`,
      status: event?.status ?? event?.Status,
    }));
  };

  const normalizeGateList = (payload) => {
    const items = Array.isArray(payload)
      ? payload
      : Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload?.items)
          ? payload.items
          : [];

    return items.map((gate, index) => ({
      ...gate,
      id: gate?.id ?? gate?.Id ?? gate?.name ?? gate?.Name ?? index + 1,
      name: gate?.name ?? gate?.Name ?? gate?.gateName ?? gate?.GateName ?? `Cổng ${index + 1}`,
      currentTraffic: Number(gate?.currentTraffic ?? gate?.CurrentTraffic ?? gate?.traffic ?? 0),
      capacity: Number(gate?.capacity ?? gate?.Capacity ?? 0),
      status: gate?.status ?? gate?.Status ?? 'Bình thường',
    }));
  };

  const isOngoingEvent = (eventStatus) => {
    return eventStatus === 2 || eventStatus === 'Ongoing' || eventStatus === 'ongoing';
  };

  // Load danh sách sự kiện khi mở trang
  useEffect(() => {
    const fetchActiveEvents = async () => {
      try {
        const res = await axiosClient.get('/events/search', { params: { pageSize: 50 } });
        const eventList = normalizeEventList(res).filter((event) => isOngoingEvent(event.status));

        setActiveEvents(eventList);

        if (eventList.length > 0) {
          setSelectedEventId(eventList[0].id);
        } else {
          setSelectedEventId(null);
          setIsLoadingGates(false);
        }
      } catch (err) {
        console.error("Lỗi lấy sự kiện:", err);
        setSelectedEventId(null);
        setIsLoadingGates(false);
      }
    };
    fetchActiveEvents();

    // Khởi tạo kết nối SignalR
    const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '';
    const baseUrl = configuredBaseUrl
      ? configuredBaseUrl.trim().replace(/\/+$/, '').replace(/\/api$/, '')
      : import.meta.env.PROD
        ? window.location.origin
        : 'http://localhost:5013';
    const hubUrl = `${baseUrl}/gateHub`;

    const connection = new HubConnectionBuilder()
      .withUrl(hubUrl)
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    connection.start()
      .then(() => { connection.invoke("JoinAdminGroup"); })
      .catch(err => console.error("Lỗi kết nối SignalR: ", err));

    connection.on("ReceiveConfirmation", (gateName, staffName, time) => {
      setAcknowledgedLogs(prev => [{ gateName, staffName, time, id: Date.now() }, ...prev]);
      message.success(`Nhân viên ${staffName} tại ${gateName} đã tiếp nhận lệnh!`);
    });

    connection.on("RefreshGateData", () => {
      console.log("🔔 Có khách check-in, vui lòng nhấn Làm mới dữ liệu.");
    });

    return () => { connection.stop(); };
  }, []);

  const fetchGateData = async () => {
    if (!selectedEventId) {
      setIsLoadingGates(false);
      return;
    }
    
    setIsLoadingGates(true);
    try {
      const response = await axiosClient.get('/gate/status', {
        params: { eventId: selectedEventId }
      });
      setGates(normalizeGateList(response));
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu cổng:", error);
      message.error("Không thể lấy dữ liệu thống kê cổng từ máy chủ.");
    } finally {
      setIsLoadingGates(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      fetchGateData();
    }
  }, [selectedEventId]);

  const handleOpenAlert = (gateName) => {
    setSelectedGate(gateName);
    setIsModalVisible(true);
  };

  const handleSendAlert = async () => {
    if (!alertMessage.trim()) return message.error("Vui lòng nhập nội dung thông báo!");
    try {
      await axiosClient.post('/gate/notify', { gateName: selectedGate, message: alertMessage });
      message.success(`Đã gửi lệnh điều hướng đến ${selectedGate}`);
      setIsModalVisible(false);
      setAlertMessage('');
    } catch (error) {
      message.error("Lỗi khi gửi thông báo.");
    }
  };

  const handleAskAI = async () => {
    setIsAiLoading(true);
    setAiPrediction('');
    setAiCommand('');
    try {
      // BƯỚC LÀM SẠCH DỮ LIỆU (Sanitize payload)
      // Ép kiểu chuẩn xác và loại bỏ trường `id` để tránh lỗi Model Binding 400 Bad Request
      const aiPayload = gates.map(g => ({
        gateName: g.name, 
        name: g.name,
        currentTraffic: Number(g.currentTraffic || 0),
        capacity: Number(g.capacity || 0),
        status: String(g.status || '')
      }));

      const response = await axiosClient.post('/gate/ai-predict', { gates: aiPayload });
      
      const content = response.analysisContent || response.data?.analysisContent || '';
      
      const parts = content.split('**Lệnh đề xuất:**');
      if (parts.length === 2) {
         setAiPrediction(parts[0].replace('**Dự báo xu hướng:**', '').trim());
         setAiCommand(parts[1].trim());
      } else {
         setAiPrediction(content);
      }
    } catch (error) {
      console.error("Lỗi AI API:", error.response || error);
      message.error("Lỗi kết nối đến AI Server. Vui lòng kiểm tra API Key.");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUseAiCommand = () => {
    const overloadedGate = gates.find(g => g.status === 'Quá tải') || gates[0];
    if (overloadedGate) {
      setSelectedGate(overloadedGate.name);
      setAlertMessage(aiCommand);
      setIsModalVisible(true);
    }
  };

  // Hàm sinh màu Gradient cực đẹp cho Biểu đồ Đồng hồ dựa trên % lấp đầy
  const getDashboardGradient = (traffic, capacity) => {
    if (!capacity || capacity === 0) return { '0%': '#10b981', '100%': '#059669' }; // Xanh lá
    const percent = (traffic / capacity) * 100;
    if (percent > 80) return { '0%': '#ef4444', '100%': '#b91c1c' }; // Đỏ (Quá tải)
    if (percent > 50) return { '0%': '#f59e0b', '100%': '#d97706' }; // Vàng cam (Cảnh báo)
    return { '0%': '#3b82f6', '100%': '#1d4ed8' }; // Xanh dương (Bình thường)
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-end mb-2 gap-4">
        <div>
          <Title level={2} className="!mb-1">Trung tâm Điều hành Cổng</Title>
          <Text type="secondary">Quản lý luồng khách Real-time & Phân tích dự báo thông minh</Text>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center w-full xl:w-auto">
          {/* BỘ LỌC CHỌN SỰ KIỆN */}
          <div className="flex items-center gap-3 bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm w-full sm:w-auto">
            <span className="font-semibold text-gray-600 whitespace-nowrap">Đang giám sát:</span>
            <Select
              value={selectedEventId}
              onChange={(val) => setSelectedEventId(val)}
              className="w-full sm:w-64"
              variant="borderless"
              placeholder="Chọn sự kiện..."
              options={activeEvents.map(e => ({ label: e.name, value: e.id }))}
              notFoundContent="Không có sự kiện đang diễn ra"
            />
          </div>

          <Button icon={<ReloadOutlined />} onClick={fetchGateData} loading={isLoadingGates} disabled={!selectedEventId} className="w-full sm:w-auto">
            Làm mới dữ liệu
          </Button>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm whitespace-nowrap">
            <Text className="text-gray-500">Chỉ huy: </Text><strong className="text-blue-700">{adminName}</strong>
          </div>
        </div>
      </div>

      <div className="bg-gradient-to-r from-indigo-900 via-purple-900 to-indigo-900 rounded-2xl p-6 shadow-lg text-white border border-indigo-700 relative overflow-hidden">
        <div className="absolute top-0 right-0 opacity-10 transform translate-x-4 -translate-y-4">
          <BrainCircuit size={150} />
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row gap-6 items-start">
          <div className="w-full md:w-1/3 border-r border-indigo-700/50 pr-4">
            <h3 className="text-xl font-bold flex items-center text-indigo-100 mb-3">
              <Sparkles className="mr-2 text-yellow-400" size={24} /> AI Radar Dự Báo
            </h3>
            <p className="text-indigo-200 text-sm mb-4 leading-relaxed">
              Trí tuệ nhân tạo sẽ quét lưu lượng tại các cổng, dự báo xu hướng đám đông trong 30 phút tới và tự động tạo lệnh phân luồng tối ưu nhất.
            </p>
            <Button 
              type="primary" onClick={handleAskAI} loading={isAiLoading || isLoadingGates} disabled={gates.length === 0}
              className="bg-indigo-500 hover:bg-indigo-400 border-none w-full h-10 font-semibold"
              icon={<ThunderboltOutlined />}
            >
              Phân tích dữ liệu từ các cổng
            </Button>
          </div>

          <div className="w-full md:w-2/3 min-h-[120px] flex items-center">
             {isAiLoading ? (
               <div className="w-full flex justify-center items-center text-indigo-200 flex-col py-4">
                 <Spin size="large" className="mb-3" />
                 <span>Đang mô phỏng và dự đoán xu hướng...</span>
               </div>
             ) : aiPrediction ? (
               <div className="w-full space-y-4">
                 <div className="bg-black/20 rounded-xl p-4 border border-white/10">
                    <h4 className="text-yellow-400 font-semibold mb-1 text-sm uppercase tracking-wider">Dự báo tình hình</h4>
                    <p className="text-indigo-50 leading-relaxed text-sm" dangerouslySetInnerHTML={{ __html: aiPrediction.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>') }}></p>
                 </div>
                 
                 {aiCommand && (
                   <div className="bg-blue-900/40 rounded-xl p-4 border border-blue-500/30 flex justify-between items-center gap-4">
                     <div>
                       <h4 className="text-blue-300 font-semibold mb-1 text-sm uppercase tracking-wider">Lệnh đề xuất tự động</h4>
                       <p className="text-white font-medium italic">"{aiCommand}"</p>
                     </div>
                     <Button type="primary" danger onClick={handleUseAiCommand} className="shrink-0 font-bold">
                       Dùng lệnh này gửi xuống cổng
                     </Button>
                   </div>
                 )}
               </div>
             ) : (
               <div className="w-full h-full flex items-center justify-center border-2 border-dashed border-indigo-700/50 rounded-xl bg-indigo-900/20 py-8">
                 <Text className="text-indigo-300/70">Dữ liệu hệ thống đang chờ AI phân tích...</Text>
               </div>
             )}
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-6 mt-6">
        <div className="w-full xl:w-2/3">
          {isLoadingGates ? (
            <div className="flex flex-col justify-center items-center min-h-[300px] bg-white rounded-lg border border-gray-200">
               <Spin size="large" />
               <span className="mt-4 text-gray-500 font-medium">Đang lấy dữ liệu luồng khách...</span>
            </div>
          ) : !selectedEventId ? (
            <div className="flex justify-center items-center min-h-[300px] bg-white rounded-lg border border-dashed border-gray-300 text-gray-500">
               Hiện tại không có sự kiện nào trong hệ thống.
            </div>
          ) : gates.length === 0 ? (
            <div className="flex justify-center items-center min-h-[300px] bg-white rounded-lg border border-gray-200 text-gray-500">
               Chưa có dữ liệu thống kê cổng nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
              {gates.map(gate => {
                const percent = Math.round((gate.currentTraffic / gate.capacity) * 100) || 0;
                const isOverloaded = gate.status === 'Quá tải';

                return (
                  <Card 
                    key={gate.id || gate.name} 
                    className={`shadow-sm transition-all duration-300 overflow-hidden border ${isOverloaded ? 'border-red-200 shadow-red-100' : 'border-gray-200 hover:border-blue-300 hover:shadow-md'} rounded-2xl`}
                    styles={{ body: { padding: 0 } }}
                  >
                    {/* Header Cổng */}
                    <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${isOverloaded ? 'bg-red-100 text-red-600' : 'bg-blue-100 text-blue-600'}`}>
                          <EnvironmentOutlined className="text-xl" />
                        </div>
                        <h3 className="font-bold text-gray-800 text-lg m-0">{gate.name}</h3>
                      </div>
                      <Badge 
                        status={isOverloaded ? 'error' : percent > 50 ? 'warning' : 'processing'} 
                        text={<span className="font-medium text-sm">{gate.status}</span>} 
                        className={`px-3 py-1 rounded-full ${isOverloaded ? 'bg-red-50' : 'bg-white border border-gray-200'}`}
                      />
                    </div>

                    {/* Nội dung dữ liệu & Biểu đồ Dashboard */}
                    <div className="p-6 flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-1">
                        <p className="text-gray-500 text-xs uppercase font-bold tracking-wider m-0">Đã check-in</p>
                        <div className="flex items-baseline space-x-1">
                          <span className={`text-4xl font-extrabold ${isOverloaded ? 'text-red-600' : 'text-gray-800'}`}>
                            {gate.currentTraffic}
                          </span>
                          <span className="text-gray-400 font-medium text-base">/ {gate.capacity}</span>
                        </div>
                        <div className="mt-2 text-sm text-gray-500 flex items-center">
                          <DashboardOutlined className="mr-1 opacity-70" /> 
                          Công suất: <strong className="ml-1 text-gray-700">{percent}%</strong>
                        </div>
                      </div>

                      <div className="shrink-0 relative flex justify-center items-center drop-shadow-sm">
                        <Progress 
                          type="dashboard" 
                          percent={percent} 
                          strokeColor={getDashboardGradient(gate.currentTraffic, gate.capacity)}
                          width={110} 
                          strokeWidth={12}
                          gapDegree={60}
                          format={(p) => <span className="font-extrabold text-xl text-gray-700">{p}%</span>}
                        />
                      </div>
                    </div>

                    {/* Nút Action */}
                    <div className="px-5 pb-5">
                      <Button 
                        type={isOverloaded ? "primary" : "default"} 
                        danger={isOverloaded} 
                        icon={<AlertOutlined />} 
                        className={`w-full h-11 font-bold rounded-xl text-sm ${!isOverloaded ? 'text-blue-600 border-blue-200 bg-blue-50/30 hover:bg-blue-100 hover:border-blue-300 shadow-none' : 'shadow-md shadow-red-200'}`}
                        onClick={() => handleOpenAlert(gate.name)}
                      >
                        PHÁT LỆNH ĐIỀU HƯỚNG
                      </Button>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        <div className="w-full xl:w-1/3">
          <Card 
            title={<span><CheckCircleOutlined className="text-green-500 mr-2"/>Trạng thái nhân viên nhận lệnh</span>} 
            className="shadow-sm border-gray-200 h-full min-h-[400px] rounded-2xl" 
            styles={{ header: { backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }, body: { padding: '16px' } }}
          >
            <List
              itemLayout="horizontal" dataSource={acknowledgedLogs} locale={{ emptyText: 'Chưa có thông báo xác nhận' }}
              renderItem={item => (
                <List.Item className="bg-green-50/70 mb-3 rounded-xl px-4 py-3 border border-green-100 hover:bg-green-100 transition-colors shadow-sm">
                  <List.Item.Meta
                    avatar={<Avatar size="large" className="bg-green-600 text-white font-bold text-lg">{item.staffName.charAt(0)}</Avatar>}
                    title={<span className="font-bold text-gray-800">{item.staffName}</span>}
                    description={
                      <div className="mt-1">
                        <div className="text-sm text-gray-600">Xác nhận tại: <strong className="text-blue-700">{item.gateName}</strong></div>
                        <div className="text-xs text-gray-400 mt-1 flex items-center"><Sparkles size={12} className="mr-1"/>{item.time}</div>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          </Card>
        </div>
      </div>

      <Modal
        title={<span><AlertOutlined className="text-red-500 mr-2" /> Phát lệnh điều phối khẩn cấp</span>}
        open={isModalVisible} onOk={handleSendAlert} onCancel={() => setIsModalVisible(false)}
        okText="Phát lệnh ngay" okButtonProps={{ danger: true, size: 'large', className: 'rounded-lg' }} cancelButtonProps={{ size: 'large', className: 'rounded-lg' }}
        className="rounded-2xl overflow-hidden"
      >
        <p className="mb-4 text-gray-600 text-base">Gửi lệnh điều phối khẩn cấp đến: <strong className="text-black bg-gray-100 px-2 py-1 rounded">{selectedGate}</strong></p>
        <Input.TextArea rows={4} value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} className="text-lg rounded-xl p-3" placeholder="Nhập nội dung lệnh..." />
      </Modal>
    </div>
  );
};

export default GateControl;