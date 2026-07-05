import React, { useEffect, useMemo, useState } from 'react';
import { Table, Tag, Select, Space, Button, Drawer, Descriptions, message } from 'antd';
import { EyeOutlined, CalendarOutlined, DollarOutlined, ShoppingCartOutlined } from '@ant-design/icons';
import axiosClient from '../../api/axiosClient';
import { CustomerMetricCard, CustomerSectionTitle, formatCurrency } from '../../components/customer/CustomerPrimitives';
import { formatVietnamDateTime } from '../../utils/vietnamTime';

const paymentColorMap = {
  Pending: 'gold',
  Paid: 'green',
  Failed: 'red',
  Cancelled: 'default',
};

const MyOrders = () => {
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [pagination, setPagination] = useState({ current: 1, pageSize: 10, total: 0 });
  const [paymentStatus, setPaymentStatus] = useState(undefined);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);

  const fetchOrders = async (page = 1, pageSize = 10, status = paymentStatus) => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/orders/my-orders', {
        params: {
          pageNumber: page,
          pageSize,
          paymentStatus: status,
        },
      });

      const data = response?.data || response;
      setOrders(data?.Items || data?.items || data?.Orders || data?.orders || []);
      setPagination({
        current: data?.PageNumber || data?.pageNumber || page,
        pageSize: data?.PageSize || data?.pageSize || pageSize,
        total: data?.TotalCount || data?.totalCount || 0,
      });
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải lịch sử đặt vé');
    } finally {
      setLoading(false);
    }
  };

  const openDetail = async (orderId) => {
    try {
      const response = await axiosClient.get(`/orders/${orderId}`);
      setSelectedOrder(response?.data || response);
      setDetailOpen(true);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải chi tiết đơn hàng');
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const stats = useMemo(() => {
    const paid = orders.filter((order) => order.paymentStatusName === 'Completed').length;
    const pending = orders.filter((order) => order.paymentStatusName === 'Pending').length;
    return [
      { label: 'Tổng đơn', value: orders.length.toLocaleString('vi-VN'), hint: 'Đang hiển thị theo bộ lọc', icon: ShoppingCartOutlined, accent: 'bg-green-50 text-green-700' },
      { label: 'Đã thanh toán', value: paid.toLocaleString('vi-VN'), hint: 'Paid orders', icon: DollarOutlined, accent: 'bg-blue-50 text-blue-700' },
      { label: 'Đang chờ', value: pending.toLocaleString('vi-VN'), hint: 'Pending orders', icon: CalendarOutlined, accent: 'bg-gray-100 text-gray-700' },
    ];
  }, [orders]);

  const columns = [
    {
      title: 'Mã đơn',
      dataIndex: 'id',
      key: 'id',
      render: (id) => <span className="font-semibold">#{id?.slice(0, 8)}</span>,
    },
    {
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => formatVietnamDateTime(value),
    },
    {
      title: 'Sự kiện',
      dataIndex: 'eventName',
      key: 'eventName',
    },
    {
      title: 'Tổng tiền',
      dataIndex: 'totalPrice',
      key: 'totalPrice',
      render: (v) => `${Number(v || 0).toLocaleString('vi-VN')}₫`,
    },
    {
      title: 'Thanh toán',
      dataIndex: 'paymentStatusName',
      key: 'paymentStatusName',
      render: (status) => <Tag color={paymentColorMap[status] || 'default'}>{status || 'Pending'}</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, row) => (
        <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)} className="!rounded-lg">
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <CustomerSectionTitle
        kicker="My orders"
        title="Lịch sử đặt vé"
        description="Xem toàn bộ đơn hàng, lọc theo trạng thái thanh toán và mở chi tiết khi cần."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {stats.map((item) => (
          <CustomerMetricCard key={item.label} {...item} />
        ))}
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-gray-200 bg-white p-5 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-gray-500">Lọc theo trạng thái thanh toán để xem nhanh đơn hàng cần theo dõi.</p>
        <Space>
          <Select
            allowClear
            style={{ width: 220 }}
            placeholder="Lọc trạng thái thanh toán"
            value={paymentStatus}
            onChange={(value) => {
              setPaymentStatus(value);
              fetchOrders(1, pagination.pageSize, value);
            }}
            options={[
              { value: 0, label: 'Pending' },
              { value: 1, label: 'Paid' },
              { value: 2, label: 'Failed' },
              { value: 3, label: 'Cancelled' },
            ]}
          />
        </Space>
      </div>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <Table
          rowKey="id"
          columns={columns}
          dataSource={orders}
          loading={loading}
          pagination={{
            ...pagination,
            showSizeChanger: true,
          }}
          onChange={(p) => fetchOrders(p.current, p.pageSize, paymentStatus)}
          scroll={{ x: true }}
        />
      </div>

      <Drawer
        title={`Chi tiết đơn #${selectedOrder?.id?.slice(0, 8) || ''}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={560}
      >
        {selectedOrder && (
          <Descriptions bordered column={1} size="small">
            <Descriptions.Item label="Người mua">{selectedOrder.buyerName || selectedOrder.buyerUsername}</Descriptions.Item>
            <Descriptions.Item label="Sự kiện">{selectedOrder.eventName}</Descriptions.Item>
            <Descriptions.Item label="Loại vé">{selectedOrder.ticketTypeName}</Descriptions.Item>
            <Descriptions.Item label="Số lượng">{selectedOrder.quantity}</Descriptions.Item>
            <Descriptions.Item label="Tổng tiền">{formatCurrency(selectedOrder.totalPrice)}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái đơn">{selectedOrder.orderStatusName}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái thanh toán">{selectedOrder.paymentStatusName}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{formatVietnamDateTime(selectedOrder.createdAt, { withSeconds: true })}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default MyOrders;