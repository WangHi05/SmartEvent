import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Switch, message, Popconfirm, Tag, Alert, Card } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import apiClient from '../services/apiClient';
import dayjs from 'dayjs';

const TicketTypesAdmin = ({ eventId }) => {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, mode: 'create', data: null });
  const [form] = Form.useForm();
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);

  // Fetch event details
  const loadEventDetails = async () => {
    try {
      const res = await apiClient.get(`/api/events/${eventId}`);
      setEvent(res.data);
    } catch (err) {
      console.error('Lỗi tải thông tin sự kiện', err);
    }
  };

  const loadTicketTypes = async (page = 1) => {
    if (!eventId) return;
    setLoading(true);
    try {
      const res = await apiClient.get(`/api/events/${eventId}/ticket-types/paged`, {
        params: { pageNumber: page, pageSize }
      });
      setTicketTypes(res.data.data.items || []);
      setTotal(res.data.data.totalCount || 0);
      setPageNum(page);
    } catch (err) {
      message.error('Lỗi tải danh sách loại vé');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEventDetails();
    loadTicketTypes();
  }, [eventId, pageSize]);

  const openModal = (mode, data = null) => {
    setModal({ visible: true, mode, data });
    if (data) {
      form.setFieldsValue({
        name: data.name,
        price: data.price,
        maxCapacity: data.maxCapacity,
        maxPerUser: data.maxPerUser,
        saleStartTime: dayjs(data.saleStartTime),
        saleEndTime: dayjs(data.saleEndTime),
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      });
    } else {
      form.resetFields();
    }
  };

  const closeModal = () => {
    setModal({ visible: false, mode: 'create', data: null });
    form.resetFields();
  };

  const handleSubmit = async (values) => {
    try {
      // Tự set accessType dựa trên loại event
      const accessType = event?.eventMode === 1 ? 1 : 2; // 1 = ONE_TIME, 2 = DAILY_MULTI

      const payload = {
        name: values.name,
        price: values.price,
        maxCapacity: values.maxCapacity,
        maxPerUser: values.maxPerUser,
        saleStartTime: values.saleStartTime.toISOString(),
        saleEndTime: values.saleEndTime.toISOString(),
        displayOrder: values.displayOrder,
        accessType: accessType,
        isActive: values.isActive,
      };

      if (modal.mode === 'create') {
        await apiClient.post(`/api/events/${eventId}/ticket-types`, payload);
        message.success('Tạo loại vé thành công');
      } else {
        await apiClient.put(`/api/ticket-types/${modal.data.id}`, payload);
        message.success('Cập nhật loại vé thành công');
      }

      closeModal();
      loadTicketTypes(pageNum);
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi lưu loại vé');
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await apiClient.delete(`/api/ticket-types/${id}`);
      message.success('Xóa loại vé thành công');
      loadTicketTypes(pageNum);
    } catch (err) {
      message.error(err.response?.data?.message || 'Lỗi khi xóa loại vé');
      console.error(err);
    }
  };

  const isShortDay = event?.eventMode === 1;

  const columns = [
    {
      title: 'Tên',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Giá (VNĐ)',
      dataIndex: 'price',
      key: 'price',
      render: (price) => price.toLocaleString('vi-VN'),
    },
    {
      title: 'Sức chứa',
      key: 'capacity',
      render: (_, record) => `${record.remainingCapacity}/${record.maxCapacity}`,
    },
    {
      title: 'Tối đa/người',
      dataIndex: 'maxPerUser',
      key: 'maxPerUser',
    },
    {
      title: isShortDay ? 'Lượt dùng' : 'Lượt dùng/ngày',
      key: 'usageType',
      render: () => (
        <Tag color={isShortDay ? 'blue' : 'green'}>
          {isShortDay ? '1/1 lần' : 'Linh hoạt'}
        </Tag>
      ),
    },
    {
      title: 'Thời gian bán',
      key: 'saleTime',
      render: (_, record) => (
        <small>
          {dayjs(record.saleStartTime).format('DD/MM HH:mm')} - {dayjs(record.saleEndTime).format('DD/MM HH:mm')}
        </small>
      ),
    },
    {
      title: 'Trạng thái',
      key: 'isActive',
      render: (_, record) => record.isActive ? <Tag color="green">Hoạt động</Tag> : <Tag>Tắt</Tag>,
    },
    {
      title: 'Thao tác',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openModal('edit', record)} />
          <Popconfirm
            title="Xóa loại vé?"
            description="Bạn có chắc chắn muốn xóa?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button type="link" danger size="small" icon={<DeleteOutlined />} />
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <div>
      {/* Thông báo loại event */}
      {event && (
        <Card style={{ marginBottom: 16 }} type="inner" size="small">
          <Alert
            type={isShortDay ? 'info' : 'success'}
            icon={<InfoCircleOutlined />}
            message={
              isShortDay 
                ? '📅 Sự Kiện Ngắn Ngày'
                : `📆 Sự Kiện Dài Ngày (${event.eventDurationDays} ngày)`
            }
            description={
              isShortDay 
                ? 'Vé chỉ có thể check-in 1 lần duy nhất'
                : `Vé có thể check-in ${event.eventDurationDays} lần, mỗi ngày tối đa 1 lần`
            }
            showIcon
          />
        </Card>
      )}

      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal('create')}>
          Thêm loại vé
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={ticketTypes}
        rowKey="id"
        loading={loading}
        pagination={{
          current: pageNum,
          pageSize,
          total,
          onChange: loadTicketTypes,
          showSizeChanger: true,
          pageSizeOptions: ['10', '20', '50'],
        }}
      />

      <Modal
        title={modal.mode === 'create' ? 'Thêm loại vé' : 'Sửa loại vé'}
        open={modal.visible}
        onCancel={closeModal}
        footer={[
          <Button key="cancel" onClick={closeModal}>
            Hủy
          </Button>,
          <Button key="submit" type="primary" onClick={() => form.submit()}>
            {modal.mode === 'create' ? 'Tạo' : 'Cập nhật'}
          </Button>,
        ]}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Tên loại vé"
            name="name"
            rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
            extra={isShortDay ? 'VD: VIP, Student' : `VD: VIP 3 ngày, Normal ${event?.eventDurationDays} ngày`}
          >
            <Input placeholder="Nhập tên loại vé" />
          </Form.Item>

          <Form.Item
            label="Giá (VNĐ)"
            name="price"
            validateTrigger="onChange"
            rules={[
              { required: true, message: 'Vui lòng nhập giá vé' },
              {
                validator: (_, value) => {
                  if (value !== undefined && value !== null) {
                    if (value < 0) {
                      return Promise.reject(new Error('Giá vé không được là số âm'));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Sức chứa tối đa"
            name="maxCapacity"
            validateTrigger="onChange"
            rules={[
              { required: true, message: 'Vui lòng nhập sức chứa' },
              {
                validator: (_, value) => {
                  if (value !== undefined && value !== null) {
                    if (value <= 0) {
                      return Promise.reject(new Error('Sức chứa phải > 0'));
                    }
                    // Kiểm tra không vượt quá sức chứa sự kiện
                    if (event && value > event.maxCapacity) {
                      return Promise.reject(new Error(`Sức chứa không được vượt quá sức chứa sự kiện (${event.maxCapacity})`));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Tối đa/người"
            name="maxPerUser"
            validateTrigger="onChange"
            rules={[
              { required: true, message: 'Vui lòng nhập số vé tối đa' },
              {
                validator: (_, value) => {
                  if (value !== undefined && value !== null) {
                    if (value <= 0) {
                      return Promise.reject(new Error('Số vé tối đa phải > 0'));
                    }
                  }
                  return Promise.resolve();
                }
              }
            ]}
            extra={isShortDay ? 'Số vé tối đa mỗi người mua trong sự kiện' : 'Số vé tối đa mỗi người mua trong sự kiện'}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Thời gian bán" required>
            <Space style={{ width: '100%' }}>
              <Form.Item name="saleStartTime" rules={[{ required: true, message: 'Vui lòng nhập thời gian bắt đầu' }]} style={{ marginBottom: 0, flex: 1 }}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
              <Form.Item name="saleEndTime" rules={[{ required: true, message: 'Vui lòng nhập thời gian kết thúc' }]} style={{ marginBottom: 0, flex: 1 }}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" />
              </Form.Item>
            </Space>
          </Form.Item>

          <Form.Item
            label="Thứ tự hiển thị"
            name="displayOrder"
            initialValue={0}
          >
            <InputNumber style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Hoạt động"
            name="isActive"
            valuePropName="checked"
            initialValue={true}
          >
            <Switch />
          </Form.Item>

          {/* Hiển thị thông tin loại vé */}
          <Alert
            type="warning"
            message={isShortDay ? 'Vé ngắn ngày' : 'Vé dài ngày'}
            description={
              isShortDay 
                ? 'Vé sẽ được tự động set loại ONE_TIME (check-in 1 lần)'
                : `Vé sẽ được tự động set loại DAILY_MULTI (check-in theo ngày, tối đa ${event?.eventDurationDays} lần)`
            }
            showIcon
            style={{ marginTop: 16 }}
          />
        </Form>
      </Modal>
    </div>
  );
};

export default TicketTypesAdmin;
