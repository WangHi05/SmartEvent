import React, { useState, useEffect, useRef } from 'react';
import { Card, Result, Button, Typography, Descriptions, message, Tag, InputNumber, Form } from 'antd';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { QrcodeOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined, TeamOutlined, VideoCameraOutlined, VideoCameraAddOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient'; 

const { Title, Text } = Typography;

const CheckInPage = () => {
  const [scanResult, setScanResult] = useState(null); 
  const [ticketData, setTicketData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  // State mới: Lưu số lượng khách muốn check-in (Mặc định là 1 cho vé lẻ)
  const [peopleCount, setPeopleCount] = useState(1);

  const [isCameraOpen, setIsCameraOpen] = useState(true);
  
  const peopleCountRef = useRef(1);
  const scannerRef = useRef(null);
  const isLockedRef = useRef(false); 

  const handlePeopleCountChange = (value) => {
    const val = value || 1;
    setPeopleCount(val);
    peopleCountRef.current = val;
  };

  useEffect(() => {
    if (!isCameraOpen) return;

    const qrContainer = document.getElementById('qr-reader');
    if (!qrContainer) return;

    qrContainer.innerHTML = '';

    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] 
      },
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
  },  [isCameraOpen]); 

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
      // Gửi số lượng người (peopleCount) lấy từ ô Input xuống Backend
      const currentCount = peopleCountRef.current;
      const response = await axiosClient.post(`/checkin/scan`, {
        qrPayload: qrPayload,
        peopleCount: currentCount, 
        gateName: 'Cổng chính - Lối vào 1'
      });
      
      if (response.isSuccess || response.data?.isSuccess) {
        setScanResult('success');
        setTicketData(response.data?.data || response.data); 
        message.success(`Check-in thành công ${peopleCount} vé!`);
        
        // NẾU LÀ SỰ KIỆN B2B: Bật cờ in thẻ
        if (response.data?.data?.message?.includes("in thẻ") || response.data?.message?.includes("in thẻ")) {
            message.info("Đang gửi lệnh đến máy in thẻ...");
            // Gọi hàm in thẻ thực tế ở đây (Webhook/Print API)
        }
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
    // Nếu đang tắt camera, reset luôn kết quả màn hình cho sạch sẽ
    if (isCameraOpen) {
        resetScanner();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6 flex justify-between items-end">
        <div>
            <Title level={2}>Soát vé tại cổng</Title>
            <Text type="secondary">Cơ chế tự động phân loại Vé Lẻ & Vé Đoàn</Text>
        </div>
        
        <Card size="small" className="bg-blue-50 border-blue-200">
            <Form layout="vertical" className="mb-0">
                <Form.Item label={<span className="font-semibold"><TeamOutlined className="mr-2"/>Số khách vào cổng:</span>} className="mb-0">
                    <InputNumber 
                        min={1} 
                        max={50} 
                        value={peopleCount}
                        onChange={handlePeopleCountChange}
                        disabled={scanResult !== null} // Khóa khi đang hiện kết quả
                        size="large"
                        className="w-32"
                    />
                    <Text type="secondary" className="ml-3 text-xs">(Sửa trước khi quét)</Text>
                </Form.Item>
            </Form>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={<span><QrcodeOutlined className="mr-2" /> Khung quét QR</span>} className="shadow-sm"
          extra={
            <Button 
                type={isCameraOpen ? "default" : "primary"} 
                danger={isCameraOpen}
                icon={isCameraOpen ? <VideoCameraOutlined /> : <VideoCameraAddOutlined />}
                onClick={toggleCamera}
            >
                {isCameraOpen ? "Tắt Camera" : "Mở Camera"}
            </Button>
          }
        >
           <div className="relative overflow-hidden rounded-lg border border-gray-200 min-h-[300px] bg-black flex items-center justify-center">
            {isCameraOpen ? (
                <div id="qr-reader" className="w-full h-full bg-white"></div>
            ) : (
                <div className="text-gray-400 flex flex-col items-center">
                    <VideoCameraOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
                    <p>Camera đã được tắt để tiết kiệm pin.</p>
                </div>
            )}
          </div>
        </Card>

        <Card title="Kết quả soát vé" className="shadow-sm flex flex-col justify-center min-h-[400px]">
          {!scanResult && (
            <div className="text-center text-gray-400 py-12">
              <QrcodeOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <p>Đang chờ quét mã QR...</p>
            </div>
          )}

          {scanResult === 'success' && (
            <Result
              status="success"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="HỢP LỆ"
              subTitle="Vé đã được xác nhận thành công. Mời khách vào cổng!"
              extra={
                <div className="text-left bg-gray-50 p-4 rounded-lg mt-4">
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Khách hàng">
                      <strong className="text-lg">{ticketData?.customerName || 'Khách hàng'}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Loại vé">
                      <Tag color="blue" className="text-sm px-2 py-1">{ticketData?.ticketTypeName || 'Vé sự kiện'}</Tag>
                    </Descriptions.Item>
                    <Descriptions.Item label="Số khách vào cổng">
                      <strong className="text-xl text-emerald-600">{peopleCountRef.current} người</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Thời gian">
                      {new Date().toLocaleTimeString('vi-VN')}
                    </Descriptions.Item>
                  </Descriptions>
                </div>
              }
            >
              <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={resetScanner} className="mt-4 w-full">
                Quét vé tiếp theo
              </Button>
            </Result>
          )}

          {scanResult === 'error' && (
            <Result
              status="error"
              icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
              title="KHÔNG HỢP LỆ"
              subTitle={<span className="text-red-500 font-semibold text-lg">{errorMessage}</span>}
            >
              <Button danger type="primary" size="large" icon={<ReloadOutlined />} onClick={resetScanner} className="mt-4 w-full">
                Thử quét lại
              </Button>
            </Result>
          )}
        </Card>
      </div>
    </div>
  );
};

export default CheckInPage;