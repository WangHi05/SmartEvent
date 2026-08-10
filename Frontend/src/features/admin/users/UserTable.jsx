import React, { useState, useEffect } from 'react';
import { PlusOutlined, EditOutlined, SearchOutlined, UserOutlined, EyeOutlined, KeyOutlined, CopyOutlined, LockOutlined, UnlockOutlined } from '@ant-design/icons';
import { Table, Button, Input, Space, Tag, Avatar, message, Popconfirm, Select, Drawer, Descriptions, Modal, Typography, Pagination } from 'antd';
import UserForm from './UserForm';
import axiosClient from '../../../api/axiosClient';

const { Search } = Input;
const { Text } = Typography;

const orderColorMap = { 0: 'blue', 1: 'green', 2: 'red' };
const orderLabelMap = { 0: 'Chờ xử lý', 1: 'Đã xác nhận', 2: 'Đã hủy' };
const paymentColorMap = { 0: 'gold', 1: 'green', 2: 'red', 3: 'default' };
const paymentLabelMap = { 0: 'Chờ thanh toán', 1: 'Đã thanh toán', 2: 'Thất bại', 3: 'Đã hủy' };

const UserTable = ({ type }) => {
  const isEmployee = type === 'employee';
  const endpoint = isEmployee ? '/users' : '/users/customers';

  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 10,
    total: 0,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Xem chi tiết
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);
  const [orderHistory, setOrderHistory] = useState([]);
  const [orderHistoryLoading, setOrderHistoryLoading] = useState(false);
  const [orderPage, setOrderPage] = useState(1);
  const orderPageSize = 5;

  // Reset mật khẩu
  const [resetLoading, setResetLoading] = useState(null);
  const [newPasswordModal, setNewPasswordModal] = useState({ open: false, password: '', username: '' });

  // Khóa/mở khóa
  const [statusLoading, setStatusLoading] = useState(null);

  const fetchUsers = async (page = 1, pageSize = 10) => {
    try {
      setLoading(true);

      let query = `pageNumber=${page}&pageSize=${pageSize}`;

      if (searchTerm) {
        query += `&searchTerm=${encodeURIComponent(searchTerm)}`;
      }

      if (isEmployee && roleFilter) {
        query += `&role=${roleFilter}`;
      }

      const result = await axiosClient.get(`${endpoint}?${query}`);

      setUsers(result.items || []);
      setPagination((prev) => ({
        ...prev,
        current: page,
        pageSize,
        total: result.totalCount || 0,
      }));
    } catch (error) {
      message.error('Lỗi khi tải danh sách!');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, pagination.pageSize);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchTerm, roleFilter, type]);

  const handleTableChange = (newPagination) => {
    fetchUsers(newPagination.current, newPagination.pageSize);
  };

  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleToggleStatus = async (record) => {
    try {
      setStatusLoading(record.id);
      await axiosClient.put(`/users/${record.id}/status`, { isActive: !record.isActive });
      message.success(record.isActive ? 'Đã khóa tài khoản' : 'Đã mở khóa tài khoản');
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể thay đổi trạng thái tài khoản');
    } finally {
      setStatusLoading(null);
    }
  };

  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchUsers(pagination.current, pagination.pageSize);
  };

  const openDetail = async (record) => {
    setDetailUser(record);
    setDetailOpen(true);
    setOrderHistory([]);
    setOrderPage(1);

    if (!isEmployee) {
      setOrderHistoryLoading(true);
      try {
        const result = await axiosClient.get(`/users/${record.id}/orders?pageNumber=1&pageSize=20`);
        setOrderHistory(result.items || []);
      } catch (error) {
        message.error('Không thể tải lịch sử mua vé của khách hàng này');
      } finally {
        setOrderHistoryLoading(false);
      }
    }
  };

  const handleResetPassword = async (record) => {
    try {
      setResetLoading(record.id);
      const result = await axiosClient.post(`/users/${record.id}/reset-password`);
      setNewPasswordModal({ open: true, password: result.newPassword, username: record.username });
      fetchUsers(pagination.current, pagination.pageSize);
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể reset mật khẩu');
    } finally {
      setResetLoading(null);
    }
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(newPasswordModal.password);
    message.success('Đã sao chép mật khẩu vào khay nhớ tạm!');
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'red';
      case 'Manager':
        return 'orange';
      case 'Director':
        return 'purple';
      case 'Staff':
        return 'blue';
      default:
        return 'default';
    }
  };

  const columns = [
    {
      title: 'Ảnh',
      dataIndex: 'avatarUrl',
      key: 'avatarUrl',
      width: 70,
      render: (url) => <Avatar src={url} icon={<UserOutlined />} />,
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: 150,
    },
    {
      title: 'Họ tên',
      dataIndex: 'fullName',
      key: 'fullName',
      width: 200,
    },
    {
      title: 'Email',
      dataIndex: 'email',
      key: 'email',
      width: 220,
    },
    ...(isEmployee
      ? [
          {
            title: 'Vai trò',
            dataIndex: 'role',
            key: 'role',
            width: 120,
            render: (role) => (
              <Tag color={getRoleColor(role)}>{role}</Tag>
            ),
          },
        ]
      : []),
    {
      title: 'Trạng thái',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 120,
      render: (isActive) => (
        <Tag color={isActive ? 'green' : 'default'}>
          {isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
        </Tag>
      ),
    },
    {
      title: 'Ngày tạo',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 160,
      render: (date) =>
        new Intl.DateTimeFormat('vi-VN', {
          timeZone: 'Asia/Ho_Chi_Minh',
        }).format(new Date(date)),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: isEmployee ? 320 : 260,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small" wrap>
          <Button type="link" icon={<EyeOutlined />} onClick={() => openDetail(record)}>
            Xem
          </Button>

          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>

          {isEmployee && (
            <Popconfirm
              title="Reset mật khẩu?"
              description={`Hệ thống sẽ sinh mật khẩu mới cho "${record.username}". Bạn cần gửi mật khẩu này cho nhân viên thủ công.`}
              onConfirm={() => handleResetPassword(record)}
              okText="Reset"
              cancelText="Hủy"
            >
              <Button type="link" icon={<KeyOutlined />} loading={resetLoading === record.id}>
                Reset MK
              </Button>
            </Popconfirm>
          )}

          <Popconfirm
            title={record.isActive ? "Khóa tài khoản?" : "Mở khóa tài khoản?"}
            description={`Bạn có chắc muốn ${record.isActive ? 'khóa' : 'mở khóa'} tài khoản "${record.username}"?`}
            onConfirm={() => handleToggleStatus(record)}
            okText={record.isActive ? "Khóa" : "Mở khóa"}
            cancelText="Hủy"
            okButtonProps={{ danger: record.isActive }}
          >
            <Button
              type="link"
              danger={record.isActive}
              icon={record.isActive ? <LockOutlined /> : <UnlockOutlined />}
              loading={statusLoading === record.id}
            >
              {record.isActive ? 'Khóa' : 'Mở khóa'}
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <div
        style={{
          marginBottom: 16,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 12,
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <Space wrap>
          <Search
            placeholder="Tìm kiếm username, họ tên, email..."
            allowClear
            enterButton={<SearchOutlined />}
            style={{ width: '100%', maxWidth: 300 }}
            onSearch={(value) => setSearchTerm(value)}
          />

          {isEmployee && (
            <Select
              placeholder="Lọc theo vai trò"
              allowClear
              style={{ width: 150 }}
              onChange={(value) => setRoleFilter(value)}
            >
              <Select.Option value="Admin">Admin</Select.Option>
              <Select.Option value="Manager">Manager</Select.Option>
              <Select.Option value="Staff">Staff</Select.Option>
            </Select>
          )}
        </Space>

        {isEmployee && (
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Thêm nhân viên
          </Button>
        )}
      </div>

      <Table
        columns={columns}
        dataSource={users}
        rowKey={(record) => record.id}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      <UserForm
        open={isModalOpen}
        user={editingUser}
        type={type}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleFormSuccess}
      />

      {/* Drawer xem chi tiết */}
      <Drawer
        title={`Chi tiết ${isEmployee ? 'nhân viên' : 'khách hàng'}`}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        width={isEmployee ? 480 : 720}
      >
        {detailUser && (
          <>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <Avatar size={80} src={detailUser.avatarUrl} icon={<UserOutlined />} />
              <p style={{ marginTop: 8, fontWeight: 600, fontSize: 16 }}>{detailUser.fullName}</p>
            </div>

            <Descriptions bordered column={1} size="small">
              <Descriptions.Item label="Username">{detailUser.username}</Descriptions.Item>
              <Descriptions.Item label="Email">{detailUser.email}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{detailUser.phoneNumber || 'Chưa cập nhật'}</Descriptions.Item>
              {isEmployee && (
                <Descriptions.Item label="Vai trò">
                  <Tag color={getRoleColor(detailUser.role)}>{detailUser.role}</Tag>
                </Descriptions.Item>
              )}
              <Descriptions.Item label="Trạng thái">
                <Tag color={detailUser.isActive ? 'green' : 'default'}>
                  {detailUser.isActive ? 'Hoạt động' : 'Vô hiệu hóa'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Ngày tạo">
                {new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(detailUser.createdAt))}
              </Descriptions.Item>
            </Descriptions>

            {!isEmployee && (
              <div style={{ marginTop: 24 }}>
                <p style={{ fontWeight: 600, marginBottom: 12 }}>Lịch sử mua vé & thanh toán</p>

                {orderHistoryLoading ? (
                  <div style={{ textAlign: 'center', padding: 24 }}>Đang tải...</div>
                ) : orderHistory.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: 24, color: '#999' }}>
                    Khách hàng chưa có đơn đặt vé nào
                  </div>
                ) : (
                  <>
                    {orderHistory
                      .slice((orderPage - 1) * orderPageSize, orderPage * orderPageSize)
                      .map((order) => (
                        <div
                          key={order.id}
                          style={{
                            border: '1px solid #f0f0f0',
                            borderRadius: 8,
                            padding: 16,
                            marginBottom: 12,
                          }}
                        >
                          <div style={{ fontWeight: 600, marginBottom: 8 }}>{order.eventName}</div>

                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px 24px', fontSize: 13 }}>
                            <div><span style={{ color: '#999' }}>Loại vé: </span>{order.ticketTypeName}</div>
                            <div><span style={{ color: '#999' }}>Số lượng: </span>{order.quantity}</div>
                            <div><span style={{ color: '#999' }}>Tổng tiền: </span>{Number(order.totalPrice || 0).toLocaleString('vi-VN')}₫</div>
                            <div><span style={{ color: '#999' }}>Ngày tạo: </span>{new Intl.DateTimeFormat('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).format(new Date(order.createdAt))}</div>
                          </div>

                          <div style={{ marginTop: 8, display: 'flex', gap: 8 }}>
                            <Tag color={orderColorMap[order.orderStatus] || 'default'}>
                              {orderLabelMap[order.orderStatus] || 'N/A'}
                            </Tag>
                            <Tag color={paymentColorMap[order.paymentStatus] || 'default'}>
                              {paymentLabelMap[order.paymentStatus] || 'N/A'}
                            </Tag>
                          </div>
                        </div>
                      ))}

                    {orderHistory.length > orderPageSize && (
                      <div style={{ textAlign: 'center', marginTop: 16 }}>
                        <Pagination
                          current={orderPage}
                          pageSize={orderPageSize}
                          total={orderHistory.length}
                          onChange={(page) => setOrderPage(page)}
                          simple
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </Drawer>

      {/* Modal hiển thị mật khẩu mới sau khi reset */}
      <Modal
        title="Mật khẩu mới đã được tạo"
        open={newPasswordModal.open}
        onCancel={() => setNewPasswordModal({ open: false, password: '', username: '' })}
        footer={[
          <Button key="close" onClick={() => setNewPasswordModal({ open: false, password: '', username: '' })}>
            Đóng
          </Button>,
          <Button key="copy" type="primary" icon={<CopyOutlined />} onClick={handleCopyPassword}>
            Sao chép
          </Button>,
        ]}
      >
        <p>
          Mật khẩu mới cho tài khoản <b>{newPasswordModal.username}</b>:
        </p>
        <div style={{ background: '#f5f5f5', padding: '12px 16px', borderRadius: 8, textAlign: 'center', marginTop: 8 }}>
          <Text copyable={{ text: newPasswordModal.password }} strong style={{ fontSize: 18, letterSpacing: 1 }}>
            {newPasswordModal.password}
          </Text>
        </div>
        <p style={{ marginTop: 12, color: '#999', fontSize: 13 }}>
          Mật khẩu này chỉ hiển thị 1 lần. Vui lòng gửi cho nhân viên qua kênh nội bộ an toàn (không lưu lại nơi công khai).
        </p>
      </Modal>
    </div>
  );
};

export default UserTable;