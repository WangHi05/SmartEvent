import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Radio, Divider, message, Empty } from 'antd';
import { ArrowLeftOutlined, CreditCardOutlined, QrcodeOutlined, ShoppingCartOutlined, CheckCircleOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { CustomerSectionTitle, formatCurrency } from '../../components/customer/CustomerPrimitives';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;
  const [paymentMethod, setPaymentMethod] = useState(1); // 1=VNPAY, 2=QRPayment, 3=Counter
  const [loading, setLoading] = useState(false);

  if (!bookingData) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
        <Empty description="Không tìm thấy dữ liệu đơn hàng" />
        <Button type="primary" block onClick={() => navigate('/customer/events')} className="mt-4 !h-11 !rounded-2xl !border-orange-500 !bg-orange-500">
          Quay lại danh sách sự kiện
        </Button>
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    setLoading(true);
    try {
      // Create order with first selected ticket type
      const firstSelection = bookingData.selections[0];
      const orderData = {
        eventId: bookingData.eventId,
        ticketTypeId: firstSelection.ticketTypeId,
        quantity: firstSelection.quantity,
        paymentMethod: paymentMethod
      };

      const response = await axiosClient.post('/orders', orderData);
      const result = response.data || response;

      message.success('Tạo đơn hàng thành công!');

      // Navigate to payment page based on payment method
      const paymentPayload = {
        orderId: result?.orderId,
        totalPrice: Number(result?.totalPrice || bookingData.totalPrice || 0),
        paymentMethod: Number(result?.paymentMethod || paymentMethod),
        paymentMethodName: result?.paymentMethodName || '',
        status: 'pending'
      };

      sessionStorage.setItem('lastPaymentContext', JSON.stringify(paymentPayload));

      if (paymentPayload.paymentMethod === 1) {
        const paymentUrlResponse = await axiosClient.post(`/orders/${paymentPayload.orderId}/vnpay-payment-url`);
        const paymentUrl = paymentUrlResponse?.paymentUrl || paymentUrlResponse?.data?.paymentUrl;

        if (!paymentUrl) {
          throw new Error('Không tạo được link thanh toán VNPay');
        }

        window.location.href = paymentUrl;
        return;
      }

      navigate('/customer/payment-result', {
        state: paymentPayload
      });
    } catch (error) {
      console.error('Error creating order:', error);
      message.error(error.response?.data?.message || 'Không thể tạo đơn hàng');
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    {
      value: 1,
      title: 'VNPay',
      description: 'Thanh toán qua cổng VNPay (thẻ ngân hàng, ví điện tử, ...)',
      icon: CreditCardOutlined,
      accent: 'from-orange-500 to-amber-500',
    },
    {
      value: 2,
      title: 'QR Payment',
      description: 'Thanh toán qua mã QR (phương thức ảo/demo)',
      icon: QrcodeOutlined,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      value: 3,
      title: 'Thanh toán tại quầy',
      description: 'Thanh toán khi nhận vé tại quầy (nhân viên xác nhận)',
      icon: ShoppingCartOutlined,
      accent: 'from-slate-800 to-slate-600',
    },
  ];

  return (
    <div className="space-y-8 py-2">
      <CustomerSectionTitle
        kicker="Checkout"
        title="Thanh toán"
        description="Giữ nguyên luồng tạo đơn và VNPay nhưng đưa vào giao diện premium, dễ đọc và rõ nút hành động."
        action={(
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        )}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <Card className="overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]" bodyStyle={{ padding: 24 }}>
            <h3 className="text-xl font-black text-slate-950">Tóm tắt đơn hàng</h3>
            <p className="mt-1 text-sm text-slate-500">Kiểm tra lại sự kiện, loại vé và số lượng trước khi thanh toán.</p>

            <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
              <p className="text-xs uppercase tracking-[0.2em] text-white/60">Sự kiện</p>
              <p className="mt-2 text-2xl font-black">{bookingData.eventName}</p>
              <p className="mt-2 text-sm text-white/70">Tổng cộng: {formatCurrency(bookingData.totalPrice)}</p>
            </div>

            <div className="mt-6 space-y-3">
              {bookingData.selections.map((selection, index) => (
                <div key={index} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div>
                    <p className="font-bold text-slate-950">{selection.ticketTypeName}</p>
                    <p className="text-sm text-slate-500">{selection.quantity} × {formatCurrency(selection.price)}</p>
                  </div>
                  <div className="text-right font-black text-slate-950">{formatCurrency(selection.subtotal)}</div>
                </div>
              ))}
            </div>

            <Divider />

            <div className="flex items-center justify-between">
              <span className="text-base font-semibold text-slate-600">Tổng cộng</span>
              <span className="text-3xl font-black text-orange-600">{formatCurrency(bookingData.totalPrice)}</span>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]" bodyStyle={{ padding: 24 }}>
            <CustomerSectionTitle kicker="Payment" title="Chọn phương thức thanh toán" description="Thiết kế card chọn payment rõ hơn nhưng không đổi action create-order hay VNPay redirect." />

            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 24 }}
            >
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const selected = paymentMethod === option.value;
                return (
                  <Card
                    key={option.value}
                    onClick={() => setPaymentMethod(option.value)}
                    className={`cursor-pointer !rounded-3xl border transition ${selected ? 'border-orange-400 shadow-[0_18px_40px_rgba(249,115,22,0.15)]' : 'border-slate-200 hover:border-slate-300'}`}
                    bodyStyle={{ padding: 18 }}
                  >
                    <Radio value={option.value} className="w-full">
                      <div className="flex items-start gap-4">
                        <div className={`flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${option.accent} text-white`}>
                          <Icon />
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-slate-950">{option.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                        </div>
                        {selected ? <CheckCircleOutlined className="ml-auto text-emerald-500" /> : null}
                      </div>
                    </Radio>
                  </Card>
                );
              })}
            </Radio.Group>

            <Divider />

            <Button
              type="primary"
              block
              size="large"
              onClick={handlePlaceOrder}
              loading={loading}
              disabled={loading}
              className="!h-12 !rounded-2xl !border-orange-500 !bg-orange-500 !font-semibold"
            >
              Đặt hàng ({formatCurrency(bookingData.totalPrice)})
            </Button>

            <Button type="default" block className="mt-3 !h-12 !rounded-2xl" onClick={() => navigate(-1)} disabled={loading}>
              Hủy
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CheckoutPage;
