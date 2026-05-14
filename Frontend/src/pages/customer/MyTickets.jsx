import React, { useMemo, useState, useEffect } from 'react';
import { Table, Tag, Empty, Spin, Button, Popconfirm, message, Space, Modal, Input, Tooltip } from 'antd';
import axiosClient from '../../api/axiosClient';
import DynamicTicketCard from '../../components/DynamicTicketCard';
import { 
  DeleteOutlined, EyeOutlined, QrcodeOutlined, WalletOutlined, 
  CheckCircleOutlined, TeamOutlined, UserOutlined, ShareAltOutlined, CopyOutlined 
} from '@ant-design/icons';
import { CustomerMetricCard, CustomerSectionTitle } from '../../components/customer/CustomerPrimitives';

const MyTickets = () => {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // KHAI BÁO STATE CHO MODAL QR
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // KHAI BÁO STATE CHO MODAL CHIA SẺ VÉ (Lỗi của em nằm ở đây vì thiếu 3 dòng này)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const canUseTicket = (ticket) => Number(ticket?.status) === 1 || Number(ticket?.status) === 2;

  const handleViewQr = (ticket) => {
    setSelectedTicket(ticket);
    setQrModalOpen(true);
  };

  // HÀM XỬ LÝ CHIA SẺ VÉ
  const handleShareTicket = async (ticket) => {
    setIsGeneratingLink(true);
    try {
      const response = await axiosClient.post(`/ticketshare/${ticket.id}/generate-link`);
      const resData = response.data || response;

      if (resData.success || resData.token) {
        const currentDomain = window.location.origin;
        const fullLink = `${currentDomain}/guest-ticket/${ticket.id}?token=${resData.token}`;
        
        setShareLink(fullLink);
        setShareModalOpen(true);
      }
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tạo link chia sẻ.');
    } finally {
      setIsGeneratingLink(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareLink);
    message.success('Đã sao chép link chia sẻ vào khay nhớ tạm!');
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
    const usable = tickets.filter((ticket) => canUseTicket(ticket)).length;
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
      fetchMyTickets(false); 
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
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => {
        const isReadyToShare = record.status === 1 && !record.isClaimed;

        return (
          <Space>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              disabled={!canUseTicket(record) || record.remainingSlots === 0}
              onClick={() => handleViewQr(record)}
            >
              Mở Vé
            </Button>

            {/* GẮN HÀM XỬ LÝ VÀO NÚT (Lỗi của em nằm ở đây vì thiếu đoạn này) */}
            {isReadyToShare && (
              <Tooltip title="Tặng/Gửi vé này cho bạn bè qua Zalo, Messenger...">
                <Button 
                  className="border-orange-500 text-orange-500 hover:bg-orange-50"
                  icon={<ShareAltOutlined />}
                  onClick={() => handleShareTicket(record)}
                  loading={isGeneratingLink}
                >
                  Chia sẻ
                </Button>
              </Tooltip>
            )}

            {record.status === 1 && record.isClaimed && (
               <Tag color="purple">Đã tặng bạn bè</Tag>
            )}

            {record.status === 1 && record.remainingSlots === record.groupSize && !record.isClaimed && (
              <Popconfirm title="Bạn có chắc chắn muốn hủy vé này không?" onConfirm={() => handleCancelTicket(record.id)}>
                <Button type="text" danger icon={<DeleteOutlined />}></Button>
              </Popconfirm>
            )}
          </Space>
        );
      },
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
        destroyOnHidden={true} 
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
                fetchMyTickets(true); 
             }} 
          />
        )}
      </Modal>

      {/* MODAL HIỂN THỊ LINK CHIA SẺ */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-orange-600">
            <ShareAltOutlined /> <span>Chia sẻ vé cho bạn bè</span>
          </div>
        }
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setShareModalOpen(false)}>
            Đóng
          </Button>,
          <Button key="copy" type="primary" className="bg-orange-500" icon={<CopyOutlined />} onClick={handleCopyLink}>
            Sao chép Link
          </Button>
        ]}
      >
        <div className="mt-4">
          <p className="mb-2 text-slate-600">Hãy gửi đường link này cho bạn bè. Lưu ý: Đường link chỉ sử dụng được 1 lần để bảo mật!</p>
          <Input.TextArea 
            readOnly 
            value={shareLink} 
            rows={3} 
            className="!bg-slate-50 !text-orange-600 font-medium"
          />
        </div>
      </Modal>
    </div>
  );
};

export default MyTickets;