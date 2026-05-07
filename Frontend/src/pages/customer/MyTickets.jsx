import React, { useState, useEffect } from 'react';
import { Table, Tag, Empty, Spin, Button, Popconfirm, message, Space, Modal } from 'antd';
import { DeleteOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import DynamicTicketCard from '../../components/DynamicTicketCard';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const buildQrImageUrl = (ticket) => {
    const qrPayload = ticket?.qrCode || `TICKET-${ticket?.id || ''}`;
    return `https://api.qrserver.com/v1/create-qr-code/?size=320x320&data=${encodeURIComponent(qrPayload)}`;
  };

  const canUseTicket = (ticket) => Number(ticket?.status) === 1 || Number(ticket?.status) === 2;

  const handleViewQr = (ticket) => {
    setSelectedTicket(ticket);
    setQrModalOpen(true);
  };

  const handleDownloadQr = async (ticket) => {
    if (!canUseTicket(ticket)) {
      message.warning('Vé đang ở trạng thái chờ thanh toán, chưa thể tải QR.');
      return;
    }

    try {
      const qrUrl = buildQrImageUrl(ticket);
      const response = await fetch(qrUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `ticket-${ticket.id}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
      message.success('Đã tải mã QR về máy');
    } catch (error) {
      message.error('Không thể tải mã QR, vui lòng thử lại');
    }
  };

  // Fetch my tickets
  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/tickets/my-tickets');
      console.log("Raw API Response:", response); // In ra Console để Debug cấu trúc thật
      
      const resData = response.data || response;
      let ticketList = [];

      // Logic bóc tách dữ liệu an toàn, quét qua nhiều định dạng DTO khác nhau
      if (Array.isArray(resData)) {
        ticketList = resData;
      } else if (resData.data && Array.isArray(resData.data)) {
        ticketList = resData.data;
      } else if (resData.data && resData.data.tickets) {
        ticketList = resData.data.tickets;
      } else if (resData.tickets) {
        ticketList = resData.tickets;
      } else if (resData.items) {
        ticketList = resData.items;
      }

      console.log("Parsed Ticket List:", ticketList);
      setTickets(ticketList);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      message.error('Không thể tải danh sách vé');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets();
  }, []);

  // Xóa vé
  const handleCancelTicket = async (ticketId) => {
    try {
      await axiosClient.delete(`/tickets/${ticketId}`);
      message.success('Hủy vé thành công');
      fetchMyTickets();
    } catch (error) {
      console.error('Error cancelling ticket:', error);
      message.error(error.response?.data?.message || 'Không thể hủy vé');
    }
  };

  // Columns cho table
  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'eventName',
      key: 'eventName',
      render: (value) => value || 'N/A',
    },
    {
      title: 'Loại vé',
      dataIndex: 'ticketTypeName',
      key: 'ticketType',
      render: (value) => value || 'N/A',
    },
    {
      title: 'Mã bảo mật',
      dataIndex: 'qrCode', 
      key: 'qrCode',
      render: () => <Tag color="red">Đã mã hóa</Tag>,
    },
    {
      title: 'Trạng thái',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const statusMap = {
          0: { label: 'Pending', color: 'gold' },
          1: { label: 'Paid', color: 'green' },
          2: { label: 'CheckedIn', color: 'blue' },
          3: { label: 'Cancelled', color: 'red' },
        };
        const s = statusMap[status] || {
          label: record.statusName || 'Unknown',
          color: 'default',
        };
        return <Tag color={s.color}>{s.label}</Tag>;
      },
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date) => dayjs(date).format('DD/MM/YYYY HH:mm'),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="primary"
            icon={<EyeOutlined />}
            disabled={!canUseTicket(record)}
            onClick={() => handleViewQr(record)}
          >
            Mở Vé
          </Button>
          {record.status === 1 && (
            <Popconfirm
              title="Hủy vé?"
              onConfirm={() => handleCancelTicket(record.id)}
            >
              <Button type="link" danger icon={<DeleteOutlined />}>
                Hủy vé
              </Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: '24px' }}>🎫 Vé của tôi</h1>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px 0' }}>
          <Spin size="large" tip="Đang tải..." />
        </div>
      ) : tickets.length === 0 ? (
        <Empty description="Bạn chưa có vé nào" />
      ) : (
        <Table
          columns={columns}
          dataSource={tickets}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Tổng cộng ${total} vé` }}
        />
      )}

      <Modal
        title="Vé vào cổng điện tử"
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalOpen(false)}>
             Đóng
          </Button>
        ]}
        width={400}
      >
        {selectedTicket && (
          <DynamicTicketCard 
             ticketId={selectedTicket.id}
             secretKey={selectedTicket.qrCode} 
             eventName={selectedTicket.eventName}
             ticketTypeName={selectedTicket.ticketTypeName}
          />
        )}
      </Modal>
    </div>
  );
};

export default MyTickets;
