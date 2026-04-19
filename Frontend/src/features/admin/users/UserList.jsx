import React, { useState, useEffect } from 'react';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined, ExclamationCircleOutlined } from '@ant-design/icons';
import { Table, Button, Input, Space, Tag, Modal, message, Select, Popconfirm } from 'antd';
import UserForm from './UserForm';
import axiosClient from '../../../api/axiosClient';


const { Search } = Input;
const { confirm } = Modal;

const UserList = () => {
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

  // Fetch users từ API
  // Nhận tham số page và pageSize động
  const fetchUsers = async (page = 1, pageSize = 10) => {
    try {
        setLoading(true); // Bật hiệu ứng loading cho bảng xoay xoay đẹp mắt
        
        // Truyền biến động vào URL
        const result = await axiosClient.get(`/users?pageNumber=${page}&pageSize=${pageSize}`);
        
        // Cập nhật dữ liệu vào bảng
        setUsers(result.items || result.data || []); 
        
        // Cập nhật lại thanh Phân trang (Pagination) ở dưới cùng
        setPagination(prev => ({ 
            ...prev, 
            current: page, 
            pageSize: pageSize,
            total: result.totalCount || 0 // Nhớ lấy tổng số bản ghi từ Backend trả về
        }));
    } catch (error) {
        message.error("Lỗi khi tải danh sách người dùng!");
        console.error(error);
    } finally {
        setLoading(false); // Tắt loading
    }
  };

  useEffect(() => {
    fetchUsers(pagination.current, pagination.pageSize);
  }, [searchTerm, roleFilter]);

  // Xử lý thay đổi trang
  const handleTableChange = (newPagination) => {
    fetchUsers(newPagination.current, newPagination.pageSize);
  };

  // Mở modal tạo mới
  const handleCreate = () => {
    setEditingUser(null);
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleEdit = (user) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  // Xóa user
  // Hàm này giờ đây chỉ tập trung vào việc gọi API Xóa
  const executeDelete = async (userId) => {
    try {
      await axiosClient.delete(`/users/${userId}`); 
      message.success('Xóa người dùng thành công');
      fetchUsers(pagination.current, pagination.pageSize); 
    } catch (error) {
      console.error('Lỗi khi gọi API xóa:', error);
      const errorMsg = error.response?.data?.message || 'Không thể xóa người dùng. Vui lòng kiểm tra lại quyền!';
      message.error(errorMsg);
    }
  };

  // Xử lý sau khi save form
  const handleFormSuccess = () => {
    setIsModalOpen(false);
    fetchUsers(pagination.current, pagination.pageSize);
  };

  // Role color mapping
  const getRoleColor = (role) => {
    switch (role) {
      case 'Admin':
        return 'red';
      case 'Manager':
        return 'orange';
      case 'Staff':
        return 'blue';
      default:
        return 'default';
    }
  };

  // Cột của bảng
  const columns = [
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
    {
      title: 'Vai trò',
      dataIndex: 'role',
      key: 'role',
      width: 120,
      render: (role) => (
        <Tag color={getRoleColor(role)}>{role}</Tag>
      ),
    },
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
      render: (date) => new Date(date).toLocaleDateString('vi-VN'),
    },
    {
      title: 'Thao tác',
      key: 'action',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="link"
            icon={<EditOutlined />}
            onClick={() => handleEdit(record)}
          >
            Sửa
          </Button>
          <Popconfirm
            title="Xác nhận xóa"
            description={`Bạn có chắc chắn muốn xóa "${record.username}"?`}
            onConfirm={() => executeDelete(record.id || record.Id)}
            okText="Xóa"
            cancelText="Hủy"
            okButtonProps={{ danger: true }}
          >
            <Button
              type="link"
              danger
              icon={<DeleteOutlined />}
            >
              Xóa
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ margin: 0 }}>Quản lý người dùng</h2>
        <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
          Thêm người dùng
        </Button>
      </div>

      <Space style={{ marginBottom: '16px' }}>
        <Search
          placeholder="Tìm kiếm username, họ tên, email..."
          allowClear
          enterButton={<SearchOutlined />}
          style={{ width: 300 }}
          onSearch={(value) => setSearchTerm(value)}
        />
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
      </Space>

      <Table
        columns={columns}
        dataSource={users}
        rowKey={(record) => record.id || record.Id}
        loading={loading}
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: 1200 }}
      />

      <UserForm
        open={isModalOpen}
        user={editingUser}
        onClose={() => setIsModalOpen(false)}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
};

export default UserList;
