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
  const [bookingData, setBookingData] = useState(location.state || null);
  const [paymentMethod, setPaymentMethod] = useState(1);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!location.state) {
      const cached = sessionStorage.getItem('checkoutBookingData');
      if (cached) {
        try {
          setBookingData(JSON.parse(cached));
        } catch (e) {
          // dữ liệu cache lỗi, bỏ qua
        }
      }
    }

    const params = new URLSearchParams(location.search);
    if (params.get('vnpayCancelled') === '1') {
      message.info('Bạn đã hủy thanh toán VNPay. Vui lòng thử lại.');
    }
  }, []);

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
      <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
        <Empty description="Không tìm thấy dữ liệu đơn hàng" />
        <Button type="primary" block onClick={() => navigate('/customer/events')} className="mt-4 !h-11 !rounded-lg !border-orange-600 !bg-orange-600">
          Quay lại danh sách sự kiện
        </Button>
      </div>
    );
  }

    const handlePlaceOrder = async () => {
    try {
      const values = await form.validateFields();

      setLoading(true);

      const orderData = {
        eventId: bookingData.eventId,
        items: bookingData.selections.map((selection) => ({
          ticketTypeId: selection.ticketTypeId,
          quantity: selection.quantity,
          memberCount: selection.memberCount,
        })),
        paymentMethod: paymentMethod,
        buyerName: values.fullName,
        buyerPhone: values.phone,
        buyerCccd: values.cccd || null
      };

      if (paymentMethod === 1) { // VNPay: CHƯA tạo đơn hàng thật, chỉ khởi tạo và lấy link thanh toán
        const initiateResponse = await axiosClient.post('/orders/vnpay-initiate', orderData);
        const paymentUrl = initiateResponse?.paymentUrl || initiateResponse?.data?.paymentUrl;

        if (!paymentUrl) {
          throw new Error('Không tạo được link thanh toán VNPay');
        }
        sessionStorage.setItem('checkoutBookingData', JSON.stringify(bookingData));
        window.location.href = paymentUrl;
        return;
      }

      // QR Payment / Thanh toán tại quầy: giữ nguyên luồng cũ (tạo đơn ngay)
      const response = await axiosClient.post('/orders', orderData);
      const result = response.data || response;

      message.success('Tạo đơn hàng thành công!');

      const paymentPayload = {
        orderId: result?.orderId,
        totalPrice: Number(result?.totalPrice || bookingData.totalPrice || 0),
        paymentMethod: Number(result?.paymentMethod || paymentMethod),
        paymentMethodName: result?.paymentMethodName || '',
        status: 'pending'
      };

      sessionStorage.setItem('lastPaymentContext', JSON.stringify(paymentPayload));

      navigate('/customer/payment-result', { state: paymentPayload });
    } catch (error) {
      if (error.errorFields) {
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
    },
    {
      value: 2,
      title: 'QR Payment',
      description: 'Chuyển khoản mã QR',
      icon: QrcodeOutlined,
    },
    {
      value: 3,
      title: 'Thanh toán tại quầy',
      description: 'Nhận vé và thanh toán trực tiếp',
      icon: ShoppingCartOutlined,
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 py-2">
      <CustomerSectionTitle
        kicker="Checkout"
        title="Thanh toán & nhận vé"
        description="Hoàn tất thông tin cá nhân và chọn phương thức thanh toán để nhận mã QR check-in."
        action={(
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate(-1)}>
            Quay lại
          </Button>
        )}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          <div className="space-y-6">
            <Card className="overflow-hidden !rounded-xl border border-gray-200" styles={{ body: { padding: 24 } }}>
              <h3 className="text-lg font-bold text-gray-900">Tóm tắt đơn hàng</h3>

              <div className="mt-5 rounded-lg bg-gray-900 p-5 text-white">
                <p className="text-xs uppercase tracking-wide text-gray-400">Sự kiện</p>
                <p className="mt-1.5 text-xl font-bold">{bookingData.eventName}</p>
              </div>

              <div className="mt-5 space-y-2.5">
                {bookingData.selections.map((selection, index) => (
                  <div key={index} className="flex items-start justify-between rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <div>
                      <p className="font-semibold text-gray-900">{selection.ticketTypeName}</p>
                      <p className="text-sm text-gray-500">{selection.quantity} vé × {formatCurrency(selection.price)}</p>
                    </div>
                    <div className="text-right font-bold text-gray-900">{formatCurrency(selection.subtotal)}</div>
                  </div>
                ))}
              </div>
              <Divider />
              <div className="flex items-center justify-between">
                <span className="text-base font-semibold text-gray-600">Tổng cộng</span>
                <span className="text-2xl font-bold text-orange-700">{formatCurrency(bookingData.totalPrice)}</span>
              </div>
            </Card>

            <Card className="overflow-hidden !rounded-xl border border-gray-200" styles={{ body: { padding: 24 } }}>
              <div className="mb-5 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-50 text-orange-700">
                  <SafetyCertificateOutlined className="text-lg" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Thông tin nhận vé</h3>
                  <p className="text-sm text-gray-500">Mã QR check-in sẽ được gắn với thông tin này.</p>
                </div>
              </div>

              <Form form={form} layout="vertical" requiredMark={false}>
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="fullName"
                      label={<span className="font-medium text-gray-700">Họ và tên <span className="text-red-500">*</span></span>}
                      rules={[{ required: true, message: 'Vui lòng nhập họ tên' }]}
                    >
                      <Input size="large" className="!rounded-lg" placeholder="Nhập tên người đi" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      name="phone"
                      label={<span className="font-medium text-gray-700">Số điện thoại <span className="text-red-500">*</span></span>}
                      rules={[{ required: true, message: 'Vui lòng nhập số điện thoại' }]}
                    >
                      <Input size="large" className="!rounded-lg" placeholder="Để nhận thông báo" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  name="cccd"
                  className="mb-0"
                  label={
                    <div className="flex items-center">
                      <span className="font-medium text-gray-700">Số CMND / CCCD</span>
                      <span className="ml-1 font-normal text-gray-400">(Tùy chọn)</span>
                      <Tooltip
                        title="Dữ liệu này được mã hóa bảo mật. Dùng để đối chiếu tại Quầy Hỗ Trợ (Help Desk) trong trường hợp bạn làm mất điện thoại hoặc lỗi vé."
                        placement="top"
                      >
                        <InfoCircleOutlined className="ml-2 cursor-help text-gray-400" />
                      </Tooltip>
                    </div>
                  }
                >
                  <Input size="large" className="!rounded-lg" placeholder="Nhập số CCCD (khuyến nghị)" />
                </Form.Item>

                <Alert
                  className="mt-4 !rounded-lg !border-amber-200 !bg-amber-50"
                  type="warning"
                  showIcon
                  message={<span className="font-semibold text-amber-800">Lưu ý quan trọng về xử lý sự cố</span>}
                  description={
                    <span className="text-sm text-amber-700">
                      Theo quy định của BTC, nếu bạn không cung cấp CCCD lúc mua vé, trong trường hợp bạn làm mất điện thoại hoặc không có kết nối mạng tại sự kiện, Quầy hỗ trợ (Help Desk) sẽ <b>không có cơ sở để xác minh danh tính và có quyền từ chối cấp lại thẻ/vé vào cổng</b>.
                    </span>
                  }
                />
              </Form>
            </Card>
          </div>
        </Col>

        <Col xs={24} lg={10}>
            <Card className="lg:sticky lg:top-6 overflow-hidden !rounded-xl border border-gray-200" styles={{ body: { padding: 24 } }}>
            <h3 className="text-lg font-bold text-gray-900">Phương thức thanh toán</h3>
            <p className="mt-1 text-sm text-gray-500">Chọn phương thức phù hợp với bạn.</p>

            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 18 }}
            >
              {paymentOptions.map((option) => {
                const Icon = option.icon;
                const selected = paymentMethod === option.value;
                return (
                  <Card
                    key={option.value}
                    onClick={() => setPaymentMethod(option.value)}
                    className={`cursor-pointer !rounded-lg border transition ${selected ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}
                    styles={{ body: { padding: 14 } }}
                  >
                    <Radio value={option.value} className="w-full">
                      <div className="flex items-center gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600">
                          <Icon className="text-base" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-gray-900">{option.title}</p>
                          <p className="line-clamp-1 text-xs text-gray-500">{option.description}</p>
                        </div>
                        {selected && <CheckCircleOutlined className="text-lg text-orange-600" />}
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
              className="!h-12 !rounded-lg !border-orange-600 !bg-orange-600 !text-base !font-semibold hover:!border-orange-700 hover:!bg-orange-700"
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