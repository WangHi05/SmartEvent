import React, { useMemo, useState, useEffect } from 'react';
import { Table, Tag, Empty, Spin, Button, Popconfirm, message, Space, Modal } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, QrcodeOutlined, WalletOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import { CustomerMetricCard, CustomerSectionTitle, formatCurrency } from '../../components/customer/CustomerPrimitives';

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
      const data = response?.data || response;
      const ticketsList = Array.isArray(data)
        ? data
        : data?.Tickets || data?.tickets || data?.Items || data?.items || [];

      setTickets(ticketsList);
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

  const stats = useMemo(() => {
    const usable = tickets.filter((ticket) => canUseTicket(ticket)).length;
    const checkedIn = tickets.filter((ticket) => Number(ticket?.status) === 2).length;
    return [
      { label: 'Tổng vé', value: tickets.length.toLocaleString('vi-VN'), hint: 'Vé đồng bộ từ API', icon: QrcodeOutlined, accent: 'from-orange-500 to-amber-500' },
      { label: 'Có thể dùng', value: usable.toLocaleString('vi-VN'), hint: 'Paid / Checked-in', icon: WalletOutlined, accent: 'from-emerald-500 to-teal-500' },
      { label: 'Đã check-in', value: checkedIn.toLocaleString('vi-VN'), hint: 'Trạng thái đã vào cổng', icon: CheckCircleOutlined, accent: 'from-slate-800 to-slate-600' },
    ];
  }, [tickets]);

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
      title: 'QR Code',
      dataIndex: 'qrCode',
      key: 'qrCode',
      render: (text) => text ? `${text.substring(0, 10)}...` : 'N/A',
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
            type="link"
            icon={<EyeOutlined />}
            disabled={!canUseTicket(record)}
            onClick={() => handleViewQr(record)}
          >
            Xem QR
          </Button>
          <Button 
            type="link" 
            icon={<DownloadOutlined />}
            disabled={!canUseTicket(record)}
            onClick={() => handleDownloadQr(record)}
          >
            Tải vé
          </Button>
          {record.status === 1 && (
            <Popconfirm
              title="Hủy vé?"
              description="Bạn có chắc chắn muốn hủy vé này không?"
              onConfirm={() => handleCancelTicket(record.id)}
              okText="Hủy"
              cancelText="Không"
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
    <div className="space-y-8">
      <CustomerSectionTitle
        kicker="My tickets"
        title="Vé của tôi"
        description="Danh sách vé được trình bày lại theo phong cách premium nhưng logic tải dữ liệu, hủy vé và tải QR vẫn giữ nguyên."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <CustomerMetricCard key={item.label} {...item} />
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white">
          <Spin size="large" tip="Đang tải..." />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <Empty description="Bạn chưa có vé nào" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <Table
            columns={columns}
            dataSource={tickets}
            rowKey="id"
            loading={loading}
            pagination={{ pageSize: 10, showTotal: (total) => `Tổng cộng ${total} vé` }}
            scroll={{ x: true }}
          />
        </div>
      )}

      <Modal
        title={`Mã QR vé ${selectedTicket ? `#${selectedTicket.id?.slice(0, 8)}` : ''}`}
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setQrModalOpen(false)}>
            Đóng
          </Button>,
          <Button
            key="download"
            type="primary"
            onClick={() => selectedTicket && handleDownloadQr(selectedTicket)}
          >
            Tải QR
          </Button>,
        ]}
      >
        {selectedTicket && (
          <div className="text-center">
            <img
              src={buildQrImageUrl(selectedTicket)}
              alt="QR Ticket"
              className="mx-auto mb-3 block h-60 w-60 rounded-3xl border border-slate-200 bg-white p-3 shadow-sm"
            />
            <div className="space-y-2 text-sm text-slate-600">
              <div><strong>Sự kiện:</strong> {selectedTicket.eventName}</div>
              <div><strong>Loại vé:</strong> {selectedTicket.ticketTypeName}</div>
              <div><strong>Mã QR:</strong> {selectedTicket.qrCode || 'N/A'}</div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default MyTickets;
