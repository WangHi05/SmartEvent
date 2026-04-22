import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Card, Result, Button, Typography, Descriptions, message, Tag } from 'antd';
import { Html5QrcodeScanner, Html5QrcodeScannerState } from 'html5-qrcode';
import { QrcodeOutlined, ReloadOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient'; 

const { Title, Text } = Typography;

const CheckInPage = () => {
  const [scanResult, setScanResult] = useState(null); 
  const [ticketData, setTicketData] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  
  const scannerRef = useRef(null);
  // Dùng useRef thay cho useState để tránh lỗi "Stale Closure" trong callback của máy quét
  const processingRef = useRef(false); 
  const hasResultRef = useRef(false);

  // Đồng bộ ref với state để UI và Logic không bị lệch
  useEffect(() => {
    hasResultRef.current = !!scanResult;
  }, [scanResult]);

  useEffect(() => {
    // Luôn khởi tạo mới instance trong mỗi vòng đời của component
    const scanner = new Html5QrcodeScanner(
      "qr-reader",
      { 
        fps: 10, 
        qrbox: { width: 250, height: 250 }, 
        rememberLastUsedCamera: true,
        supportedScanTypes: [0] // Chỉ quét QR Code (loại bỏ barcode) để tăng tốc độ
      },
      false // verbose = false
    );
    
    scannerRef.current = scanner;

    // Render máy quét
    scanner.render(onScanSuccess, onScanFailure);

    // CLEANUP QUAN TRỌNG: Xóa máy quét và đặt ref về null khi component bị hủy (hoặc do StrictMode)
    return () => {
      if (scannerRef.current) {
        scannerRef.current.clear().catch(error => {
            console.log("Scanner clear internal info:", error);
        });
        scannerRef.current = null; // BẮT BUỘC PHẢI CÓ DÒNG NÀY ĐỂ FIX TRẮNG CAMERA
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onScanSuccess = async (decodedText) => {
    // Kiểm tra thông qua Ref để luôn lấy được giá trị mới nhất, tránh gọi API 2 lần
    if (processingRef.current || hasResultRef.current) return;

    processingRef.current = true;
    
    // AN TOÀN HƠN: Chỉ pause khi máy quét đang thực sự chạy
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.SCANNING) {
      scannerRef.current.pause();
    }

    // Trích xuất đúng chuẩn GUID
    const guidRegex = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const match = decodedText.match(guidRegex);

    if (!match) {
        setScanResult('error');
        setErrorMessage('Mã QR không chứa định dạng ID vé hợp lệ (Guid).');
        processingRef.current = false;
        return;
    }

    const ticketId = match[0];

    try {
      const response = await axiosClient.post(`/tickets/${ticketId}/checkin`);
      
      if (response.isSuccess) {
        setScanResult('success');
        setTicketData(response);
        message.success('Check-in thành công!');
      } else {
        setScanResult('error');
        setErrorMessage(response.message || 'Vé không hợp lệ');
        message.error('Check-in thất bại!');
      }
    } catch (error) {
      setScanResult('error');
      
      // NÂNG CẤP: Chẩn đoán lỗi cực kỳ chi tiết để dev dễ dàng bắt bệnh
      if (!error.response) {
        setErrorMessage('Lỗi mạng: Không thể kết nối đến Backend. Hãy chắc chắn bạn đã chạy lệnh "dotnet run".');
      } else if (error.response.status === 404) {
        setErrorMessage(`Lỗi 404: Không tìm thấy API check-in. Hãy lưu lại file TicketsController.cs và khởi động lại Backend.`);
      } else if (error.response.status === 400) {
        setErrorMessage(error.response?.data?.message || 'Vé không hợp lệ hoặc đã được sử dụng.');
      } else {
        setErrorMessage(error.response?.data?.message || error.response?.data?.title || 'Lỗi hệ thống máy chủ.');
      }

      message.error('Có lỗi xảy ra khi gọi máy chủ!');
    } finally {
      processingRef.current = false;
    }
  };

  const onScanFailure = (error) => {
    // Bỏ qua log để tránh spam console
  };

  const resetScanner = () => {
    setScanResult(null);
    setTicketData(null);
    setErrorMessage('');
    processingRef.current = false;
    
    // Resume lại camera
    if (scannerRef.current && scannerRef.current.getState() === Html5QrcodeScannerState.PAUSED) {
      scannerRef.current.resume();
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <Title level={2}>Soát vé tại cổng (Check-in)</Title>
        <Text type="secondary">Đưa mã QR của khách hàng vào khung hình để kiểm tra trạng thái vé.</Text>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* CỘT TRÁI: CAMERA QUÉT MÃ */}
        <Card title={<span><QrcodeOutlined className="mr-2" /> Khung quét QR</span>} className="shadow-sm">
          <div className="relative overflow-hidden rounded-lg border border-gray-200 min-h-[300px] bg-gray-50 flex items-center justify-center">
            {/* Vùng div này sẽ được html5-qrcode tiêm giao diện camera vào */}
            <div id="qr-reader" className="w-full h-full"></div>
          </div>
        </Card>

        {/* CỘT PHẢI: KẾT QUẢ CHECK-IN */}
        <Card title="Kết quả soát vé" className="shadow-sm flex flex-col justify-center min-h-[400px]">
          {!scanResult && (
            <div className="text-center text-gray-400 py-12">
              <QrcodeOutlined style={{ fontSize: '48px', marginBottom: '16px', opacity: 0.5 }} />
              <p>Đang chờ quét mã QR...</p>
            </div>
          )}

          {scanResult === 'success' && ticketData && (
            <Result
              status="success"
              icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              title="HỢP LỆ"
              subTitle="Vé đã được xác nhận thành công. Mời khách vào cổng!"
              extra={
                <div className="text-left bg-gray-50 p-4 rounded-lg mt-4">
                  <Descriptions column={1} size="small" bordered>
                    <Descriptions.Item label="Khách hàng">
                      <strong className="text-lg">{ticketData.customerName}</strong>
                    </Descriptions.Item>
                    <Descriptions.Item label="Loại vé">
                      <Tag color="blue" className="text-sm px-2 py-1">{ticketData.ticketTypeName}</Tag>
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