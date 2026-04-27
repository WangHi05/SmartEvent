import React, { useEffect, useState } from 'react';
import { Table, Tag, Select, Space, Button, Drawer, Descriptions, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import axiosClient from '../../api/axiosClient';

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

      const data = response.data || response;
      setOrders(data.items || []);
      setPagination({
        current: data.pageNumber || page,
        pageSize: data.pageSize || pageSize,
        total: data.totalCount || 0,
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
      setSelectedOrder(response.data || response);
      setDetailOpen(true);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể tải chi tiết đơn hàng');
    }
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
      title: 'Ngày đặt',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => dayjs(value).format('DD/MM/YYYY HH:mm'),
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
        <Button icon={<EyeOutlined />} onClick={() => openDetail(row.id)}>
          Xem chi tiết
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-black text-slate-900">Lịch sử đặt vé</h1>
        <Space>
          <Select
            allowClear
            style={{ width: 200 }}
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
      />

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
            <Descriptions.Item label="Tổng tiền">{Number(selectedOrder.totalPrice || 0).toLocaleString('vi-VN')}₫</Descriptions.Item>
            <Descriptions.Item label="Trạng thái đơn">{selectedOrder.orderStatusName}</Descriptions.Item>
            <Descriptions.Item label="Trạng thái thanh toán">{selectedOrder.paymentStatusName}</Descriptions.Item>
            <Descriptions.Item label="Ngày tạo">{dayjs(selectedOrder.createdAt).format('DD/MM/YYYY HH:mm:ss')}</Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>
    </div>
  );
};

export default MyOrders;
