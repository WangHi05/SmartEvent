import React, { useMemo, useState, useEffect } from 'react';
import { Table, Tag, Empty, Spin, Button, Popconfirm, message, Space, Modal } from 'antd';
import { DeleteOutlined, DownloadOutlined, EyeOutlined, QrcodeOutlined, WalletOutlined, CheckCircleOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import DynamicTicketCard from '../../components/DynamicTicketCard';
import { CustomerMetricCard, CustomerSectionTitle, formatCurrency } from '../../components/customer/CustomerPrimitives';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const canUseTicket = (ticket) => Number(ticket?.status) === 1 || Number(ticket?.status) === 2;

  const handleViewQr = (ticket) => {
    setSelectedTicket(ticket);
    setQrModalOpen(true);
  };

  // Fetch my tickets
  const fetchMyTickets = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/tickets/my-tickets');
      
      const resData = response.data || response;
      let ticketList = [];

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
      title: 'Mã bảo mật',
      dataIndex: 'qrCode', 
      key: 'qrCode',
      render: () => <Tag color="red">Đã mã hóa (TOTP)</Tag>,
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
    <div className="space-y-8">
      <CustomerSectionTitle
        kicker="My tickets"
        title="Vé của tôi"
        description="Danh sách vé được bảo mật bằng công nghệ Dynamic QR Code."
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
        title={null} 
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null} 
        closable={false}
        width={400}
        destroyOnHidden={true} // Bắt buộc để clear bộ đếm thời gian khi đóng
        centered
        styles={{ body: { padding: 0, backgroundColor: 'transparent' } }}
        wrapClassName="custom-modal-transparent"
      >
        {selectedTicket && (
          <DynamicTicketCard 
             ticketId={selectedTicket.id}
             secretKey={selectedTicket.qrCode} 
             eventName={selectedTicket.eventName}
             ticketTypeName={selectedTicket.ticketTypeName}
             onClose={() => setQrModalOpen(false)}
          />
        )}
      </Modal>
    </div>
  );
};

export default MyTickets;