import React, { useState, useEffect } from 'react';
import { Tabs, Modal, message, Space, Button, Card, Row, Col, Tag } from 'antd';
import { Settings } from 'lucide-react';
import apiClient from '../../../services/apiClient';
import TicketTypesAdmin from '../../../pages/TicketTypesAdminV2';

export function TicketList() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedEventForTicketTypes, setSelectedEventForTicketTypes] = useState(null);
  const [ticketTypesVisible, setTicketTypesVisible] = useState(false);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get('/api/events');
      setEvents(response.data.items || []);
    } catch (err) {
      message.error('Lỗi tải danh sách sự kiện');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenTicketTypes = (event) => {
    setSelectedEventForTicketTypes(event);
    setTicketTypesVisible(true);
  };

  // Phân chia sự kiện thành 2 nhóm: ShortDay (1) và MultiDay (2)
  const shortDayEvents = events.filter(e => e.eventMode === 1);
  const multiDayEvents = events.filter(e => e.eventMode === 2);

  const EventCard = ({ event }) => (
    <Card
      title={event.name}
      extra={
        <Button
          type="primary"
          size="small"
          onClick={() => handleOpenTicketTypes(event)}
          icon={<Settings size={14} />}
        >
          Quản lý Loại Vé
        </Button>
      }
      className="mb-4"
      style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}
    >
      <div className="space-y-2 text-sm">
        <p><strong>Địa điểm:</strong> {event.location}</p>
        <p><strong>Ngày bắt đầu:</strong> {event.startTime ? new Date(event.startTime).toLocaleString('vi-VN') : 'N/A'}</p>
        <p><strong>Ngày kết thúc:</strong> {event.endTime ? new Date(event.endTime).toLocaleString('vi-VN') : 'N/A'}</p>
        {event.eventMode === 2 && (
          <p><strong>Kéo dài:</strong> <Tag color="blue">{event.eventDurationDays} ngày</Tag></p>
        )}
        <p><strong>Sức chứa:</strong> {event.currentOccupancy} / {event.maxCapacity} {event.isFull && <Tag color="red">Hết chỗ</Tag>}</p>
      </div>
    </Card>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vé & Soát vé</h2>
        <p className="text-sm text-gray-500 mt-1">Quản lý loại vé và thông tin vé của các sự kiện</p>
      </div>

      {events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Settings size={48} className="mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600">Không có sự kiện nào</h3>
          <p className="text-sm">Vui lòng tạo sự kiện trước.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* SỰ KIỆN NGẮN NGÀY */}
          {shortDayEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-blue-500">
                📅 Sự Kiện Ngắn Ngày (1 Ngày)
              </h3>
              <Row gutter={[16, 16]}>
                {shortDayEvents.map(event => (
                  <Col xs={24} sm={24} md={12} lg={8} key={event.id}>
                    <EventCard event={event} />
                  </Col>
                ))}
              </Row>
            </div>
          )}

          {/* SỰ KIỆN DÀI NGÀY */}
          {multiDayEvents.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-gray-900 mb-4 pb-2 border-b-2 border-green-500">
                📆 Sự Kiện Dài Ngày (Nhiều Ngày)
              </h3>
              <Row gutter={[16, 16]}>
                {multiDayEvents.map(event => (
                  <Col xs={24} sm={24} md={12} lg={8} key={event.id}>
                    <EventCard event={event} />
                  </Col>
                ))}
              </Row>
            </div>
          )}
        </div>
      )}

      <Modal
        title={`Quản lý Loại Vé - ${selectedEventForTicketTypes?.name}`}
        open={ticketTypesVisible}
        onCancel={() => setTicketTypesVisible(false)}
        width={1000}
        footer={null}
      >
        {selectedEventForTicketTypes && (
          <TicketTypesAdmin eventId={selectedEventForTicketTypes.id} />
        )}
      </Modal>
    </div>
  );
}

export default TicketList;
