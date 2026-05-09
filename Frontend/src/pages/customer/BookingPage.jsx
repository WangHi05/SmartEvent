import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Card, Row, Col, Button, InputNumber, message, Spin, Empty, Tag } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import useAuthStore from '../../store/useAuthStore';
import { CustomerSectionTitle, formatCapacityLabel, formatCurrency, formatDateRange, getCapacityPercent, getEventStatusMeta } from '../../components/customer/CustomerPrimitives';

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

        // FIX LỖI: Clamp lại quantity đã chọn nếu số vé còn lại giảm (Lấy chính xác .quantity của Object)
        setQuantities((prev) => {
          const next = { ...prev };
          normalizedTickets.forEach((tt) => {
            if (next[tt.id] && next[tt.id].quantity > tt.remainingQuantity) {
              next[tt.id] = { ...next[tt.id], quantity: tt.remainingQuantity };
            }
          });
          return next;
        });
      } catch (error) {
        console.error('Error polling ticket types:', error);
      }
    };

    const fetchEventDetails = async () => {
      setLoading(true);
      try {
        const response = await axiosClient.get(`/events/${eventId}`);
        const eventData = response.data || response;
        setEvent(eventData);

        const ticketResponse = await axiosClient.get(`/events/${eventId}/ticket-types`);
        const ticketData = ticketResponse.data || ticketResponse;
        const tickets = ticketData?.data || ticketData?.items || ticketData || [];
        const normalizedTickets = Array.isArray(tickets) ? tickets : tickets.items || [];
        setTicketTypes(normalizedTickets);

        // Initialize quantities
        const initialSelections = {};
        normalizedTickets.forEach(tt => {
          initialSelections[tt.id] = {
            quantity: 0,
            memberCount: tt.minGroupSize || 2 
          };
        });
        setQuantities(initialSelections);

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
      const selection = quantities[ticketTypeId];
      
      if (ticketType && selection.quantity > 0) {
        if (ticketType.ticketMode === 1) {
          total += ticketType.price * selection.quantity;
        } else if (ticketType.ticketMode === 2) {
          if (ticketType.priceMode === 1) {
             total += ticketType.price * selection.quantity * selection.memberCount;
          } else {
             total += ticketType.price * selection.quantity;
          }
        }
      }
    });
    setTotalPrice(total);
  }, [quantities, ticketTypes]);

  // Handle quantity change
  const handleSelectionChange = (ticketTypeId, field, value) => {
    setQuantities(prev => ({
      ...prev,
      [ticketTypeId]: {
        ...prev[ticketTypeId],
        [field]: value || 0
      }
    }));
  };

  // Calculate total tickets selected
  const getTotalQuantity = () => {
    return Object.values(quantities).reduce((sum, item) => sum + (item?.quantity || 0), 0);
  };

  // Proceed to checkout
  const handleProceedToCheckout = () => {
    // FIX LỖI "KHÔNG BẤM ĐƯỢC": Chỉ kiểm tra thuộc tính .quantity thay vì so sánh cả Object
    const selectedTickets = Object.keys(quantities).filter(id => quantities[id]?.quantity > 0);
    
    if (selectedTickets.length === 0) {
      message.warning('Vui lòng chọn ít nhất 1 vé');
      return;
    }

    const bookingData = {
      eventId: event.id,
      eventName: event.name,
      totalPrice,
      selections: Object.keys(quantities)
        .filter(id => quantities[id].quantity > 0)
        .map(id => {
          const ticketType = ticketTypes.find(tt => tt.id === id);
          const selection = quantities[id];
          
          let subtotal = ticketType.price * selection.quantity;
          if (ticketType.ticketMode === 2 && ticketType.priceMode === 1) {
              subtotal = ticketType.price * selection.quantity * selection.memberCount;
          }
    
          return {
            ticketTypeId: id,
            ticketTypeName: ticketType?.name,
            price: ticketType?.price,
            quantity: selection.quantity,
            memberCount: ticketType.ticketMode === 2 ? selection.memberCount : 1, 
            subtotal: subtotal
          };
        })
    };

    navigate('/customer/checkout', { state: bookingData });
  };

  const statusMeta = getEventStatusMeta(event);
  const capacityPercent = getCapacityPercent(event);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spin size="large" tip="Đang tải..." />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
        <Empty description="Không tìm thấy sự kiện" />
        <Button type="primary" block onClick={() => navigate('/customer/events')} className="mt-4 !h-11 !rounded-2xl !border-orange-500 !bg-orange-500">
          Quay lại danh sách sự kiện
        </Button>
      </div>
    );
  }

  // FIX LỖI LINTING: Đã xóa các biến eventStatus và statusColor không được sử dụng
  const now = dayjs();
  const endTime = dayjs(event.endTime);
  const isFull = event.currentOccupancy >= event.maxCapacity;
  const isEnded = now.isAfter(endTime);

  return (
    <div className="space-y-8 py-2">
      <CustomerSectionTitle
        kicker="Booking flow"
        title="Đặt vé sự kiện"
        description="Lựa chọn vé cá nhân hoặc vé đoàn tùy theo nhu cầu tham dự."
        action={(
          <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/customer/events')}>
            Quay lại danh sách
          </Button>
        )}
      />

      <Row gutter={[24, 24]}>
        <Col xs={24} lg={14}>
          {/* FIX CẢNH BÁO: Đổi bodyStyle thành styles={{ body: ... }} */}
          <Card className="overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]" styles={{ body: { padding: 0 } }}>
            <div className="relative min-h-[280px] bg-slate-900" style={{ background: event.imageUrl ? `linear-gradient(180deg, rgba(15,23,42,0.08), rgba(15,23,42,0.82)), url(${event.imageUrl}) center/cover no-repeat` : 'linear-gradient(135deg, #111827 0%, #1f2937 50%, #f97316 100%)' }}>
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                <Tag color={statusMeta.color} className="!mb-3 !rounded-full !px-3 !py-1 !font-semibold">
                  {statusMeta.label}
                </Tag>
                <h3 className="text-3xl font-black leading-tight">{event.name}</h3>
                <p className="mt-2 max-w-2xl text-sm text-white/75">{event.description}</p>
              </div>
            </div>

            <div className="space-y-5 p-6">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Thời gian</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatDateRange(event.startTime, event.endTime)}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Địa điểm</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{event.location}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Giá từ</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{formatCurrency(event.basePrice)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="mb-3 flex items-center justify-between text-sm text-slate-600">
                  <span className="inline-flex items-center gap-2"><TeamOutlined /> Sức chứa</span>
                  <span>{formatCapacityLabel(event)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-orange-500 to-emerald-500" style={{ width: `${capacityPercent}%` }} />
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><CalendarOutlined /> Thời gian diễn ra</div>
                  <p className="mt-2 text-sm text-slate-600">{dayjs(event.startTime).format('DD/MM/YYYY HH:mm')} - {dayjs(event.endTime).format('DD/MM/YYYY HH:mm')}</p>
                </div>
                <div className="rounded-2xl bg-slate-50 p-4">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-900"><EnvironmentOutlined /> Mô tả</div>
                  <p className="mt-2 line-clamp-3 text-sm text-slate-600">{event.description}</p>
                </div>
              </div>
            </div>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          {/* FIX CẢNH BÁO: Đổi bodyStyle thành styles={{ body: ... }} */}
          <Card className="sticky top-28 overflow-hidden !rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]" styles={{ body: { padding: 24 } }}>
            <CustomerSectionTitle
              kicker="Tickets"
              title="Chọn loại vé"
              description="Vui lòng kiểm tra kỹ số lượng và số thành viên đoàn."
            />

            <div className="mt-6 space-y-4">
              {ticketTypes.length === 0 ? (
                <Empty description="Không có loại vé nào" />
              ) : (
                ticketTypes.map((ticketType) => (
                  <div key={ticketType.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 transition hover:border-orange-300 hover:bg-white">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-slate-950">{ticketType.name}</p>
                        <p className="text-xs text-slate-500">Còn {ticketType.remainingQuantity} vé</p>
                      </div>
                      <div className="text-right text-sm font-black text-orange-600">{formatCurrency(ticketType.price)}</div>
                    </div>

                    <div className="flex flex-col items-end gap-2">
                      {ticketType.ticketMode === 2 && (
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-slate-500">Số người/đoàn:</span>
                          <InputNumber
                            min={ticketType.minGroupSize || 2}
                            max={ticketType.maxGroupSize || 15}
                            value={quantities[ticketType.id]?.memberCount || 2}
                            onChange={(value) => handleSelectionChange(ticketType.id, 'memberCount', value)}
                            disabled={isEnded || isFull || ticketType.remainingQuantity === 0}
                            size="small"
                          />
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500">Số lượng mua:</span>
                        <InputNumber
                          min={0}
                          max={ticketType.remainingQuantity}
                          value={quantities[ticketType.id]?.quantity || 0}
                          onChange={(value) => handleSelectionChange(ticketType.id, 'quantity', value)}
                          disabled={isEnded || isFull || ticketType.remainingQuantity === 0}
                        />
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-6 space-y-3 rounded-3xl bg-slate-950 p-5 text-white">
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Tổng số vé</span>
                <strong className="text-white">{getTotalQuantity()}</strong>
              </div>
              <div className="flex items-center justify-between text-sm text-white/70">
                <span>Tổng tiền</span>
                <strong className="text-2xl font-black text-white">{formatCurrency(totalPrice)}</strong>
              </div>

              <Button
                type="primary"
                block
                size="large"
                onClick={handleProceedToCheckout}
                disabled={isEnded || isFull || getTotalQuantity() === 0}
                className="!h-12 !rounded-2xl !border-orange-500 !bg-orange-500 !font-semibold"
              >
                Tiếp tục đến thanh toán
              </Button>

              {isEnded && <div className="rounded-2xl bg-white/10 p-3 text-sm text-red-300">Sự kiện đã kết thúc</div>}
              {isFull && !isEnded && <div className="rounded-2xl bg-white/10 p-3 text-sm text-red-300">Sự kiện đã hết chỗ</div>}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default BookingPage;