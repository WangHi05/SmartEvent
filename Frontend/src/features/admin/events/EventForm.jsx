import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, DatePicker, InputNumber, Button, message, Upload } from 'antd';
import { UploadOutlined, LoadingOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import dayjs from 'dayjs';

const { TextArea } = Input;
const { RangePicker } = DatePicker;

/**
 * Component Form tạo/sửa Event
 * Sử dụng Ant Design Modal và Form
 */
const EventForm = ({ visible, onClose, onSuccess, eventData = null }) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const isEdit = !!eventData;

  useEffect(() => {
    if (visible) {
      if (eventData) {
        // Populate form khi edit
        form.setFieldsValue({
          name: eventData.name,
          description: eventData.description,
          location: eventData.location,
          imageUrl: eventData.imageUrl || eventData.ImageUrl || '',
          timeRange: [dayjs(eventData.startTime), dayjs(eventData.endTime)],
          maxCapacity: eventData.maxCapacity,
          basePrice: eventData.basePrice,
          cancellationDeadlineHours: eventData.cancellationDeadlineHours,
        });
      } else {
        form.resetFields();
      }
    }
  }, [visible, eventData, form]);

  // Xử lý khi user chọn file ảnh từ máy
  const handleImageUpload = async (file) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await axiosClient.post('/upload/image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const uploadedUrl = response.data.url;
      form.setFieldsValue({ imageUrl: uploadedUrl });
      message.success('Tải ảnh lên thành công!');
    } catch (error) {
      console.error('Error uploading image:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi tải ảnh lên');
    } finally {
      setUploading(false);
    }

    // Trả về false để Ant Design Upload không tự động submit form upload nội bộ
    return false;
  };

  const handleSubmit = async (values) => {
    setLoading(true);
    try {
      const payload = {
        name: values.name,
        description: values.description || '',
        location: values.location,
        imageUrl: values.imageUrl || '',
        startTime: values.timeRange[0].toISOString(),
        endTime: values.timeRange[1].toISOString(),
        maxCapacity: values.maxCapacity,
        basePrice: values.basePrice,
        cancellationDeadlineHours: values.cancellationDeadlineHours,
      };

      if (isEdit) {
        // Update
        await axiosClient.put(`/events/${eventData.id}`, { id: eventData.id, ...payload });
        message.success('Cập nhật sự kiện thành công!');
      } else {
        // Create
        await axiosClient.post('/events', payload);
        message.success('Tạo sự kiện mới thành công!');
      }

      form.resetFields();
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving event:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu sự kiện');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      title={isEdit ? 'Chỉnh sửa sự kiện' : 'Tạo sự kiện mới'}
      open={visible}
      onCancel={onClose}
      footer={null}
      width={700}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          cancellationDeadlineHours: 48,
          basePrice: 0,
        }}
      >
        <Form.Item
          label="Tên sự kiện"
          name="name"
          rules={[
            { required: true, message: 'Vui lòng nhập tên sự kiện' },
            { max: 200, message: 'Tên không được vượt quá 200 ký tự' },
          ]}
        >
          <Input placeholder="Nhập tên sự kiện" />
        </Form.Item>

        <Form.Item
          label="Mô tả"
          name="description"
          rules={[{ max: 1000, message: 'Mô tả không được vượt quá 1000 ký tự' }]}
        >
          <TextArea rows={4} placeholder="Mô tả chi tiết về sự kiện" />
        </Form.Item>

        <Form.Item
          label="Địa điểm"
          name="location"
          rules={[{ required: true, message: 'Vui lòng nhập địa điểm' }]}
        >
          <Input placeholder="Nhập địa điểm tổ chức" />
        </Form.Item>

        <Form.Item label="Ảnh sự kiện / Banner">
          <Upload
            accept="image/*"
            showUploadList={false}
            beforeUpload={handleImageUpload}
          >
            <Button icon={uploading ? <LoadingOutlined /> : <UploadOutlined />} loading={uploading}>
              {uploading ? 'Đang tải ảnh lên...' : 'Chọn ảnh từ máy'}
            </Button>
          </Upload>
        </Form.Item>

        {/* Vẫn giữ field imageUrl ẩn để lưu giá trị, và cho phép sửa tay nếu cần */}
        <Form.Item
          label="Đường dẫn ảnh (tự động điền sau khi upload)"
          name="imageUrl"
          rules={[
            { max: 500, message: 'Đường dẫn ảnh không được vượt quá 500 ký tự' },
          ]}
        >
          <Input placeholder="URL ảnh sẽ tự động điền sau khi bạn chọn ảnh ở trên" />
        </Form.Item>

        <Form.Item shouldUpdate={(prev, cur) => prev.imageUrl !== cur.imageUrl} noStyle>
          {({ getFieldValue }) => {
            const imageUrl = getFieldValue('imageUrl');

            if (!imageUrl) return null;

            return (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: '#666', marginBottom: 8 }}>
                  Xem trước ảnh:
                </div>
                <img
                  src={imageUrl}
                  alt="Event preview"
                  style={{
                    width: '100%',
                    maxHeight: 180,
                    objectFit: 'cover',
                    borderRadius: 12,
                    border: '1px solid #eee',
                  }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            );
          }}
        </Form.Item>

        <Form.Item
          label="Thời gian diễn ra"
          name="timeRange"
          rules={[{ required: true, message: 'Vui lòng chọn thời gian' }]}
        >
          <RangePicker
            showTime
            format="DD/MM/YYYY HH:mm"
            style={{ width: '100%' }}
            placeholder={['Thời gian bắt đầu', 'Thời gian kết thúc']}
          />
        </Form.Item>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <Form.Item
            label="Sức chứa tối đa"
            name="maxCapacity"
            rules={[
              { required: true, message: 'Vui lòng nhập sức chứa' },
              { type: 'number', min: 1, max: 100000, message: 'Sức chứa từ 1 đến 100,000' },
            ]}
          >
            <InputNumber
              style={{ width: '100%' }}
              placeholder="Nhập sức chứa"
              min={1}
            />
          </Form.Item>
        </div>

        <Form.Item
          label="Thời hạn hủy vé (giờ)"
          name="cancellationDeadlineHours"
          tooltip="Số giờ trước sự kiện mà khách hàng có thể hủy vé"
          rules={[
            { required: true, message: 'Vui lòng nhập thời hạn hủy' },
            { type: 'number', min: 0, max: 720, message: 'Thời hạn từ 0 đến 720 giờ' },
          ]}
        >
          <InputNumber
            style={{ width: '100%' }}
            placeholder="Nhập số giờ (ví dụ: 48)"
            min={0}
          />
        </Form.Item>

        <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
          <Button onClick={onClose} style={{ marginRight: 8 }}>
            Hủy
          </Button>
          <Button type="primary" htmlType="submit" loading={loading}>
            {isEdit ? 'Cập nhật' : 'Tạo mới'}
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default EventForm;