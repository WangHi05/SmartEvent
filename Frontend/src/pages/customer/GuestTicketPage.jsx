import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { Card, Button, message, Result } from 'antd';
import { QrcodeOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import DynamicTicketCard from '../../components/DynamicTicketCard';

const GuestTicketPage = () => {
  const { ticketId } = useParams();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [loading, setLoading] = useState(false);
  const [ticketData, setTicketData] = useState(null); // Lưu trữ SecretKey sau khi nhận thành công
  const [errorMsg, setErrorMsg] = useState('');

  // Kiểm tra xem trình duyệt này đã từng nhận vé này chưa (Dựa vào LocalStorage)
  useEffect(() => {
    const savedTicket = localStorage.getItem(`claimed_ticket_${ticketId}`);
    if (savedTicket) {
      setTicketData(JSON.parse(savedTicket));
    }
  }, [ticketId]);

  const handleClaimTicket = async () => {
    if (!token) {
      setErrorMsg("Đường link không hợp lệ (Thiếu mã xác thực).");
      return;
    }

    setLoading(true);
    try {
      const response = await axiosClient.post('/ticketshare/claim', {
        ticketId: ticketId,
        shareToken: token
      });

      if (response.success) {
        message.success(response.message);
        
        // 1. Lưu SecretKey vào LocalStorage của máy khách này để họ F5 không bị mất
        const claimedData = {
          secretKey: response.secretKey,
          eventName: response.eventName
        };
        localStorage.setItem(`claimed_ticket_${ticketId}`, JSON.stringify(claimedData));
        
        // 2. Cập nhật State để render QR Code
        setTicketData(claimedData);
      } else {
        setErrorMsg(response.message);
      }
    } catch (error) {
      setErrorMsg(error.response?.data?.message || 'Có lỗi xảy ra khi nhận vé.');
    } finally {
      setLoading(false);
    }
  };

  // NẾU VÉ ĐÃ ĐƯỢC NHẬN BỞI THIẾT BỊ NÀY -> HIỂN THỊ MÃ QR ĐỘNG
  if (ticketData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md !rounded-3xl shadow-xl text-center">
          <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-100 text-green-600">
            <SafetyCertificateOutlined className="text-3xl" />
          </div>
          <h2 className="text-2xl font-black text-slate-800">{ticketData.eventName}</h2>
          <p className="text-slate-500 mb-8">Vé của bạn đã sẵn sàng</p>

          <div className="rounded-2xl border-2 border-dashed border-slate-300 p-8 bg-white">
          <div className="flex justify-center">
                <DynamicTicketCard 
                   ticketId={ticketId}
                   secretKey={ticketData.secretKey} 
                   eventName={ticketData.eventName}
                />
            </div>
            <p className="mt-4 text-xs font-semibold text-red-500">
              * Mã QR tự động làm mới. Vui lòng không chụp ảnh màn hình.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  // NẾU CÓ LỖI (Ví dụ: Link đã bị người khác xài)
  if (errorMsg) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <Card className="w-full max-w-md !rounded-3xl shadow-xl">
          <Result
            status="error"
            title="Nhận vé thất bại"
            subTitle={errorMsg}
            extra={
              <Button type="primary" onClick={() => window.location.href = '/'}>
                Về trang chủ
              </Button>
            }
          />
        </Card>
      </div>
    );
  }

  // GIAO DIỆN CHỜ XÁC NHẬN NHẬN VÉ (Mới truy cập link)
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
      <Card className="w-full max-w-md !rounded-3xl shadow-xl text-center">
        <div className="mb-6 inline-flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 text-orange-600">
          <QrcodeOutlined className="text-3xl" />
        </div>
        <h2 className="text-2xl font-black text-slate-800">Bạn nhận được 1 vé sự kiện!</h2>
        <p className="text-slate-500 mb-8 mt-2">
          Vui lòng nhấn nút bên dưới để xác nhận và lưu vé vào thiết bị này. 
          <br/><span className="text-red-500 font-semibold">Lưu ý: Link này chỉ sử dụng được 1 lần duy nhất!</span>
        </p>

        <Button 
          type="primary" 
          size="large" 
          className="!h-14 !rounded-xl !bg-orange-500 w-full font-bold text-lg"
          onClick={handleClaimTicket}
          loading={loading}
        >
          XÁC NHẬN NHẬN VÉ
        </Button>
      </Card>
    </div>
  );
};

export default GuestTicketPage;