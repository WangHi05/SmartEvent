import React, { useEffect, useMemo, useState } from 'react';
import {
  Table,
  Tag,
  Input,
  Select,
  Space,
  Button,
  Drawer,
  Descriptions,
  message,
  Modal,
  Form,
  Input as AntInput,
} from 'antd';
import { EyeOutlined, SearchOutlined, CheckCircleOutlined, CloseCircleOutlined, PrinterOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/useAuthStore';
import { formatVietnamDateTime } from '../../../utils/vietnamTime';

const paymentColorMap = {
  Pending: 'gold',
  Completed: 'green',
  Failed: 'red',
  Cancelled: 'default',
};

const orderColorMap = {
  Pending: 'blue',
  Confirmed: 'green',
  Cancelled: 'red',
};

const PAYMENT_METHOD = {
  VNPAY: 1,
  QRPayment: 2,
  Counter: 3,
};

const PAYMENT_STATUS = {
  Pending: 0,
  Completed: 1,
  Failed: 2,
  Cancelled: 3,
};

const ORDER_STATUS = {
  Pending: 0,
  Confirmed: 1,
  Cancelled: 2,
};

const FILTER_VALUE = {
  ALL: 'ALL',
  PAYMENT_PENDING: 'PAYMENT_PENDING',
  PAYMENT_COMPLETED: 'PAYMENT_COMPLETED',
  ORDER_CONFIRMED: 'ORDER_CONFIRMED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
};

const BookingManagementPage = () => {
  const user = useAuthStore((state) => state.user);
  const roleRaw = (user?.role ?? user?.Role ?? '').toString();
  const roleNumber = Number(roleRaw);
  const isStaff = roleNumber === 2 || roleRaw.toLowerCase() === 'staff';
  const canCancelOrder = !isStaff;

  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(null);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(FILTER_VALUE.ALL);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [cancelForm] = Form.useForm();

  const currentPaymentStatus = useMemo(() => {
    if (statusFilter === FILTER_VALUE.PAYMENT_PENDING) return PAYMENT_STATUS.Pending;
    if (statusFilter === FILTER_VALUE.PAYMENT_COMPLETED) return PAYMENT_STATUS.Completed;
    return undefined;
  }, [statusFilter]);

  const currentOrderStatus = useMemo(() => {
    if (statusFilter === FILTER_VALUE.ORDER_CONFIRMED) return ORDER_STATUS.Confirmed;
    if (statusFilter === FILTER_VALUE.ORDER_CANCELLED) return ORDER_STATUS.Cancelled;
    return undefined;
  }, [statusFilter]);

  const fetchOrders = async (
    page = 1,
    pageSize = 10,
    searchTerm = search,
    paymentStatus = currentPaymentStatus,
    orderStatus = currentOrderStatus,
  ) => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/admin/orders', {
        params: {
          pageNumber: page,
          pageSize,
          search: searchTerm,
          paymentStatus,
          orderStatus,
        },
      });

      const data = response.data || response;
      setOrders(data.items || []);
      setPagination({
        current: data.pageNumber || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
      });
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải danh sách đặt vé');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (orderId) => {
    try {
      const response = await axiosClient.get(`/admin/orders/${orderId}`);
      setSelectedOrder(response.data || response);
      setDetailOpen(true);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải chi tiết đơn');
    }
  };

  const refreshCurrentPage = async () => {
    await fetchOrders(pagination.current, pagination.pageSize, search, currentPaymentStatus, currentOrderStatus);
  };

  const handleConfirmPayment = async (row) => {
    try {
      setActionLoading(row.id);
      await axiosClient.post(`/admin/orders/${row.id}/confirm-payment`);
      message.success('Đã xác nhận thanh toán thành công');
      await refreshCurrentPage();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xác nhận thanh toán');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmOrder = async (row) => {
    try {
      setActionLoading(row.id);
      await axiosClient.post(`/admin/orders/${row.id}/confirm-order`);
      message.success('Đơn hàng đã xác nhận');
      await refreshCurrentPage();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xác nhận đơn');
    } finally {
      setActionLoading(null);
    }
  };

  const handleConfirmRefund = async (row) => {
    try {
      setActionLoading(row.id);
      await axiosClient.post(`/admin/orders/${row.id}/confirm-refund`);
      message.success('Đã xác nhận hoàn tiền thành công');
      await refreshCurrentPage();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể xác nhận hoàn tiền');
    } finally {
      setActionLoading(null);
    }
  };

  const openCancelModal = (row) => {
    setCancelTarget(row);
    cancelForm.setFieldsValue({ reason: '' });
    setCancelOpen(true);
  };

  const handleCancelOrder = async () => {
    try {
      const values = await cancelForm.validateFields();
      setActionLoading(cancelTarget?.id || 'cancel');
      await axiosClient.post(`/admin/orders/${cancelTarget.id}/cancel`, {
        reason: values.reason,
      });
      message.success('Đã hủy đơn thành công');
      setCancelOpen(false);
      setCancelTarget(null);
      await refreshCurrentPage();
    } catch (error) {
      if (error?.errorFields) return;
      message.error(error.response?.data?.message || 'Không thể hủy đơn');
    } finally {
      setActionLoading(null);
    }
  };

  const handlePrintTicket = (row) => {
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) return;
    const html = `
      <html>
        <head><title>In vé - ${row.id}</title></head>
        <body style="font-family: Arial, sans-serif; padding: 24px;">
          <h2>THÔNG TIN VÉ</h2>
          <p><b>Mã đơn:</b> ${row.id}</p>
          <p><b>Người mua:</b> ${row.buyerName || '-'}</p>
          <p><b>Sự kiện:</b> ${row.eventName || '-'}</p>
          <p><b>Loại vé:</b> ${row.ticketTypeName || '-'}</p>
          <p><b>Số lượng:</b> ${row.quantity || 0}</p>
          <p><b>Tổng tiền:</b> ${Number(row.totalPrice || 0).toLocaleString('vi-VN')}đ</p>
          <p><b>Ngày xác nhận:</b> ${row.confirmedAt ? formatVietnamDateTime(row.confirmedAt, { withSeconds: true }) : '-'}</p>
          <script>window.onload = function() { window.print(); };</script>
        </body>
      </html>
    `;
    win.document.write(html);
    win.document.close();
  };

  const getPaymentMethod = (row) => row?.payments?.[0]?.paymentMethod;

  const renderActionButtons = (row) => {
    const paymentMethod = getPaymentMethod(row);
    const isPaymentPending =
      row.paymentStatus === PAYMENT_STATUS.Pending && row.orderStatus !== ORDER_STATUS.Cancelled;
    const isOnlinePaidPendingOrder =
      (paymentMethod === PAYMENT_METHOD.VNPAY || paymentMethod === PAYMENT_METHOD.QRPayment) &&
      row.paymentStatus === PAYMENT_STATUS.Completed &&
      row.orderStatus === ORDER_STATUS.Pending;

    if (isPaymentPending) {
      return (
        <Space wrap>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={actionLoading === row.id}
            onClick={() => handleConfirmPayment(row)}
          >
            Xác nhận thanh toán
          </Button>
          {canCancelOrder && (
            <Button danger icon={<CloseCircleOutlined />} loading={actionLoading === row.id} onClick={() => openCancelModal(row)}>
              Hủy đơn
            </Button>
          )}
          <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>Xem chi tiết</Button>
        </Space>
      );
    }

    if (isOnlinePaidPendingOrder) {
      return (
        <Space wrap>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={actionLoading === row.id}
            onClick={() => handleConfirmOrder(row)}
          >
            Xác nhận đơn
          </Button>
          {canCancelOrder && (
            <Button danger icon={<CloseCircleOutlined />} loading={actionLoading === row.id} onClick={() => openCancelModal(row)}>
              Hủy đơn
            </Button>
          )}
          <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>Xem chi tiết</Button>
        </Space>
      );
    }

    if (row.orderStatus === ORDER_STATUS.Cancelled && row.refundStatus === 1) {
      return (
        <Space wrap>
          <Button
            type="primary"
            icon={<CheckCircleOutlined />}
            loading={actionLoading === row.id}
            onClick={() => handleConfirmRefund(row)}
          >
            Xác nhận đã hoàn ({Number(row.refundAmount || 0).toLocaleString('vi-VN')}đ)
          </Button>
          <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>Xem chi tiết</Button>
        </Space>
      );
    }

    if (row.orderStatus === ORDER_STATUS.Cancelled && row.refundStatus === 2) {
      return (
        <Space wrap>
          <Tag color="green">Đã hoàn tiền</Tag>
          <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>Xem chi tiết</Button>
        </Space>
      );
    }

    if (row.orderStatus === ORDER_STATUS.Confirmed) {
      return (
        <Space wrap>
          <Button icon={<PrinterOutlined />} onClick={() => handlePrintTicket(row)}>
            In vé
          </Button>
          <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>Xem chi tiết</Button>
        </Space>
      );
    }

    return (
      <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>
        Xem chi tiết
      </Button>
    );
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span className="font-semibold">#{id?.slice(0, 8)}</span>,
    },
    {
      title: 'Người mua',
      key: 'buyer',
      render: (_, row) => (
        <div>
          <p className="font-semibold text-slate-800">{row.buyerName || '-'}</p>
          <p className="text-xs text-slate-500">{row.buyerUsername || '-'}</p>
        </div>
      ),
    },
    {
      title: 'Sự kiện',
      dataIndex: 'eventName',
      key: 'eventName',
    },
    {
      title: 'Số lượng',
      dataIndex: 'quantity',
      key: 'quantity',
      width: 90,
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (v) => `${Number(v || 0).toLocaleString('vi-VN')}₫`,
    },
    {
      title: 'Trạng thái thanh toán',
      dataIndex: 'paymentStatusName',
      key: 'paymentStatusName',
      render: (status) => <Tag color={paymentColorMap[status] || 'default'}>{status || 'Pending'}</Tag>,
    },
    {
      title: 'Trạng thái đơn',
      dataIndex: 'orderStatusName',
      key: 'orderStatusName',
      render: (status) => <Tag color={orderColorMap[status] || 'default'}>{status || 'Pending'}</Tag>,
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (v) => formatVietnamDateTime(v),
    },
    {
      title: 'Action',
      key: 'action',
      render: (_, row) => renderActionButtons(row),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý đặt vé</h1>
          <p className="text-sm text-slate-500">Theo dõi và quản trị các đơn đặt vé toàn hệ thống</p>
        </div>

        <Space wrap>
          <Input
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Tìm theo mã đơn, người mua, sự kiện"
            style={{ width: '100%', maxWidth: 280 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onPressEnter={() => fetchOrders(1, pagination.pageSize, search, currentPaymentStatus, currentOrderStatus)}
          />
          <Select
            placeholder="Lọc trạng thái"
            style={{ width: 180 }}
            value={statusFilter}
            onChange={(value) => {
              setStatusFilter(value);
              const paymentStatus =
                value === FILTER_VALUE.PAYMENT_PENDING
                  ? PAYMENT_STATUS.Pending
                  : value === FILTER_VALUE.PAYMENT_COMPLETED
                    ? PAYMENT_STATUS.Completed
                    : undefined;
              const orderStatus =
                value === FILTER_VALUE.ORDER_CONFIRMED
                  ? ORDER_STATUS.Confirmed
                  : value === FILTER_VALUE.ORDER_CANCELLED
                    ? ORDER_STATUS.Cancelled
                    : undefined;
              fetchOrders(1, pagination.pageSize, search, paymentStatus, orderStatus);
            }}
            options={[
              { value: FILTER_VALUE.ALL, label: 'Tất cả' },
              { value: FILTER_VALUE.PAYMENT_PENDING, label: 'Chờ thanh toán' },
              { value: FILTER_VALUE.PAYMENT_COMPLETED, label: 'Đã thanh toán' },
              { value: FILTER_VALUE.ORDER_CONFIRMED, label: 'Đã xác nhận' },
              { value: FILTER_VALUE.ORDER_CANCELLED, label: 'Đã hủy' },
            ]}
          />
          <Button type="primary" onClick={() => fetchOrders(1, pagination.pageSize, search, currentPaymentStatus, currentOrderStatus)}>
            Tìm kiếm
          </Button>
        </Space>
      </div>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={orders}
        loading={loading}
        scroll={{ x: 1400 }}
        pagination={{ ...pagination, showSizeChanger: true }}
        onChange={(p) => fetchOrders(p.current, p.pageSize, search, currentPaymentStatus, currentOrderStatus)}
      />

      <Drawer
        title={`Chi tiết đơn #${selectedOrder?.id?.slice(0, 8) || ''}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={580}
        styles={{ wrapper: { maxWidth: '100vw' } }}
      >
        {selectedOrder && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Người mua">{selectedOrder.buyerName}</Descriptions.Item>
            <Descriptions.Item label="Username">{selectedOrder.buyerUsername}</Descriptions.Item>
            <Descriptions.Item label="Sự kiện">{selectedOrder.eventName}</Descriptions.Item>
            <Descriptions.Item label="Loại vé">{selectedOrder.ticketTypeName}</Descriptions.Item>
            <Descriptions.Item label="Số lượng">{selectedOrder.quantity}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">{Number(selectedOrder.totalPrice || 0).toLocaleString('vi-VN')}₫</Descriptions.Item>
            <Descriptions.Item label="Trạng thái đơn">{selectedOrder.orderStatusName}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái thanh toán">{selectedOrder.paymentStatusName}</Descriptions.Item>
            <Descriptions.Item label="Số tiền hoàn">{Number(selectedOrder.refundAmount || 0).toLocaleString('vi-VN')}₫</Descriptions.Item>
            <Descriptions.Item label="Trạng thái hoàn tiền">
              {selectedOrder.refundStatus === 1 ? 'Chờ hoàn tiền' : selectedOrder.refundStatus === 2 ? 'Đã hoàn tiền' : 'Không áp dụng'}
            </Descriptions.Item>
            <Descriptions.Item label="Xác nhận lúc">{selectedOrder.confirmedAt ? formatVietnamDateTime(selectedOrder.confirmedAt, { withSeconds: true }) : '-'}</Descriptions.Item>
            <Descriptions.Item label="Xác nhận bởi">{selectedOrder.confirmedBy || '-'}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatVietnamDateTime(selectedOrder.createdAt, { withSeconds: true })}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title={`Hủy đơn #${cancelTarget?.id?.slice(0, 8) || ''}`}
        open={cancelOpen}
        onCancel={() => setCancelOpen(false)}
        onOk={handleCancelOrder}
        okText="Xác nhận hủy"
        cancelText="Đóng"
        okButtonProps={{ danger: true, loading: actionLoading === (cancelTarget?.id || 'cancel') }}
      >
        <Form form={cancelForm} layout="vertical">
          <Form.Item
            name="reason"
            label="Lý do hủy"
            rules={[
              { required: true, message: 'Vui lòng nhập lý do hủy đơn' },
              { min: 5, message: 'Lý do hủy tối thiểu 5 ký tự' },
            ]}
          >
            <AntInput.TextArea rows={4} placeholder="Nhập lý do hủy đơn..." maxLength={500} showCount />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default BookingManagementPage;