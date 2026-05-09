import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Radio, Divider, message, Empty, Form, Input, Tooltip, Alert } from 'antd';
import { ArrowLeftOutlined, CreditCardOutlined, QrcodeOutlined, ShoppingCartOutlined, CheckCircleOutlined, InfoCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import useAuthStore from '../../store/useAuthStore';
import { CustomerSectionTitle, formatCurrency } from '../../components/customer/CustomerPrimitives';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;
  const [paymentMethod, setPaymentMethod] = useState(1);
  const [loading, setLoading] = useState(false);

  const [form] = Form.useForm();

  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (user) {
      form.setFieldsValue({
        fullName: user.fullName || '',
        phone: user.phoneNumber || '',
        cccd: user.cccd || ''
      });
    }
  }, [form]);

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
    try {
      // 1. Validate Form thông tin định danh trước
      const values = await form.validateFields();
      
      setLoading(true);
      
      // 2. Gom dữ liệu tạo order
      const firstSelection = bookingData.selections[0];
      const orderData = {
        eventId: bookingData.eventId,
        ticketTypeId: firstSelection.ticketTypeId,
        quantity: firstSelection.quantity,
        memberCount: firstSelection.memberCount,
        paymentMethod: paymentMethod,
        buyerName: values.fullName,
        buyerPhone: values.phone,
        buyerCccd: values.cccd || null 
      };

      const response = await axiosClient.post('/orders', orderData);
      const result = response.data || response;

      message.success('Tạo đơn hàng thành công!');

      // 3. Xử lý chuyển hướng thanh toán
      const paymentPayload = {
        orderId: result?.orderId,
        totalPrice: Number(result?.totalPrice || bookingData.totalPrice || 0),
        paymentMethod: Number(result?.paymentMethod || paymentMethod),
        paymentMethodName: result?.paymentMethodName || '',
        status: 'pending'
      };

      sessionStorage.setItem('lastPaymentContext', JSON.stringify(paymentPayload));

      if (paymentPayload.paymentMethod === 1) { // VNPay
        const paymentUrlResponse = await axiosClient.post(`/orders/${paymentPayload.orderId}/vnpay-payment-url`);
        const paymentUrl = paymentUrlResponse?.paymentUrl || paymentUrlResponse?.data?.paymentUrl;

        if (!paymentUrl) {
          throw new Error('Không tạo được link thanh toán VNPay');
        }
        window.location.href = paymentUrl;
        return;
      }

      navigate('/customer/payment-result', { state: paymentPayload });
    } catch (error) {
      if (error.errorFields) {
        // Lỗi do chưa nhập đủ thông tin bắt buộc trong form
        message.warning('Vui lòng điền đầy đủ thông tin bắt buộc');
      } else {
        console.error('Error creating order:', error);
        message.error(error.response?.data?.message || 'Không thể tạo đơn hàng');
      }
    } finally {
      setLoading(false);
    }
  };

  const paymentOptions = [
    {
      value: 1,
      title: 'VNPay',
      description: 'Thanh toán qua cổng VNPay (thẻ ngân hàng, ví điện tử)',
      icon: CreditCardOutlined,
      accent: 'from-orange-500 to-amber-500',
    },
    {
      value: 2,
      title: 'QR Payment',
      description: 'Chuyển khoản mã QR',
      icon: QrcodeOutlined,
      accent: 'from-emerald-500 to-teal-500',
    },
    {
      value: 3,
      title: 'Thanh toán tại quầy',
      description: 'Nhận vé và thanh toán trực tiếp',
      icon: ShoppingCartOutlined,
      accent: 'from-slate-800 to-slate-600',
    },
  ];

  return (
    <div className="space-y-8 py-2 max-w-6xl mx-auto">
      <CustomerSectionTitle
        kicker="Checkout"
        title="Thanh toán & Nhận vé"
        description="Hoàn tất thông tin cá nhân và chọn phương thức thanh toán để nhận mã QR Check-in."
        action={(
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        )}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <div className="space-y-6">
            <Card className="overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.06)]" bodyStyle={{ padding: 24 }}>
              <h3 className="text-xl font-black text-slate-950">Tóm tắt đơn hàng</h3>
              
              <div className="mt-6 rounded-3xl bg-slate-950 p-5 text-white">
                <p className="text-xs uppercase tracking-[0.2em] text-white/60">Sự kiện</p>
                <p className="mt-2 text-2xl font-black">{bookingData.eventName}</p>
              </div>

              <div className="mt-6 space-y-3">
                {bookingData.selections.map((selection, index) => (
                  <div key={index} className="flex items-start justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <div>
                      <p className="font-bold text-slate-950">{selection.ticketTypeName}</p>
                      <p className="text-sm text-slate-500">{selection.quantity} vé × {formatCurrency(selection.price)}</p>
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

            <Card className="overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.06)]" bodyStyle={{ padding: 24 }}>
              <div className="flex items-center gap-3 mb-6">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-600">
                  <SafetyCertificateOutlined className="text-xl" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-950">Thông tin nhận vé</h3>
                  <p className="text-sm text-slate-500">Mã QR Check-in sẽ được gắn với thông tin này.</p>
                </div>
              </div>

              <Form form={form} layout="vertical" requiredMark={false}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item 
                      name="fullName" 
                      label={<span className="font-semibold text-slate-700">Họ và tên <span className="text-red-500">*</span></span>}
                      rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                      <Input size="large" className="!rounded-xl" placeholder="Nhập tên người đi" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item 
                      name="phone" 
                      label={<span className="font-semibold text-slate-700">Số điện thoại <span className="text-red-500">*</span></span>}
                      rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                    >
                      <Input size="large" className="!rounded-xl" placeholder="Để nhận thông báo" />
                    </Form.Item>
                  </Col>
                </Row>
                
                <Form.Item 
                  name="cccd" 
                  className="mb-0"
                  label={
                    <div className="flex items-center">
                      <span className="font-semibold text-slate-700">Số CMND / CCCD</span>
                      <span className="ml-1 text-slate-400 font-normal">(Tùy chọn)</span>
                      <Tooltip 
                        title="Dữ liệu này được mã hóa bảo mật. Dùng để đối chiếu tại Quầy Hỗ Trợ (Help Desk) trong trường hợp bạn làm mất điện thoại hoặc lỗi vé."
                        placement="top"
                      >
                        <InfoCircleOutlined className="ml-2 text-orange-500 cursor-help" />
                      </Tooltip>
                    </div>
                  }
                >
                  <Input size="large" className="!rounded-xl" placeholder="Nhập số CCCD (Khuyến nghị)" />
                </Form.Item>

                <Alert
                  className="mt-4 !rounded-xl !border-orange-200 !bg-orange-50"
                  type="warning"
                  showIcon
                  message={<span className="font-semibold text-orange-800">Lưu ý quan trọng về Xử lý sự cố</span>}
                  description={
                    <span className="text-orange-700 text-sm">
                      Theo quy định của BTC, nếu bạn không cung cấp CCCD lúc mua vé, trong trường hợp bạn làm mất điện thoại hoặc không có kết nối mạng tại sự kiện, Quầy hỗ trợ (Help Desk) sẽ <b>không có cơ sở để xác minh danh tính và có quyền từ chối cấp lại thẻ/vé vào cổng</b>.
                    </span>
                  }
                />
              </Form>
            </Card>
          </div>
        </Col>

        <Col xs={24} lg={10}>
          <Card className="overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sticky top-6" styles={{ body: { padding: 24 } }}>
            <h3 className="text-xl font-black text-slate-950">Phương thức thanh toán</h3>
            <p className="mt-1 text-sm text-slate-500">Chọn phương thức phù hợp với bạn.</p>

            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 20 }}
            >
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const selected = paymentMethod === option.value;
                return (
                  <Card
                    key={option.value}
                    onClick={() => setPaymentMethod(option.value)}
                    className={`cursor-pointer !rounded-2xl border transition ${selected ? 'border-orange-500 bg-orange-50 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                    styles={{ body: { padding: 16 } }}
                  >
                    <Radio value={option.value} className="w-full">
                      <div className="flex items-center gap-3">
                        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br ${option.accent} text-white`}>
                          <Icon className="text-lg" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-slate-950">{option.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1">{option.description}</p>
                        </div>
                        {selected && <CheckCircleOutlined className="text-orange-600 text-lg" />}
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
              className="!h-14 !rounded-2xl !border-orange-500 !bg-orange-500 !text-lg !font-bold shadow-[0_8px_20px_rgba(249,115,22,0.3)] hover:shadow-[0_10px_25px_rgba(249,115,22,0.4)] transition-all"
            >
              Thanh toán {formatCurrency(bookingData.totalPrice)}
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CheckoutPage;