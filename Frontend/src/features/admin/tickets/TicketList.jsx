import React, { useState, useEffect } from 'react';
import { Modal, message, Button, Card, Row, Col, Tag } from 'antd';
import { Settings } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';
import TicketTypesAdmin from '../../../pages/TicketTypesAdminV2';
import dayjs from 'dayjs';
import { formatVietnamDateTime } from '../../../utils/vietnamTime';

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
      // SỬA BẪY 1: Gọi API search (cho đồng bộ với EventList) và lấy data an toàn
      const response = await axiosClient.get('/events/search', {
        params: { pageNumber: 1, pageSize: 100 } // Lấy tạm 100 sự kiện
      });
      const data = response.data || response;
      setEvents(data.items || []);
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

  // SỬA BẪY 2: Tự tính toán sự kiện ngắn ngày hay dài ngày dựa vào StartTime và EndTime
  const shortDayEvents = [];
  const multiDayEvents = [];

  events.forEach(event => {
    const start = dayjs(event.startTime);
    const end = dayjs(event.endTime);
    
    // Nếu ngày bắt đầu và ngày kết thúc giống nhau -> Ngắn ngày
    if (start.format('YYYY-MM-DD') === end.format('YYYY-MM-DD')) {
      shortDayEvents.push(event);
    } else {
      // Dài ngày: Tính số ngày diễn ra (Làm tròn lên)
      event.eventDurationDays = Math.ceil(end.diff(start, 'hour') / 24);
      multiDayEvents.push(event);
    }
  });

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
        <p><strong>Ngày bắt đầu:</strong> {event.startTime ? formatVietnamDateTime(event.startTime) : 'N/A'}</p>
        <p><strong>Ngày kết thúc:</strong> {event.endTime ? formatVietnamDateTime(event.endTime) : 'N/A'}</p>
        
        {/* Chỉ hiển thị tem số ngày cho sự kiện Dài ngày */}
        {event.eventDurationDays && (
          <p><strong>Kéo dài:</strong> <Tag color="blue">{event.eventDurationDays} ngày</Tag></p>
        )}
        
        <p>
            <strong>Sức chứa:</strong> {event.currentOccupancy} / {event.maxCapacity} 
            {event.isFull && <Tag color="red" style={{marginLeft: '8px'}}>Hết chỗ</Tag>}
        </p>
      </div>
    </Card>
  );

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Vé & Soát vé</h2>
        <p className="text-sm text-gray-500 mt-1">Quản lý loại vé và thông tin vé của các sự kiện</p>
      </div>

      {loading ? (
          <div className="text-center py-10">Đang tải dữ liệu...</div>
      ) : events.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-96 text-gray-400 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <Settings size={48} className="mb-4 text-gray-300" />
          <h3 className="text-lg font-medium text-gray-600">Không có sự kiện nào</h3>
          <p className="text-sm">Vui lòng tạo sự kiện ở menu Quản lý Sự kiện trước.</p>
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
        destroyOnHidden={true} // Tránh lỗi dữ liệu cũ khi mở Modal mới
      >
        {selectedEventForTicketTypes && (
          <TicketTypesAdmin eventId={selectedEventForTicketTypes.id} />
        )}
      </Modal>
    </div>
  );
}

export default TicketList;