import React, { useState, useEffect, useRef } from 'react';
import { Card, Result, Button, Typography, Descriptions, message, Tag, InputNumber, Modal, Select } from 'antd';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrcodeOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, TeamOutlined, VideoCameraOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient'; 
import useAuthStore from '../../../store/useAuthStore'; 

const { Title, Text } = Typography;
const { Option } = Select;

const CheckInPage = () => {
  const user = useAuthStore((state) => state.user);
  const staffName = user?.fullName || user?.FullName || user?.username || 'Nhân viên';

  const [scanResult, setScanResult] = useState(null); 
  const [ticketData, setTicketData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const [selectedGate, setSelectedGate] = useState('Cổng chính - Lối vào 1');
  const [alertData, setAlertData] = useState({ isOpen: false, message: '' });

  const [peopleCount, setPeopleCount] = useState(1);
  const [isCameraOpen, setIsCameraOpen] = useState(true);
  
  const peopleCountRef = useRef(1);
  const scannerRef = useRef(null);
  const isLockedRef = useRef(false); 
  const connectionRef = useRef(null);

  const handlePeopleCountChange = (value) => {
    const val = value || 1;
    setPeopleCount(val);
    peopleCountRef.current = val;
  };

  useEffect(() => {
    const connection = new HubConnectionBuilder()
      .withUrl(import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL.replace('/api', '')}/gateHub` : 'http://localhost:5013/gateHub')
      .configureLogging(LogLevel.Information)
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.start()
      .then(() => {
        console.log("Đã kết nối SignalR thành công!");
        connection.invoke("JoinGateGroup", selectedGate)
          .catch(err => console.error("Lỗi khi tham gia nhóm: ", err));
      })
      .catch(err => console.error("Lỗi kết nối SignalR: ", err));

    connection.on("ReceiveGateAlert", (msg) => {
      setAlertData({ isOpen: true, message: msg });
    });

    return () => {
      if (connection) connection.stop();
    };
  }, [selectedGate]);

  const handleAcknowledge = () => {
    if (connectionRef.current) {
      connectionRef.current.invoke("ConfirmAlert", selectedGate, staffName)
        .catch(err => console.error("Lỗi khi xác nhận: ", err));
    }
    setAlertData({ isOpen: false, message: '' });
  };

  useEffect(() => {
    if (!isCameraOpen) return;

    const qrContainer = document.getElementById('qr-reader');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true, supportedScanTypes: [0] },
      false
    );
    
    scannerRef.current = scanner;
    scanner.render(onScanSuccess, onScanFailure);

    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(e => console.debug("Lỗi dọn dẹp camera:", e));
        scannerRef.current = null;
      }
    };
  }, [isCameraOpen]); 

  const onScanSuccess = async (decodedText) => {
    if (isLockedRef.current) return;
    isLockedRef.current = true;

    const qrPayload = decodedText.trim();
    const parts = qrPayload.split('|');

    if (parts.length !== 2) {
        setScanResult('error');
        setErrorMessage('Mã QR không đúng định dạng SmartEvent.');
        return;
    }

    try {
      const currentCount = peopleCountRef.current;
      const response = await axiosClient.post(`/checkin/scan`, {
        qrPayload: qrPayload,
        peopleCount: currentCount, 
        gateName: selectedGate 
      });
      
      if (response.isSuccess || response.data?.isSuccess) {
        setScanResult('success');
        setTicketData(response.data?.data || response.data); 
        message.success(`Check-in thành công ${currentCount} vé!`);
      } else {
        setScanResult('error');
        setErrorMessage(response.message || response.data?.message || 'Vé không hợp lệ');
      }
    } catch (error) {
      setScanResult('error');
      setErrorMessage(error.response?.data?.message || 'Lỗi kết nối máy chủ.');
    }
  };

  const onScanFailure = () => {};

  const resetScanner = () => {
    setScanResult(null);
    setTicketData(null);
    setErrorMessage('');
    setPeopleCount(1); 
    peopleCountRef.current = 1;
    isLockedRef.current = false; 
  };

  const toggleCamera = () => {
    setIsCameraOpen(!isCameraOpen);
    if (isCameraOpen) resetScanner();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 bg-gray-50/50 min-h-screen">
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
        <div>
          <Title level={3} className="!mb-1 text-blue-900">Soát vé tại cổng</Title>
          <Text type="secondary" className="text-sm">Đang trực ca: <strong className="text-gray-800">{staffName}</strong></Text>
        </div>
      
        <div className="flex flex-col sm:flex-row items-center gap-4 w-full xl:w-auto">
          
          <div className="flex items-center space-x-3 bg-blue-50/60 px-4 py-2.5 rounded-xl border border-blue-100 w-full sm:w-auto transition-colors hover:bg-blue-50">
            <Text className="font-semibold text-blue-800 whitespace-nowrap">Vị trí trực:</Text>
            <Select 
              value={selectedGate} 
              onChange={(val) => setSelectedGate(val)}
              className="min-w-[200px]"
              bordered={false}
              dropdownStyle={{ borderRadius: '8px' }}
            >
              <Option value="Cổng chính - Lối vào 1">Cổng chính - Lối vào 1</Option>
              <Option value="Cổng phụ - Lối vào 2">Cổng phụ - Lối vào 2</Option>
              <Option value="Cổng VIP">Cổng VIP</Option>
            </Select>
          </div>

          <div className="flex items-center space-x-3 bg-orange-50/60 px-4 py-2 rounded-xl border border-orange-100 w-full sm:w-auto transition-colors hover:bg-orange-50">
            <Text className="font-semibold text-orange-800 whitespace-nowrap">
              <TeamOutlined className="mr-1.5"/>Số khách:
            </Text>
            <InputNumber 
              min={1} max={50} 
              value={peopleCount} onChange={handlePeopleCountChange}
              disabled={scanResult !== null} 
              size="middle" 
              className="w-20 border-orange-200"
            />
          </div>

        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        <Card 
          title={<span className="text-gray-700 font-semibold"><QrcodeOutlined className="mr-2 text-blue-600" /> Khung quét QR</span>} 
          className="shadow-sm border-gray-100 rounded-2xl overflow-hidden h-full"
          headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
          extra={
            <Button 
                type={isCameraOpen ? "default" : "primary"} danger={isCameraOpen}
                icon={isCameraOpen ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />} 
                onClick={toggleCamera}
                className="rounded-lg font-medium"
            >
                {isCameraOpen ? "Tắt Camera" : "Mở Camera"}
            </Button>
          }
        >
           <div className="relative overflow-hidden rounded-xl border-2 border-dashed border-gray-200 min-h-[350px] bg-gray-900 flex items-center justify-center">
            {isCameraOpen ? (
                <div id="qr-reader" className="w-full h-full bg-white [&>div]:!border-none"></div>
            ) : (
                <div className="text-gray-400 flex flex-col items-center">
                    <VideoCameraOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.4 }} />
                    <p className="text-sm">Camera đã được tắt để tiết kiệm pin.</p>
                </div>
            )}
          </div>
        </Card>

        <Card 
          title={<span className="text-gray-700 font-semibold">Kết quả soát vé</span>} 
          className="shadow-sm border-gray-100 rounded-2xl h-full flex flex-col"
          headStyle={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}
          bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', minHeight: '350px' }}
        >
          {!scanResult && (
            <div className="text-center text-gray-400">
              <div className="bg-gray-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                <QrcodeOutlined style={{ fontSize: '40px', opacity: 0.3 }} />
              </div>
              <p>Đưa mã QR vào khung hình để quét...</p>
            </div>
          )}

          {scanResult === 'success' && (
            <Result
              status="success"
              icon={<CheckCircleOutlined className="text-emerald-500" />}
              title={<span className="text-emerald-600 font-bold text-2xl">HỢP LỆ</span>}
              subTitle="Vé đã được xác nhận thành công. Mời khách vào cổng!"
              className="py-0"
              extra={
                <div className="text-left bg-emerald-50/50 p-5 rounded-xl border border-emerald-100 mt-4 shadow-inner">
                  <Descriptions column={1} size="small" labelStyle={{ color: '#64748b' }}>
                    <Descriptions.Item label="Khách hàng">
                      <strong className="text-lg text-gray-800">{ticketData?.customerName || 'Khách hàng'}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Loại vé">
                      <Tag color="blue" className="text-sm px-3 py-1 rounded-md border-blue-200">{ticketData?.ticketTypeName || 'Vé sự kiện'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Số khách vào cổng">
                      <strong className="text-xl text-emerald-600">{peopleCountRef.current} người</strong>
                    </Descriptions.Item>
                  </Descriptions>
                  
                  <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={resetScanner} className="mt-6 w-full bg-emerald-600 hover:bg-emerald-700 h-12 rounded-xl font-semibold">
                    Quét vé tiếp theo
                  </Button>
                </div>
              }
            />
          )}

          {scanResult === 'error' && (
            <Result
              status="error"
              icon={<CloseCircleOutlined className="text-rose-500" />}
              title={<span className="text-rose-600 font-bold text-2xl">KHÔNG HỢP LỆ</span>}
              subTitle={<span className="text-gray-600 text-base">{errorMessage}</span>}
              className="py-0"
              extra={
                 <Button danger type="primary" size="large" icon={<ReloadOutlined />} onClick={resetScanner} className="mt-4 w-full h-12 rounded-xl font-semibold bg-rose-600 hover:bg-rose-700">
                   Thử quét lại
                 </Button>
              }
            />
          )}
        </Card>
      </div>

      <Modal
        title={<span className="text-xl text-red-600 font-bold flex items-center"><span className="text-2xl mr-2">⚠️</span> LỆNH ĐIỀU PHỐI KHẨN CẤP</span>}
        open={alertData.isOpen} closable={false} maskClosable={false} centered width={550}
        className="rounded-2xl overflow-hidden"
        footer={[
          <Button key="submit" type="primary" danger size="large" onClick={handleAcknowledge} className="w-full h-12 rounded-xl font-bold text-lg">
            Đã nhận lệnh & Thực hiện ngay
          </Button>
        ]}
      >
        <div className="mt-6 mb-4">
          <p className="text-lg font-medium text-red-900 bg-red-50 p-5 border border-red-200 rounded-xl shadow-inner leading-relaxed">
            "{alertData.message}"
          </p>
          <p className="text-sm text-gray-500 mt-5 italic flex items-start">
            <span className="text-red-400 font-bold mr-1">*</span> 
            Yêu cầu: Dùng loa thông báo và hướng dẫn khách hàng di chuyển theo lệnh trên để giảm ùn tắc tại cổng.
          </p>
        </div>
      </Modal>    
    </div>
  );
};

export default CheckInPage;