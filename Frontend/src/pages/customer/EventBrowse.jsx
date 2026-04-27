import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Tag, Button, Input, Select, Empty, Spin, message } from 'antd';
import { SearchOutlined, CalendarOutlined, EnvironmentOutlined, TeamOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import { useNavigate } from 'react-router-dom';

const EventBrowse = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const navigate = useNavigate();

  // Fetch events
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/events/search', {
        params: {
          pageNumber: 1,
          pageSize: 12,
          keyword: searchText,
        },
      });

      const data = response.data || response;
      setEvents(data.items || []);
    } catch (error) {
      console.error('Error fetching events:', error);
      message.error('Không thể tải danh sách sự kiện');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchEvents();
    }, 500);

    return () => clearTimeout(timer);
  }, [searchText]);

  // Lọc sự kiện theo trạng thái
  const getEventStatus = (startTime, endTime) => {
    const now = new Date();
    const start = new Date(startTime);
    const end = new Date(endTime);

    if (now < start) return { label: 'Sắp diễn ra', color: 'blue' };
    if (now >= start && now <= end) return { label: 'Đang diễn ra', color: 'green' };
    return { label: 'Đã kết thúc', color: 'gray' };
  };

  const filterEvents = events.filter((event) => {
    if (filterStatus === 'all') return true;
    const status = getEventStatus(event.startTime, event.endTime);
    return status.label === filterStatus;
  });

  return (
    <div>
      <div
        style={{
          marginBottom: '24px',
          borderRadius: '16px',
          padding: '24px',
          background: 'linear-gradient(130deg, #fff7ed 0%, #ffedd5 45%, #ffffff 100%)',
          border: '1px solid #fed7aa'
        }}
      >
        <h1 style={{ marginBottom: '8px', fontWeight: 900 }}>🎫 Khám phá sự kiện</h1>
        <p style={{ margin: 0, color: '#64748b' }}>
          Chọn sự kiện yêu thích, xem sức chứa realtime và đặt vé ngay trong vài phút.
        </p>
      </div>

      {/* Search & Filter */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={16}>
          <Input
            placeholder="Tìm kiếm sự kiện..."
            prefix={<SearchOutlined />}
            size="large"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Col>
        <Col xs={24} sm={8}>
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            size="large"
            style={{ width: '100%' }}
            options={[
              { label: 'Tất cả', value: 'all' },
              { label: 'Sắp diễn ra', value: 'Sắp diễn ra' },
              { label: 'Đang diễn ra', value: 'Đang diễn ra' },
              { label: 'Đã kết thúc', value: 'Đã kết thúc' },
            ]}
          />
        </Col>
      </Row>

      {/* Events Grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" tip="Đang tải..." />
        </div>
      ) : filterEvents.length === 0 ? (
        <Empty description="Không tìm thấy sự kiện nào" />
      ) : (
        <Row gutter={[16, 16]}>
          {filterEvents.map((event) => {
            const status = getEventStatus(event.startTime, event.endTime);
            const isFull = event.currentOccupancy >= event.maxCapacity;

            return (
              <Col key={event.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  hoverable
                  style={{ height: '100%', borderRadius: '8px', overflow: 'hidden' }}
                  cover={
                    <div
                      style={{
                        height: '200px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: '48px',
                      }}
                    >
                      🎫
                    </div>
                  }
                >
                  {/* Status tag */}
                  <Tag color={status.color} style={{ marginBottom: '8px' }}>
                    {status.label}
                  </Tag>

                  {/* Event name */}
                  <h3 style={{ margin: '8px 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {event.name}
                  </h3>

                  {/* Event info */}
                  <div style={{ color: '#666', fontSize: '12px', marginBottom: '8px' }}>
                    <div style={{ marginBottom: '4px' }}>
                      <CalendarOutlined /> {dayjs(event.startTime).format('DD/MM/YYYY HH:mm')}
                    </div>
                    <div style={{ marginBottom: '4px' }}>
                      <EnvironmentOutlined /> {event.location}
                    </div>
                    <div>
                      <TeamOutlined /> {event.currentOccupancy} / {event.maxCapacity} người
                    </div>
                  </div>

                  {/* Capacity bar */}
                  <div style={{ marginBottom: '12px' }}>
                    <div
                      style={{
                        height: '4px',
                        background: '#e8e8e8',
                        borderRadius: '2px',
                        overflow: 'hidden',
                      }}
                    >
                      <div
                        style={{
                          height: '100%',
                          background: isFull ? '#ff4d4f' : '#52c41a',
                          width: `${(event.currentOccupancy / event.maxCapacity) * 100}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Action button */}
                  <Button
                    type="primary"
                    block
                    onClick={() => navigate(`/tickets/booking/${event.id}`)}
                    disabled={isFull || status.label === 'Đã kết thúc'}
                  >
                    {isFull ? 'Hết chỗ' : 'Đặt vé'}
                  </Button>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </div>
  );
};

export default EventBrowse;
