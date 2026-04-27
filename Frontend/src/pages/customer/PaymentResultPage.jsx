import React, { useEffect, useMemo } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Card, Row, Col, Button, Result, Divider, Space, Alert, Modal } from 'antd';
import { ClockCircleOutlined, QrcodeOutlined } from '@ant-design/icons';

const PaymentResultPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const safeParse = (value) => {
    try {
      return JSON.parse(value || 'null');
    } catch {
      return null;
    }
  };

  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const queryPaymentMethod = Number(searchParams.get('paymentMethod') || 0);
  const queryStatus = (searchParams.get('status') || '').toLowerCase();
  const queryOrderId = searchParams.get('orderId') || '';
  const queryTotalPriceRaw = Number(searchParams.get('totalPrice') || 0);
  const queryTotalPrice = queryTotalPriceRaw > 0 ? Math.floor(queryTotalPriceRaw / 100) : 0;

  const paymentData = useMemo(() => {
    const stateData = location.state;
    const sessionData = safeParse(sessionStorage.getItem('lastPaymentContext'));

    if (stateData) {
      return stateData;
    }

    if (queryPaymentMethod > 0) {
      return {
        orderId: queryOrderId || sessionData?.orderId,
        totalPrice: queryTotalPrice || sessionData?.totalPrice || 0,
        paymentMethod: queryPaymentMethod,
        status: queryStatus || sessionData?.status || 'pending',
      };
    }

    return sessionData;
  }, [location.state, queryOrderId, queryPaymentMethod, queryStatus, queryTotalPrice]);

  const paymentMethod = Number(paymentData?.paymentMethod || 0);
  const totalPrice = Number(paymentData?.totalPrice || 0);

  useEffect(() => {
    if (location.state) {
      sessionStorage.setItem('lastPaymentContext', JSON.stringify(location.state));
    }

    if (queryPaymentMethod === 1 && queryStatus === 'success') {
      Modal.success({
        title: 'Thanh toán VNPay thành công',
        content: 'Hệ thống đã xác nhận giao dịch từ VNPay.',
        okText: 'Xem vé của tôi',
        onOk: () => navigate('/customer/my-tickets', { replace: true }),
      });
    }
  }, [location.state, navigate, queryPaymentMethod, queryStatus]);

  if (!paymentData) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status="error"
          title="Lỗi"
          subTitle="Không tìm thấy thông tin đơn hàng"
          extra={
            <Button type="primary" onClick={() => navigate('/customer/events')}>
              Quay lại danh sách sự kiện
            </Button>
          }
        />
      </div>
    );
  }

  // For VNPAY, show payment pending info
  if (paymentMethod === 1) {
    if (queryStatus === 'success') {
      return (
        <div style={{ padding: '24px 0' }}>
          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} md={16}>
              <Card>
                <Result
                  status="success"
                  title="Thanh toán VNPay thành công"
                  subTitle={`Mã đơn hàng: ${paymentData.orderId || 'N/A'}`}
                  extra={
                    <Space>
                      <Button type="primary" onClick={() => navigate('/customer/my-tickets')}>
                        Xem vé của tôi
                      </Button>
                      <Button onClick={() => navigate('/customer/my-orders')}>
                        Xem lịch sử đặt vé
                      </Button>
                    </Space>
                  }
                />
              </Card>
            </Col>
          </Row>
        </div>
      );
    }

    if (queryStatus === 'failed') {
      return (
        <div style={{ padding: '24px 0' }}>
          <Row gutter={[24, 24]} justify="center">
            <Col xs={24} md={16}>
              <Card>
                <Result
                  status="error"
                  title="Thanh toán VNPay thất bại"
                  subTitle={`Mã đơn hàng: ${paymentData.orderId || 'N/A'}. Vui lòng thử lại.`}
                  extra={
                    <Space>
                      <Button type="primary" onClick={() => navigate('/customer/my-orders')}>
                        Đi đến lịch sử đặt vé
                      </Button>
                      <Button onClick={() => navigate('/customer/events')}>
                        Quay lại sự kiện
                      </Button>
                    </Space>
                  }
                />
              </Card>
            </Col>
          </Row>
        </div>
      );
    }

    return (
      <div style={{ padding: '24px 0' }}>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} md={16}>
            <Card>
              <Result
                status="processing"
                title="Đang xử lý thanh toán"
                subTitle="Vui lòng hoàn thành thanh toán trên cổng VNPay"
                extra={
                  <Space>
                    <Button type="primary" href="https://sandbox.vnpayment.vn" target="_blank">
                      Đi đến VNPay
                    </Button>
                    <Button onClick={() => navigate('/customer/events')}>
                      Quay lại
                    </Button>
                  </Space>
                }
              />

              <Divider />

              <div style={{ padding: '20px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
                <h4>Thông tin đơn hàng</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Mã đơn hàng:</div>
                    <div style={{ fontWeight: 'bold' }}>{paymentData.orderId}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Tổng tiền:</div>
                    <div style={{ fontWeight: 'bold' }}>
                      {totalPrice.toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Phương thức:</div>
                    <div style={{ fontWeight: 'bold' }}>VNPay</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Trạng thái:</div>
                    <div style={{ fontWeight: 'bold', color: '#faad14' }}>Chờ thanh toán</div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // For QR Payment
  if (paymentMethod === 2) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} md={16}>
            <Card title="Thanh toán bằng QR Code">
              <Alert
                message="Thanh toán QR đang chờ hệ thống xác nhận"
                description="Khách hàng không thể tự xác nhận thanh toán. Vui lòng chờ hệ thống hoặc nhân viên cập nhật trạng thái." 
                type="info"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <div style={{ padding: '24px', textAlign: 'center', backgroundColor: '#fafafa', borderRadius: '8px', marginBottom: '24px' }}>
                <QrcodeOutlined style={{ fontSize: '64px', color: '#1890ff', marginBottom: '16px' }} />
                <div style={{ fontSize: '14px', color: '#666' }}>Đang chờ xác nhận thanh toán QR</div>
              </div>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/customer/my-orders')}>Xem lịch sử đặt vé</Button>
                <Button onClick={() => navigate('/customer/events')}>Quay lại sự kiện</Button>
              </Space>

              <Divider />

              <div style={{ padding: '20px', backgroundColor: '#f0f5ff', borderRadius: '4px' }}>
                <h4>Thông tin đơn hàng</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Mã đơn hàng:</div>
                    <div style={{ fontWeight: 'bold' }}>{paymentData.orderId}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Tổng tiền:</div>
                    <div style={{ fontWeight: 'bold' }}>
                      {totalPrice.toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  // For Counter Payment
  if (paymentMethod === 3) {
    return (
      <div style={{ padding: '24px 0' }}>
        <Row gutter={[24, 24]} justify="center">
          <Col xs={24} md={16}>
            <Card title="Thanh toán tại quầy">
              <Alert
                message="Thanh toán tại quầy"
                description="Vui lòng đến quầy và thực hiện thanh toán. Nhân viên sẽ xác nhận và cung cấp vé cho bạn."
                type="warning"
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <div style={{ padding: '24px', backgroundColor: '#fafafa', borderRadius: '8px', marginBottom: '24px', textAlign: 'center' }}>
                <ClockCircleOutlined style={{ fontSize: '64px', color: '#faad14', marginBottom: '16px' }} />
                <div style={{ fontSize: '14px', color: '#666' }}>Chờ nhân viên xác nhận</div>
              </div>

              <div style={{ padding: '20px', backgroundColor: '#f0f5ff', borderRadius: '4px', marginBottom: '24px' }}>
                <h4>Thông tin đơn hàng</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Mã đơn hàng:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>{paymentData.orderId}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '12px', color: '#666' }}>Tổng tiền:</div>
                    <div style={{ fontWeight: 'bold', fontSize: '16px' }}>
                      {totalPrice.toLocaleString('vi-VN')}₫
                    </div>
                  </div>
                </div>
              </div>

              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button onClick={() => navigate('/customer/my-orders')}>Xem lịch sử đặt vé</Button>
                <Button onClick={() => navigate('/customer/events')}>Quay lại sự kiện</Button>
              </Space>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      <Result
        status="warning"
        title="Không nhận diện được phương thức thanh toán"
        subTitle="Vui lòng quay lại lịch sử đơn hàng để kiểm tra trạng thái thanh toán."
        extra={
          <Space>
            <Button type="primary" onClick={() => navigate('/customer/my-orders')}>
              Đi đến lịch sử đặt vé
            </Button>
            <Button onClick={() => navigate('/customer/events')}>Quay lại sự kiện</Button>
          </Space>
        }
      />
    </div>
  );
};

export default PaymentResultPage;
