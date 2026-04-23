import React, { useEffect } from 'react';
import { Modal, Form, Input, Select, Switch, message } from 'antd';
import axiosClient from '../../../api/axiosClient';

const UserForm = ({ open, user, onClose, onSuccess }) => {
  const [form] = Form.useForm();
  const isEdit = !!user;

  useEffect(() => {
    if (open) {
      if (user) {
        // Chế độ edit - điền sẵn dữ liệu
        form.setFieldsValue({
          username: user.username,
          fullName: user.fullName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        });
      } else {
        // Chế độ create - reset form
        form.resetFields();
      }
    }
  }, [open, user, form]);

  const handleSubmit = async (values) => {
    try {
      if (isEdit) {
        // Update user
        const updateData = {
          id: user.id,
          username: user.username,
          fullName: values.fullName,
          email: values.email,
          role: values.role,
          isActive: values.isActive,
        };
        
        // Chỉ gửi password nếu có thay đổi
        if (values.newPassword) {
          updateData.newPassword = values.newPassword;
        }
        await axiosClient.put(`/users/${user.id}`, updateData);
        message.success('Cập nhật người dùng thành công');
      } else {
        // Create user
        const createData = {
          username: values.username,
          password: values.password,
          fullName: values.fullName,
          email: values.email,
          role: values.role,
        };

        await axiosClient.post('/users', createData);
        message.success('Tạo người dùng thành công');
      }

      form.resetFields();
      onSuccess();
    } catch (error) {
      const errorMessage = error.response?.data?.message || 
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
      title={isEdit ? 'Chỉnh sửa người dùng' : 'Thêm người dùng mới'}
      open={open}
      onOk={() => form.submit()}
      onCancel={handleCancel}
      okText={isEdit ? 'Cập nhật' : 'Tạo mới'}
      cancelText="Hủy"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        <Form.Item
          name="username"
          label="Username"
          rules={[
            { required: !isEdit, message: 'Vui lòng nhập username' },
            { min: 3, max: 50, message: 'Username phải từ 3-50 ký tự' },
          ]}
        >
          <Input 
            placeholder="Nhập username" 
            disabled={isEdit} // Không cho sửa username khi edit
          />
        </Form.Item>

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
            rules={[
              { min: 6, message: 'Mật khẩu phải ít nhất 6 ký tự' },
            ]}
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

        <Form.Item
          name="role"
          label="Vai trò"
          rules={[{ required: true, message: 'Vui lòng chọn vai trò' }]}
        >
          <Select placeholder="Chọn vai trò">
            <Select.Option value="Admin">Admin</Select.Option>
            <Select.Option value="Manager">Manager</Select.Option>
            <Select.Option value="Staff">Staff</Select.Option>
            <Select.Option value="Customer">Customer</Select.Option>
          </Select>
        </Form.Item>

        {isEdit && (
          <Form.Item
            name="isActive"
            label="Trạng thái"
            valuePropName="checked"
          >
            <Switch 
              checkedChildren="Hoạt động" 
              unCheckedChildren="Vô hiệu hóa" 
            />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
};

export default UserForm;
