import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Radio, Divider, message, Empty } from 'antd';
import { ArrowLeftOutlined, CreditCardOutlined, QrcodeOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';

const CheckoutPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;
  const [paymentMethod, setPaymentMethod] = useState(1); // 1=VNPAY, 2=QRPayment, 3=Counter
  const [loading, setLoading] = useState(false);

  if (!bookingData) {
    return (
      <div style={{ padding: '50px 20px' }}>
        <Empty description="Không tìm thấy dữ liệu đơn hàng" />
        <Button type="primary" block onClick={() => navigate('/customer/events')}>
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

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate(-1)}
        >
          Quay lại
        </Button>
        <h2 style={{ margin: 0 }}>Thanh toán</h2>
      </div>

      <Row gutter={[24, 24]}>
        {/* Order Summary */}
        <Col xs={24} md={14}>
          <Card title="Tóm tắt đơn hàng">
            <div style={{ marginBottom: '16px' }}>
              <strong>Sự kiện:</strong> {bookingData.eventName}
            </div>

            <Divider />

            <div style={{ marginBottom: '16px' }}>
              <strong>Chi tiết vé:</strong>
            </div>

            {bookingData.selections.map((selection, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  padding: '8px',
                  backgroundColor: '#fafafa',
                  borderRadius: '4px'
                }}
              >
                <div>
                  <div>{selection.ticketTypeName}</div>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    {selection.quantity} × {selection.price?.toLocaleString('vi-VN')}₫
                  </div>
                </div>
                <div style={{ textAlign: 'right', fontWeight: 'bold' }}>
                  {selection.subtotal?.toLocaleString('vi-VN')}₫
                </div>
              </div>
            ))}

            <Divider />

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: 'bold' }}>
              <span>Tổng cộng:</span>
              <span style={{ color: '#1890ff', fontSize: '20px' }}>
                {bookingData.totalPrice.toLocaleString('vi-VN')}₫
              </span>
            </div>
          </Card>
        </Col>

        {/* Payment Method Selection */}
        <Col xs={24} md={10}>
          <Card title="Chọn phương thức thanh toán">
            <Radio.Group
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
            >
              <Card
                style={{
                  cursor: 'pointer',
                  border: paymentMethod === 1 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  padding: '12px'
                }}
              >
                <Radio value={1}>
                  <CreditCardOutlined style={{ marginRight: '8px' }} />
                  <strong>VNPay</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
                    Thanh toán qua cổng VNPay (thẻ ngân hàng, ví điện tử, ...)
                  </div>
                </Radio>
              </Card>

              <Card
                style={{
                  cursor: 'pointer',
                  border: paymentMethod === 2 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  padding: '12px'
                }}
              >
                <Radio value={2}>
                  <QrcodeOutlined style={{ marginRight: '8px' }} />
                  <strong>QR Payment</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
                    Thanh toán qua mã QR (phương thức ảo/demo)
                  </div>
                </Radio>
              </Card>

              <Card
                style={{
                  cursor: 'pointer',
                  border: paymentMethod === 3 ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  padding: '12px'
                }}
              >
                <Radio value={3}>
                  <ShoppingCartOutlined style={{ marginRight: '8px' }} />
                  <strong>Thanh toán tại quầy</strong>
                  <div style={{ fontSize: '12px', color: '#666', marginLeft: '24px' }}>
                    Thanh toán khi nhận vé tại quầy (nhân viên xác nhận)
                  </div>
                </Radio>
              </Card>
            </Radio.Group>

            <Divider />

            <Button
              type="primary"
              block
              size="large"
              onClick={handlePlaceOrder}
              loading={loading}
              disabled={loading}
            >
              Đặt hàng ({bookingData.totalPrice.toLocaleString('vi-VN')}₫)
            </Button>

            <Button
              type="default"
              block
              style={{ marginTop: '8px' }}
              onClick={() => navigate(-1)}
              disabled={loading}
            >
              Hủy
            </Button>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default CheckoutPage;
