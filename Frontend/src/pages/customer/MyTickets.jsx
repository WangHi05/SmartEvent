import React, { useMemo, useState, useEffect } from 'react';
import { Table, Tag, Empty, Spin, Button, message, Space, Modal, Input, Tooltip } from 'antd';
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

  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [isGeneratingLink, setIsGeneratingLink] = useState(false);

  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [refundPreview, setRefundPreview] = useState(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [cancelLoading, setCancelLoading] = useState(false);

  const canUseTicket = (ticket) => Number(ticket?.status) === 1 || Number(ticket?.status) === 2;

  const handleViewQr = (ticket) => {
    setSelectedTicket(ticket);
    setQrModalOpen(true);
  };

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
    const usable = tickets.filter((ticket) => Number(ticket?.status) === 1).length;
    const checkedIn = tickets.filter((ticket) => Number(ticket?.status) === 2 || ticket?.remainingSlots === 0).length;
    return [
      { label: 'Tổng vé', value: tickets.length.toLocaleString('vi-VN'), hint: 'Số lượng mã vé', icon: QrcodeOutlined, accent: 'bg-orange-50 text-orange-700' },
      { label: 'Có thể dùng', value: usable.toLocaleString('vi-VN'), hint: 'Mã đang hiệu lực', icon: WalletOutlined, accent: 'bg-blue-50 text-blue-700' },
      { label: 'Đã check-in', value: checkedIn.toLocaleString('vi-VN'), hint: 'Vé đã dùng hết', icon: CheckCircleOutlined, accent: 'bg-gray-100 text-gray-700' },
    ];
  }, [tickets]);

  const openCancelModal = async (record) => {
    setCancelTarget(record);
    setCancelModalOpen(true);
    setRefundPreview(null);
    setPreviewLoading(true);
    try {
      const response = await axiosClient.post(`/orders/${record.orderId}/validate-cancel`);
      setRefundPreview(response.data || response);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể kiểm tra điều kiện hủy');
      setRefundPreview({ canCancel: false, reasonCannotCancel: 'Có lỗi xảy ra, vui lòng thử lại' });
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    if (!refundPreview?.canCancel || !cancelTarget) return;
    setCancelLoading(true);
    try {
      await axiosClient.post(`/orders/${cancelTarget.orderId}/cancel`, {
        reason: 'Khách hàng yêu cầu hủy vé',
      });
      message.success('Yêu cầu hủy vé thành công, tiền sẽ được hoàn thủ công sau khi xử lý');
      setCancelModalOpen(false);
      setCancelTarget(null);
      fetchMyTickets(false);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể hủy vé');
    } finally {
      setCancelLoading(false);
    }
  };

  const columns = [
    {
      title: 'Tên sự kiện',
      dataIndex: 'eventName',
      key: 'eventName',
      render: (value) => <span className="font-semibold text-gray-800">{value || 'N/A'}</span>,
    },
    {
      title: 'Loại vé & quy mô',
      key: 'ticketType',
      render: (_, record) => (
        <div>
          <div>{record.ticketTypeName || 'N/A'}</div>
          {record.groupSize > 1 ? (
             <Tag icon={<TeamOutlined />} color="purple" className="mt-1">Vé đoàn ({record.groupSize} người)</Tag>
          ) : (
             <Tag icon={<UserOutlined />} color="default" className="mt-1">Vé cá nhân</Tag>
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
        if (record.status === 2 || record.remainingSlots === 0) return <Tag color="blue">Đã check-in</Tag>;
        if (record.status === 0) return <Tag color="gold">Chờ thanh toán</Tag>;

        if (isPartialUse) {
            return (
              <Tag color="cyan" className="border border-cyan-400">
                Đang dùng (còn {record.remainingSlots}/{record.groupSize} chỗ)
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
        const canRequestCancel = record.status === 1 && record.remainingSlots === record.groupSize && !record.isClaimed;

        return (
          <Space>
            <Button
              type="primary"
              icon={<EyeOutlined />}
              disabled={!canUseTicket(record) || record.remainingSlots === 0}
              onClick={() => handleViewQr(record)}
              className="!rounded-lg !border-orange-600 !bg-orange-600 hover:!border-orange-700 hover:!bg-orange-700"
            >
              Mở vé
            </Button>

            {isReadyToShare && (
              <Tooltip title="Tặng/Gửi vé này cho bạn bè qua Zalo, Messenger...">
                <Button
                  className="!rounded-lg !border-gray-300 !text-gray-700 hover:!border-orange-500 hover:!text-orange-700"
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

            {canRequestCancel && (
              <Tooltip title="Yêu cầu hủy vé và xem trước số tiền được hoàn">
                <Button danger icon={<DeleteOutlined />} onClick={() => openCancelModal(record)}>
                  Yêu cầu hủy vé
                </Button>
              </Tooltip>
            )}
          </Space>
        );
      },
    },
  ];

  return (
    <div className="space-y-6">
      <CustomerSectionTitle kicker="My tickets" title="Vé của tôi" description="Danh sách vé và thông tin check-in nhóm tự động cập nhật." />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => <CustomerMetricCard key={item.label} {...item} />)}
      </div>

      {loading ? (
        <div className="flex min-h-[220px] items-center justify-center rounded-xl border border-gray-200 bg-white">
          <Spin size="large" tip="Đang tải dữ liệu..." />
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 bg-white p-10 text-center">
          <Empty description="Bạn chưa có vé nào" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
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

      <Modal
        title={
          <div className="flex items-center gap-2 text-orange-700">
            <ShareAltOutlined /> <span>Chia sẻ vé cho bạn bè</span>
          </div>
        }
        open={shareModalOpen}
        onCancel={() => setShareModalOpen(false)}
        footer={[
          <Button key="close" onClick={() => setShareModalOpen(false)}>
            Đóng
          </Button>,
          <Button key="copy" type="primary" className="!border-orange-600 !bg-orange-600" icon={<CopyOutlined />} onClick={handleCopyLink}>
            Sao chép link
          </Button>
        ]}
      >
        <div className="mt-4">
          <p className="mb-2 text-gray-600">Hãy gửi đường link này cho bạn bè. Lưu ý: đường link chỉ sử dụng được 1 lần để bảo mật!</p>
          <Input.TextArea
            readOnly
            value={shareLink}
            rows={3}
            className="!bg-gray-50 !font-medium !text-orange-700"
          />
        </div>
      </Modal>

      <Modal
        title="Xác nhận hủy vé"
        open={cancelModalOpen}
        onCancel={() => setCancelModalOpen(false)}
        onOk={handleConfirmCancel}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        okButtonProps={{
          danger: true,
          loading: cancelLoading,
          disabled: previewLoading || !refundPreview?.canCancel,
        }}
      >
        {previewLoading ? (
          <div className="flex justify-center py-6">
            <Spin />
          </div>
        ) : refundPreview?.canCancel ? (
          <div>
            {refundPreview.estimatedRefundPercentage === 100 ? (
              <p className="mb-2 text-gray-700">
                Vé của bạn hủy trước hơn <b>7 ngày</b> so với ngày diễn ra sự kiện, nên đủ điều kiện{' '}
                <b className="text-green-600">hoàn tiền 100%</b> theo chính sách.
              </p>
            ) : refundPreview.estimatedRefundPercentage === 50 ? (
              <p className="mb-2 text-gray-700">
                Vé của bạn hủy trong khoảng <b>3–7 ngày</b> trước sự kiện, nên theo chính sách bạn sẽ được{' '}
                <b className="text-orange-600">hoàn 50%</b> giá trị vé.
              </p>
            ) : (
              <p className="mb-2 text-gray-700">{refundPreview.refundReason || 'Đơn của bạn thuộc diện được hoàn tiền theo chính sách hiện hành.'}</p>
            )}

            <p className="mb-2">
              Số tiền dự kiến hoàn:{' '}
              <b className="text-orange-600 text-lg">
                {Number(refundPreview.estimatedRefundAmount || 0).toLocaleString('vi-VN')}đ
              </b>
            </p>
            <p className="text-sm text-gray-500">
              Số tiền sẽ được hoàn thủ công (chuyển khoản/tiền mặt tại quầy) sau khi nhân viên xác nhận yêu cầu hủy của bạn.
            </p>
          </div>
        ) : (
          <p className="text-red-600">{refundPreview?.reasonCannotCancel || 'Không thể hủy vé này'}</p>
        )}
      </Modal>
    </div>
  );
};

export default MyTickets;