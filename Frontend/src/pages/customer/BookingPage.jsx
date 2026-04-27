import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Button, InputNumber, message, Spin, Empty, Tag } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import useAuthStore from '../../store/useAuthStore';

const BookingPage = () => {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const user = useAuthStore((state) => state.user);
  const [event, setEvent] = useState(null);
  const [ticketTypes, setTicketTypes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState({});
  const [totalPrice, setTotalPrice] = useState(0);

  // Fetch event details
  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }

    let pollingTimer;

    const fetchTicketTypes = async () => {
      try {
        const ticketResponse = await axiosClient.get(`/events/${eventId}/ticket-types`);
        const ticketData = ticketResponse.data || ticketResponse;
        const tickets = ticketData?.data || ticketData?.items || ticketData || [];
        const normalizedTickets = Array.isArray(tickets) ? tickets : tickets.items || [];
        setTicketTypes(normalizedTickets);

        // Clamp lại quantity đã chọn nếu số vé còn lại giảm
        setQuantities((prev) => {
          const next = { ...prev };
          normalizedTickets.forEach((tt) => {
            const current = next[tt.id] || 0;
            if (current > tt.remainingQuantity) {
              next[tt.id] = tt.remainingQuantity;
            }
          });
          return next;
        });
      } catch (error) {
        // Polling lỗi tạm thời thì chỉ log để không spam UI.
        console.error('Error polling ticket types:', error);
      }
    };

    const fetchEventDetails = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(`/events/${eventId}`);
        const eventData = response.data || response;
        setEvent(eventData);

        // Fetch ticket types for this event
        const ticketResponse = await axiosClient.get(`/events/${eventId}/ticket-types`);
        const ticketData = ticketResponse.data || ticketResponse;
        const tickets = ticketData?.data || ticketData?.items || ticketData || [];
        const normalizedTickets = Array.isArray(tickets) ? tickets : tickets.items || [];
        setTicketTypes(normalizedTickets);

        // Initialize quantities
        const initialQuantities = {};
        normalizedTickets.forEach(tt => {
          initialQuantities[tt.id] = 0;
        });
        setQuantities(initialQuantities);

        // Gần realtime: tự động đồng bộ lại số vé mỗi 10 giây.
        pollingTimer = setInterval(fetchTicketTypes, 10000);
      } catch (error) {
        console.error('Error fetching event details:', error);
        message.error('Không thể tải thông tin sự kiện');
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchEventDetails();
    }

    return () => {
      if (pollingTimer) {
        clearInterval(pollingTimer);
      }
    };
  }, [eventId, user, navigate, location.pathname]);

  // Calculate total price whenever quantities change
  useEffect(() => {
    let total = 0;
    Object.keys(quantities).forEach(ticketTypeId => {
      const ticketType = ticketTypes.find(tt => tt.id === ticketTypeId);
      if (ticketType) {
        total += ticketType.price * quantities[ticketTypeId];
      }
    });
    setTotalPrice(total);
  }, [quantities, ticketTypes]);

  // Handle quantity change
  const handleQuantityChange = (ticketTypeId, value) => {
    setQuantities(prev => ({
      ...prev,
      [ticketTypeId]: value || 0
    }));
  };

  // Calculate total tickets selected
  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, q) => sum + q, 0);
  };

  // Proceed to checkout
  const handleProceedToCheckout = () => {
    const selectedTickets = Object.keys(quantities).filter(id => quantities[id] > 0);
    if (selectedTickets.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 vé');
      return;
    }

    // Pass booking data via navigation state
    const bookingData = {
      eventId: event.id,
      eventName: event.name,
      totalPrice,
      selections: Object.keys(quantities)
        .filter(id => quantities[id] > 0)
        .map(id => {
          const ticketType = ticketTypes.find(tt => tt.id === id);
          return {
            ticketTypeId: id,
            ticketTypeName: ticketType?.name,
            price: ticketType?.price,
            quantity: quantities[id],
            subtotal: ticketType?.price * quantities[id]
          };
        })
    };

    navigate('/customer/checkout', { state: bookingData });
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div style={{ padding: '50px 20px' }}>
        <Empty description="Không tìm thấy sự kiện" />
        <Button type="primary" block onClick={() => navigate('/customer/events')}>
          Quay lại danh sách sự kiện
        </Button>
      </div>
    );
  }

  // Event status determination
  const now = dayjs();
  const startTime = dayjs(event.startTime);
  const endTime = dayjs(event.endTime);
  let eventStatus = 'Sắp diễn ra';
  let statusColor = 'gold';

  if (now.isBefore(startTime)) {
    eventStatus = 'Sắp diễn ra';
    statusColor = 'gold';
  } else if (now.isAfter(startTime) && now.isBefore(endTime)) {
    eventStatus = 'Đang diễn ra';
    statusColor = 'green';
  } else {
    eventStatus = 'Đã kết thúc';
    statusColor = 'red';
  }

  const isFull = event.currentOccupancy >= event.maxCapacity;
  const isEnded = now.isAfter(endTime);

  return (
    <div style={{ padding: '24px 0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Button 
          type="text" 
          icon={<ArrowLeftOutlined />} 
          onClick={() => navigate('/customer/events')}
        >
          Quay lại
        </Button>
        <h2 style={{ margin: 0 }}>Đặt vé sự kiện</h2>
      </div>

      <Row gutter={[24, 24]}>
        {/* Event Details */}
        <Col xs={24} md={14}>
          <Card>
            <div
              style={{
                height: '220px',
                borderRadius: '12px',
                marginBottom: '16px',
                background: event.imageUrl
                  ? `url(${event.imageUrl}) center/cover no-repeat`
                  : 'linear-gradient(120deg, #f97316, #ef4444)',
                display: 'flex',
                alignItems: 'end',
                padding: '16px',
                color: '#fff',
                fontWeight: 'bold',
              }}
            >
              {event.name}
            </div>
            <h3>{event.name}</h3>
            <div style={{ marginBottom: '16px' }}>
              <Tag color={statusColor}>{eventStatus}</Tag>
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>Ngày diễn ra:</strong>
              <br />
              {dayjs(event.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(event.endTime).format('DD/MM/YYYY HH:mm')}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>Địa điểm:</strong>
              <br />
              {event.location}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>Mô tả:</strong>
              <br />
              {event.description}
            </div>

            <div style={{ marginBottom: '12px' }}>
              <strong>Sức chứa:</strong>
              <br />
              {event.currentOccupancy} / {event.maxCapacity} người
              <div
                style={{
                  width: '100%',
                  height: '8px',
                  backgroundColor: '#f0f0f0',
                  borderRadius: '4px',
                  marginTop: '8px',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    height: '100%',
                    backgroundColor: isFull ? '#ff4d4f' : '#52c41a',
                    width: `${(event.currentOccupancy / event.maxCapacity) * 100}%`
                  }}
                />
              </div>
            </div>
          </Card>
        </Col>

        {/* Ticket Selection */}
        <Col xs={24} md={10}>
          <Card>
            <h3>Chọn loại vé</h3>

            {ticketTypes.length === 0 ? (
              <Empty description="Không có loại vé nào" />
            ) : (
              <>
                {ticketTypes.map(ticketType => (
                  <div
                    key={ticketType.id}
                    style={{
                      padding: '12px',
                      marginBottom: '12px',
                      border: '1px solid #d9d9d9',
                      borderRadius: '4px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div>
                        <strong>{ticketType.name}</strong>
                        <div style={{ fontSize: '12px', color: '#666' }}>
                          Còn: {ticketType.remainingQuantity} vé
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#1890ff' }}>
                          {ticketType.price?.toLocaleString('vi-VN')}₫
                        </div>
                      </div>
                    </div>

                    <InputNumber
                      min={0}
                      max={ticketType.remainingQuantity}
                      value={quantities[ticketType.id] || 0}
                      onChange={(value) => handleQuantityChange(ticketType.id, value)}
                      style={{ width: '100%' }}
                      placeholder="Số lượng"
                      disabled={isEnded || isFull || ticketType.remainingQuantity === 0}
                    />
                  </div>
                ))}
              </>
            )}

            {/* Summary */}
            <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid #d9d9d9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span>Tổng số vé:</span>
                <strong>{getTotalQuantity()}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                <span>Tổng tiền:</span>
                <strong style={{ fontSize: '18px', color: '#1890ff' }}>
                  {totalPrice.toLocaleString('vi-VN')}₫
                </strong>
              </div>

              <Button
                type="primary"
                block
                size="large"
                onClick={handleProceedToCheckout}
                disabled={isEnded || isFull || getTotalQuantity() === 0}
              >
                Tiếp tục đến thanh toán
              </Button>

              {isEnded && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff2f0', borderRadius: '4px', fontSize: '12px', color: '#ff4d4f' }}>
                  Sự kiện đã kết thúc
                </div>
              )}

              {isFull && !isEnded && (
                <div style={{ marginTop: '12px', padding: '8px', backgroundColor: '#fff2f0', borderRadius: '4px', fontSize: '12px', color: '#ff4d4f' }}>
                  Sự kiện đã hết chỗ
                </div>
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BookingPage;
