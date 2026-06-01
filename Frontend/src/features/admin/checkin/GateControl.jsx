import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Modal, Typography, Progress, Badge, message, List, Avatar, Spin } from 'antd';
import { AlertOutlined, EnvironmentOutlined, CheckCircleOutlined, ThunderboltOutlined, ReloadOutlined } from '@ant-design/icons';
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

  // 1. Thay đổi state thành mảng rỗng và thêm state quản lý trạng thái tải dữ liệu
  const [gates, setGates] = useState([]);
  const [isLoadingGates, setIsLoadingGates] = useState(true);

  // 2. Hàm gọi API lấy dữ liệu thực tế từ Database
  const fetchGateData = async () => {
    setIsLoadingGates(true);
    try {
      const response = await axiosClient.get('/gate/status');
      const data = response.data || response; 
      
      setGates(data);
    } catch (error) {
      console.error("Lỗi khi tải dữ liệu cổng:", error);
      message.error("Không thể lấy dữ liệu thống kê cổng từ máy chủ.");
    } finally {
      setIsLoadingGates(false);
    }
  };

  useEffect(() => {
    // Tải dữ liệu cổng ngay khi component được render
    fetchGateData();

    // Khởi tạo kết nối SignalR
    const connection = new HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}/gateHub` : 'http://localhost:5013/gateHub')
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
    // Lắng nghe khi có khách check-in thành công ở bất kỳ cổng nào
    connection.on("RefreshGateData", () => {
      console.log("🔔 Có khách vừa check-in, cập nhật lại lưu lượng cổng!");
      fetchGateData(); // Gọi lại hàm load API để lấy số liệu mới nhất
    });
    // Tuỳ chọn: Lắng nghe sự kiện cập nhật lưu lượng cổng từ SignalR để update Real-time
    connection.on("GateTrafficUpdated", (updatedGate) => {
      setGates(prevGates => prevGates.map(g => g.id === updatedGate.id ? updatedGate : g));
    });

    return () => { connection.stop(); };
  }, []);

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
      const response = await axiosClient.post('/gate/ai-predict', { gates: gates });
      const content = response.analysisContent || response.data?.analysisContent || '';
      
      const parts = content.split('**Lệnh đề xuất:**');
      if (parts.length === 2) {
         setAiPrediction(parts[0].replace('**Dự báo xu hướng:**', '').trim());
         setAiCommand(parts[1].trim());
      } else {
         setAiPrediction(content);
      }
    } catch (error) {
      message.error("Lỗi kết nối đến AI Server");
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleUseAiCommand = () => {
    // Mặc định chọn cổng đang có tình trạng nghiêm trọng nhất (ví dụ cổng đầu tiên bị quá tải)
    const overloadedGate = gates.find(g => g.status === 'Quá tải') || gates[0];
    if (overloadedGate) {
      setSelectedGate(overloadedGate.name);
      setAlertMessage(aiCommand);
      setIsModalVisible(true);
    }
  };

  const getStatusColor = (traffic, capacity) => {
    // Tránh lỗi chia cho 0 nếu capacity chưa được load
    if (!capacity || capacity === 0) return 'normal';
    const percent = (traffic / capacity) * 100;
    if (percent > 80) return 'exception'; 
    if (percent > 50) return 'normal'; 
    return 'success'; 
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-end mb-2">
        <div>
          <Title level={2} className="!mb-1">Trung tâm Điều hành Cổng</Title>
          <Text type="secondary">Quản lý luồng khách Real-time & Phân tích dự báo thông minh</Text>
        </div>
        <div className="flex gap-4 items-center">
          <Button icon={<ReloadOutlined />} onClick={fetchGateData} loading={isLoadingGates}>
            Làm mới dữ liệu
          </Button>
          <div className="bg-white px-4 py-2 rounded-lg border border-gray-200 shadow-sm">
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
              Quét AI & Tạo kịch bản
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
            <div className="flex justify-center items-center min-h-[300px] bg-white rounded-lg border border-gray-200">
               <Spin size="large" tip="Đang lấy dữ liệu luồng khách từ máy chủ..." />
            </div>
          ) : gates.length === 0 ? (
            <div className="flex justify-center items-center min-h-[300px] bg-white rounded-lg border border-gray-200 text-gray-500">
               Chưa có dữ liệu thống kê cổng nào.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 h-fit">
              {gates.map(gate => (
                <Card key={gate.id} className="shadow-sm border-gray-200 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center space-x-2">
                      <EnvironmentOutlined className="text-blue-500 text-xl" />
                      <h3 className="font-bold text-lg">{gate.name}</h3>
                    </div>
                    <Badge status={gate.status === 'Quá tải' ? 'error' : 'success'} text={gate.status} />
                  </div>
                  <div className="mb-6">
                    <div className="flex justify-between text-sm mb-1">
                      <span>Lưu lượng hiện tại:</span><span className="font-bold">{gate.currentTraffic} / {gate.capacity}</span>
                    </div>
                    <Progress percent={Math.round((gate.currentTraffic / gate.capacity) * 100) || 0} status={getStatusColor(gate.currentTraffic, gate.capacity)} strokeWidth={12} />
                  </div>
                  <Button type="primary" danger={gate.status === 'Quá tải'} icon={<AlertOutlined />} className="w-full" onClick={() => handleOpenAlert(gate.name)}>
                    Phát lệnh điều hướng
                  </Button>
                </Card>
              ))}
            </div>
          )}
        </div>

        <div className="w-full xl:w-1/3">
          <Card title={<span><CheckCircleOutlined className="text-green-500 mr-2"/>Trạng thái nhân viên nhận lệnh</span>} className="shadow-sm border-gray-200 h-full min-h-[400px]" bodyStyle={{ padding: '12px' }}>
            <List
              itemLayout="horizontal" dataSource={acknowledgedLogs} locale={{ emptyText: 'Chưa có thông báo xác nhận' }}
              renderItem={item => (
                <List.Item className="bg-green-50/70 mb-2 rounded-lg px-3 py-2 border border-green-100 hover:bg-green-100 transition-colors">
                  <List.Item.Meta
                    avatar={<Avatar className="bg-green-600 text-white font-bold">{item.staffName.charAt(0)}</Avatar>}
                    title={<span className="font-bold text-gray-800 text-sm">{item.staffName}</span>}
                    description={
                      <div className="mt-1">
                        <div className="text-xs text-gray-600">Xác nhận tại: <strong className="text-blue-700">{item.gateName}</strong></div>
                        <div className="text-xs text-gray-400 mt-0.5">Lúc: {item.time}</div>
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
        okText="Phát lệnh ngay" okButtonProps={{ danger: true, size: 'large' }} cancelButtonProps={{ size: 'large' }}
      >
        <p className="mb-4 text-gray-600">Gửi lệnh đến: <strong className="text-black">{selectedGate}</strong></p>
        <Input.TextArea rows={4} value={alertMessage} onChange={(e) => setAlertMessage(e.target.value)} className="text-lg" />
      </Modal>
    </div>
  );
};

export default GateControl;