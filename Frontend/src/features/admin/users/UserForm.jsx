import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message } from 'antd';
import axiosClient from '../../../api/axiosClient';
import AvatarUpload from './AvatarUpload';

const UserForm = ({ open, user, type = 'employee', onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const isEdit = !!user;
  const isEmployee = type === 'employee';

  useEffect(() => {
    if (open) {
      if (user) {
        form.setFieldsValue({
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          isActive: user.isActive,
          avatarUrl: user.avatarUrl,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, user, form]);

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        const updateData = {
          id: user.id,
          fullName: values.fullName,
          email: values.email,
          phoneNumber: values.phoneNumber,
          isActive: values.isActive,
          avatarUrl: values.avatarUrl,
        };
        if (isEmployee) {
          updateData.role = values.role;
        }
        if (values.newPassword) {
          updateData.newPassword = values.newPassword;
        }
        await axiosClient.put(`/users/${user.id}`, updateData);
        message.success('Cập nhật thành công');
      } else {
        const createData = {
          username: values.username,
          password: values.password,
          fullName: values.fullName,
          email: values.email,
          role: values.role,
          avatarUrl: values.avatarUrl,
        };
        await axiosClient.post('/users', createData);
        message.success('Tạo nhân viên thành công');
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      const errorMessage =
        error.response?.data?.message ||
        (isEdit ? 'Không thể cập nhật người dùng' : 'Không thể tạo người dùng');
      message.error(errorMessage);
      console.error('Error saving user:', error);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={isEdit ? `Chỉnh sửa ${isEmployee ? 'nhân viên' : 'khách hàng'}` : 'Thêm nhân viên mới'}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      okText={isEdit ? 'Cập nhật' : 'Tạo mới'}
      cancelText="Hủy"
      width={600}
    >
      <Form form={form} layout="vertical" onFinish={handleSubmit}>
        <Form.Item
        name="avatarUrl"
        label={<div style={{ width: '100%', textAlign: 'center' }}>Ảnh đại diện</div>}
        rules={
          isEmployee && !isEdit
            ? [{ required: true, message: 'Ảnh đại diện là bắt buộc đối với nhân viên' }]
            : []
        }
      >
        <AvatarUpload required={isEmployee} />
      </Form.Item>

        {isEdit && (
          <Form.Item name="username" label="Username">
            <Input disabled />
          </Form.Item>
        )}

        {!isEdit && (
          <Form.Item
            name="username"
            label="Username"
            rules={[
              { required: true, message: 'Vui lòng nhập username' },
              { min: 3, max: 50, message: 'Username phải từ 3-50 ký tự' },
            ]}
          >
            <Input placeholder="Nhập username" />
          </Form.Item>
        )}

        {!isEdit && (
          <Form.Item
            name="password"
            label="Mật khẩu"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu' },
              { min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' },
            ]}
          >
            <Input.Password placeholder="Nhập mật khẩu" />
          </Form.Item>
        )}

        {isEdit && (
          <Form.Item
            name="newPassword"
            label="Mật khẩu mới (để trống nếu không đổi)"
            rules={[{ min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' }]}
          >
            <Input.Password placeholder="Nhập mật khẩu mới (nếu muốn đổi)" />
          </Form.Item>
        )}

        <Form.Item
          name="fullName"
          label="Họ và tên"
          rules={[
            { required: true, message: 'Vui lòng nhập họ tên' },
            { max: 100, message: 'Họ tên tối đa 100 ký tự' },
          ]}
        >
          <Input placeholder="Nhập họ và tên đầy đủ" />
        </Form.Item>

        <Form.Item
          name="email"
          label="Email"
          rules={[
            { required: true, message: 'Vui lòng nhập email' },
            { type: 'email', message: 'Email không hợp lệ' },
          ]}
        >
          <Input placeholder="Nhập địa chỉ email" />
        </Form.Item>

        <Form.Item name="phoneNumber" label="Số điện thoại">
          <Input placeholder="Nhập số điện thoại" />
        </Form.Item>

        {isEmployee && (
          <Form.Item
            name="role"
            label="Vai trò"
            rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
          >
            <Select placeholder="Chọn vai trò">
              <Select.Option value="Admin">Admin</Select.Option>
              <Select.Option value="Director">Giám đốc</Select.Option>
              <Select.Option value="Manager">Manager</Select.Option>
              <Select.Option value="Staff">Staff</Select.Option>
            </Select>
          </Form.Item>
        )}

        {isEdit && (
          <Form.Item name="isActive" label="Trạng thái" valuePropName="checked">
            <Switch checkedChildren="Hoạt động" unCheckedChildren="Vô hiệu hóa" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default UserForm;