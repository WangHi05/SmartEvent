import React, { useMemo, useState, useEffect } from 'react';
import { Table, Tag, Empty, Spin, Button, Popconfirm, message, Space, Modal } from 'antd';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';
import DynamicTicketCard from '../../components/DynamicTicketCard';
import { DeleteOutlined, EyeOutlined, QrcodeOutlined, WalletOutlined, CheckCircleOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { CustomerMetricCard, CustomerSectionTitle } from '../../components/customer/CustomerPrimitives';

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

  const fetchMyTickets = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    try {
      const response = await axiosClient.get('/tickets/my-tickets');
      const resData = response.data || response;
      let ticketList = [];

      if (Array.isArray(resData)) ticketList = resData;
      else if (resData.data && Array.isArray(resData.data)) ticketList = resData.data;
      else if (resData.data && resData.data.tickets) ticketList = resData.data.tickets;
      else if (resData.tickets) ticketList = resData.tickets;
      else if (resData.items) ticketList = resData.items;

      setTickets(ticketList);
    } catch (error) {
      console.error('Error fetching tickets:', error);
      if (!isSilent) message.error('Không thể tải danh sách vé');
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyTickets(false);

    const pollingInterval = setInterval(() => {
      fetchMyTickets(true);
    }, 5000);

    return () => clearInterval(pollingInterval);
  }, []);

  const stats = useMemo(() => {
    const usable = tickets.filter((ticket) => Number(ticket?.status) === 1).length;
    const checkedIn = tickets.filter((ticket) => Number(ticket?.status) === 2 || ticket?.remainingSlots === 0).length;
    return [
      { label: 'Tổng vé', value: tickets.length.toLocaleString('vi-VN'), hint: 'Số lượng mã vé', icon: QrcodeOutlined, accent: 'from-orange-500 to-amber-500' },
      { label: 'Có thể dùng', value: usable.toLocaleString('vi-VN'), hint: 'Mã đang hiệu lực', icon: WalletOutlined, accent: 'from-emerald-500 to-teal-500' },
      { label: 'Đã check-in', value: checkedIn.toLocaleString('vi-VN'), hint: 'Vé đã dùng hết', icon: CheckCircleOutlined, accent: 'from-slate-800 to-slate-600' },
    ];
  }, [tickets]);

  const handleCancelTicket = async (ticketId) => {
    try {
      await axiosClient.delete(`/tickets/${ticketId}`);
      message.success('Hủy vé thành công');
      fetchMyTickets(false); // Cần có loading khi user chủ động thao tác
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể hủy vé');
    }
  };

  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'eventName',
      key: 'eventName',
      render: (value) => <span className="font-semibold text-slate-800">{value || 'N/A'}</span>,
    },
    {
      title: 'Loại vé & Quy mô',
      key: 'ticketType',
      render: (_, record) => (
        <div>
          <div>{record.ticketTypeName || 'N/A'}</div>
          {record.groupSize > 1 ? (
             <Tag icon={<TeamOutlined />} color="purple" className="mt-1">Vé Đoàn ({record.groupSize} người)</Tag>
          ) : (
             <Tag icon={<UserOutlined />} color="default" className="mt-1">Vé Cá nhân</Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Bảo mật',
      dataIndex: 'qrCode', 
      key: 'qrCode',
      render: () => <Tag color="red">Mã hóa (TOTP)</Tag>,
    },
    {
      title: 'Trạng thái sử dụng',
      key: 'status',
      render: (_, record) => {
        const isGroup = record.groupSize > 1;
        const usedSlots = record.groupSize - record.remainingSlots;
        const isPartialUse = isGroup && usedSlots > 0 && record.remainingSlots > 0;

        if (record.status === 3) return <Tag color="red">Đã hủy</Tag>;
        if (record.status === 2 || record.remainingSlots === 0) return <Tag color="blue">Đã Check-in</Tag>;
        if (record.status === 0) return <Tag color="gold">Chờ thanh toán</Tag>;

        // Trạng thái vé PAID (status = 1)
        if (isPartialUse) {
            return (
              <Tag color="cyan" className="border border-cyan-400">
                Đang dùng (Còn {record.remainingSlots}/{record.groupSize} chỗ)
              </Tag>
            );
        }
        
        return <Tag color="green">Sẵn sàng (Paid)</Tag>;
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
            disabled={!canUseTicket(record) || record.remainingSlots === 0}
            onClick={() => handleViewQr(record)}
          >
            Mở Vé
          </Button>
          {record.status === 1 && record.remainingSlots === record.groupSize && (
            <Popconfirm title="Hủy vé?" onConfirm={() => handleCancelTicket(record.id)}>
              <Button type="link" danger icon={<DeleteOutlined />}>Hủy</Button>
            </Popconfirm>
          )}
        </Space>
      ),
    },
  ];

  return (
    <div className="space-y-8">
      <CustomerSectionTitle kicker="My tickets" title="Vé của tôi" description="Danh sách vé và thông tin check-in nhóm tự động cập nhật." />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => <CustomerMetricCard key={item.label} {...item} />)}
      </div>

      {loading ? (
        <div className="flex min-h-[260px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white">
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-[28px] border border-dashed border-slate-300 bg-white p-10 text-center">
          <Empty description="Bạn chưa có vé nào" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <Table columns={columns} dataSource={tickets} rowKey="id" pagination={{ pageSize: 10 }} scroll={{ x: true }} />
        </div>
      )}

      <Modal
        title={null} 
        open={qrModalOpen}
        onCancel={() => setQrModalOpen(false)}
        footer={null} 
        closable={false}
        width={400}
        destroyOnClose={true} // Bắt buộc để clear bộ đếm thời gian khi đóng
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
             onClose={() => {
                setQrModalOpen(false);
                fetchMyTickets(true); // Cập nhật ngầm ngay sau khi đóng vé
             }} 
          />
        )}
      </Modal>
    </div>
  );
};

export default MyTickets;