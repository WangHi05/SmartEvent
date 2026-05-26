import React, { useState, useEffect } from 'react';
import { Table, Button, Space, Modal, Form, Input, InputNumber, DatePicker, Switch, Select, message, Popconfirm, Tag, Alert, Card, Divider } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axiosClient from '../api/axiosClient';
import dayjs from 'dayjs';
import { formatVietnamDateTime } from '../utils/vietnamTime';

const TicketTypesAdmin = ({ eventId }) => {
  const [ticketTypes, setTicketTypes] = useState([]);
  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState({ visible: false, mode: 'create', data: null });
  const [form] = Form.useForm();
  const [pageNum, setPageNum] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [total, setTotal] = useState(0);
  const [ticketMode, setTicketMode] = useState(1); // 1=INDIVIDUAL, 2=GROUP
  const [errorMessage, setErrorMessage] = useState(null);
  const [actionMessage, setActionMessage] = useState(null);

  // Ticket mode constants
  const TICKET_MODES = {
    INDIVIDUAL: 1,
    GROUP: 2
  };

  const USAGE_TYPES = {
    ONE_TIME: 1,
    MULTI_DAY: 2
  };

  const QR_MODES = {
    SINGLE_QR: 1,
    SUB_QR: 2
  };

  const PRICE_MODES = {
    PER_TICKET: 1,
    PER_GROUP: 2
  };

  const INDIVIDUAL_PRESETS = ['Vé thường', 'Vé VIP', 'Vé Student', 'Vé Premium', 'Vé Early Bird'];
  const GROUP_PRESETS = ['Vé đoàn thường', 'Vé đoàn VIP', 'Vé đoàn công ty', 'Vé đoàn học sinh'];

  // Fetch event details
const loadEventDetails = async () => {
  try {
      const response = await axiosClient.get(`/events/${eventId}`);
      // Lấy dữ liệu an toàn, bất chấp axios có interceptor hay không
      const eventData = response.data?.data || response.data || response;
      setEvent(eventData);
  } catch (error) {
      console.error("Lỗi tải thông tin sự kiện:", error);
  }
};

// 2. Sửa hàm loadTicketTypes (Khoảng dòng 60)
const loadTicketTypes = async () => {
  try {
      setLoading(true);
      const response = await axiosClient.get(`events/${eventId}/ticket-types`);
      
      // Trích xuất mảng dữ liệu an toàn (Safe Extraction)
      const responseData = response.data || response;
      const itemsList = responseData.items || responseData.data || responseData;
      
      // Đảm bảo dữ liệu đưa vào State luôn là một mảng (Array)
      setTicketTypes(Array.isArray(itemsList) ? itemsList : []);
  } catch (error) {
      console.error("Lỗi tải danh sách loại vé:", error);
      message.error('Không thể tải danh sách loại vé');
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
    setErrorMessage(null);
    if (data) {
      const ticketMode = data.ticketMode || TICKET_MODES.INDIVIDUAL;
      setTicketMode(ticketMode);
      
      form.setFieldsValue({
        ticketMode: ticketMode,
        name: data.name,
        price: data.price,
        quantity: data.quantity,
        maxPerUser: data.maxPerUser,
        usageType: data.usageType,
        minGroupSize: data.minGroupSize,
        maxGroupSize: data.maxGroupSize,
        qrMode: data.qrMode,
        priceMode: data.priceMode,
        saleStartTime: dayjs(data.saleStartTime),
        saleEndTime: dayjs(data.saleEndTime),
        displayOrder: data.displayOrder,
        isActive: data.isActive,
      });
    } else {
      setTicketMode(TICKET_MODES.INDIVIDUAL);
      form.resetFields();
      form.setFieldsValue({
        ticketMode: TICKET_MODES.INDIVIDUAL,
        displayOrder: 0,
        isActive: true,
        usageType: USAGE_TYPES.ONE_TIME,
        minGroupSize: 2,
        maxGroupSize: 50,
        qrMode: QR_MODES.SINGLE_QR,
        priceMode: PRICE_MODES.PER_TICKET
      });
    }
  };

  const closeModal = () => {
    setModal({ visible: false, mode: 'create', data: null });
    form.resetFields();
    setTicketMode(TICKET_MODES.INDIVIDUAL);
    setErrorMessage(null);
  };

  const handleTicketModeChange = (value) => {
    setTicketMode(value);
    // Reset fields theo loại vé
    if (value === TICKET_MODES.INDIVIDUAL) {
      form.setFieldsValue({
        minGroupSize: undefined,
        maxGroupSize: undefined,
        qrMode: undefined,
        priceMode: undefined,
        usageType: USAGE_TYPES.ONE_TIME
      });
    } else {
      form.setFieldsValue({
        usageType: undefined,
        minGroupSize: 2,
        maxGroupSize: 50,
        qrMode: QR_MODES.SINGLE_QR,
        priceMode: PRICE_MODES.PER_TICKET
      });
    }
  };

  const getApiErrorMessage = (err, fallbackMessage) => {
    return (
      err.response?.data?.message ||
      err.response?.data?.error ||
      err.message ||
      fallbackMessage
    );
  };

  const handleSubmit = async (values) => {
    setErrorMessage(null);
    try {
      const payload = {
        ticketMode: values.ticketMode,
        name: values.name,
        price: values.price,
        quantity: values.quantity,
        maxPerUser: values.maxPerUser,
        saleStartTime: values.saleStartTime.toISOString(),
        saleEndTime: values.saleEndTime.toISOString(),
        displayOrder: values.displayOrder,
        isActive: values.isActive,
      };

      // Thêm fields theo loại vé
      if (values.ticketMode === TICKET_MODES.INDIVIDUAL) {
        payload.usageType = values.usageType;
      } else {
        payload.minGroupSize = values.minGroupSize;
        payload.maxGroupSize = values.maxGroupSize;
        payload.qrMode = values.qrMode;
        payload.priceMode = values.priceMode;
      }

      if (modal.mode === 'create') {
        await axiosClient.post(`/events/${eventId}/ticket-types`, payload);
        message.success('Tạo loại vé thành công');
      } else {
        await axiosClient.put(`/ticket-types/${modal.data.id}`, payload);
        message.success('Cập nhật loại vé thành công');
      }

      closeModal();
      loadTicketTypes(pageNum);
    } catch (err) {
      const errorMsg = err.response?.data?.error || err.response?.data?.message || 'Lỗi khi lưu loại vé';
      setErrorMessage(errorMsg);
      console.error(err);
    }
  };

  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/ticket-types/${id}`);
      message.success('Xóa loại vé thành công');
      setActionMessage({
        type: 'success',
        text: 'Xóa loại vé thành công',
      });
      loadTicketTypes(pageNum);
    } catch (err) {
      const errorText = getApiErrorMessage(err, 'Lỗi khi xóa loại vé');
      message.error(errorText);
      setActionMessage({
        type: 'error',
        text: errorText,
      });
      console.error(err);
    }
  };

  const getTicketModeLabel = (mode) => {
    return mode === TICKET_MODES.INDIVIDUAL ? 'Vé cá nhân' : 'Vé đoàn';
  };

  const getUsageTypeLabel = (usageType) => {
    if (usageType === USAGE_TYPES.ONE_TIME) return 'Vé 1 ngày';
    if (usageType === USAGE_TYPES.MULTI_DAY) return `Vé ${event?.eventDurationDays} ngày`;
    return '';
  };

  const getQRModeLabel = (qrMode) => {
    return qrMode === QR_MODES.SINGLE_QR ? '1 mã QR cho đoàn' : 'QR từng thành viên';
  };

  const getPriceModeLabel = (priceMode) => {
    return priceMode === PRICE_MODES.PER_TICKET ? 'Giá/người' : 'Giá nguyên đoàn';
  };

  const columns = [
    {
      title: 'Loại vé',
      dataIndex: 'ticketMode',
      key: 'ticketMode',
      render: (mode) => (
        <Tag color={mode === TICKET_MODES.INDIVIDUAL ? 'blue' : 'green'}>
          {getTicketModeLabel(mode)}
        </Tag>
      ),
      width: 100
    },
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
      width: 120
    },
    {
      title: 'Số lượng / Còn lại',
      key: 'quantity',
      render: (_, record) => `${record.remainingQuantity}/${record.quantity}`,
      width: 150
    },
    {
      title: 'Tối đa/người',
      dataIndex: 'maxPerUser',
      key: 'maxPerUser',
      width: 100
    },
    {
      title: 'Chi tiết',
      key: 'details',
      render: (_, record) => {
        if (record.ticketMode === TICKET_MODES.INDIVIDUAL) {
          return <small>{getUsageTypeLabel(record.usageType)}</small>;
        } else {
          return (
            <small>
              {record.minGroupSize}-{record.maxGroupSize} người | {getQRModeLabel(record.qrMode)} | {getPriceModeLabel(record.priceMode)}
            </small>
          );
        }
      }
    },
    {
      title: 'Thời gian bán',
      key: 'saleTime',
      render: (_, record) => (
        <small>
          {formatVietnamDateTime(record.saleStartTime)} - {formatVietnamDateTime(record.saleEndTime)}
        </small>
      ),
      width: 180
    },
    {
      title: 'Trạng thái',
      key: 'saleStatus',
      render: (_, record) => {
        const status = record.saleStatusName || (record.isActive ? 'Hoạt động' : 'Tắt');
        const color = status === 'Đang mở bán' ? 'green' : status === 'Chưa mở bán' ? 'blue' : status === 'Đã kết thúc' ? 'default' : 'red';
        return <Tag color={color}>{status}</Tag>;
      },
      width: 130
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
      width: 80
    },
  ];

  return (
    <div>
      {actionMessage && (
        <Alert
          type={actionMessage.type}
          message={actionMessage.type === 'success' ? 'Thao tác thành công' : 'Thao tác thất bại'}
          description={actionMessage.text}
          showIcon
          closable
          onClose={() => setActionMessage(null)}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Thông báo loại event */}
      {event && (
        <Card style={{ marginBottom: 16 }} type="inner" size="small">
          <Alert
            type={event.eventMode === 1 ? 'info' : 'success'}
            icon={<InfoCircleOutlined />}
            message={event.eventMode === 1 ? '📅 Sự Kiện Ngắn Ngày' : `📆 Sự Kiện Dài Ngày (${event.eventDurationDays} ngày)`}
            description={event.eventMode === 1 ? 'Vé chỉ có thể check-in 1 lần duy nhất' : `Vé có thể check-in ${event.eventDurationDays} lần, mỗi ngày tối đa 1 lần`}
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
        size="small"
      />

      {/* Modal Form */}
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
        width={700}
      >
        {/* THÔNG BÁO LỖI */}
        {errorMessage && (
          <Alert
            message="⚠️ Lỗi"
            description={errorMessage}
            type="error"
            closable
            onClose={() => setErrorMessage(null)}
            style={{ marginBottom: 16 }}
            showIcon
          />
        )}

        <Form form={form} layout="vertical" onFinish={handleSubmit} autoComplete="off">
          {/* Chọn Loại Vé */}
          <Form.Item
            label="Loại vé *"
            name="ticketMode"
            rules={[{ required: true, message: 'Vui lòng chọn loại vé' }]}
          >
            <Select
              placeholder="Chọn loại vé"
              onChange={handleTicketModeChange}
              options={[
                { label: 'Vé cá nhân', value: TICKET_MODES.INDIVIDUAL },
                { label: 'Vé đoàn', value: TICKET_MODES.GROUP },
              ]}
            />
          </Form.Item>

          <Divider style={{ margin: '12px 0' }} />

          {/* VÉ CÁ NHÂN */}
          {ticketMode === TICKET_MODES.INDIVIDUAL && (
            <>
              <Alert
                type="info"
                message="💳 Vé Cá Nhân"
                description="Bán vé theo người. Có thể lựa chọn sử dụng 1 lần hoặc nhiều ngày."
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item
                label="Tên loại vé *"
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
              >
                <Select
                  placeholder="Chọn tên vé hoặc nhập custom"
                  mode="tags"
                  options={INDIVIDUAL_PRESETS.map(p => ({ label: p, value: p }))}
                  onChange={(value) => {
                    if (value.length > 0) {
                      form.setFieldsValue({ name: value[value.length - 1] });
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                label="Giá (VNĐ) *"
                name="price"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá vé' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value < 0) {
                        return Promise.reject(new Error('Giá vé không được là số âm'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>

              <Form.Item
                label="Số lượng vé *"
                name="quantity"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: 'Vui lòng nhập số lượng' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value !== null) {
                        if (value <= 0) {
                          return Promise.reject(new Error('Số lượng phải > 0'));
                        }
                        if (event && value > event.maxCapacity) {
                          return Promise.reject(new Error(`Không được vượt quá sức chứa sự kiện (${event.maxCapacity})`));
                        }
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>

              <Form.Item
                label="Tối đa/người *"
                name="maxPerUser"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: 'Vui lòng nhập số vé tối đa' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value <= 0) {
                        return Promise.reject(new Error('Số vé tối đa phải > 0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} />
              </Form.Item>

              <Form.Item
                label="Kiểu sử dụng *"
                name="usageType"
                rules={[{ required: true, message: 'Vui lòng chọn kiểu sử dụng' }]}
              >
                <Select
                  placeholder="Chọn kiểu sử dụng"
                  options={[
                    { label: 'Vé 1 ngày (check-in 1 lần)', value: USAGE_TYPES.ONE_TIME },
                    { label: `Vé ${event?.eventDurationDays} ngày (check-in 1 lần/ngày)`, value: USAGE_TYPES.MULTI_DAY },
                  ]}
                />
              </Form.Item>

              {form.getFieldValue('usageType') === USAGE_TYPES.ONE_TIME && (
                <Alert
                  type="warning"
                  message="Check-in 1 lần duy nhất"
                  style={{ marginBottom: 16 }}
                />
              )}

              {form.getFieldValue('usageType') === USAGE_TYPES.MULTI_DAY && (
                <Alert
                  type="info"
                  message={`Check-in tối đa 1 lần mỗi ngày từ ngày bắt đầu đến ngày kết thúc sự kiện (${event?.eventDurationDays} ngày)`}
                  style={{ marginBottom: 16 }}
                />
              )}
            </>
          )}

          {/* VÉ ĐOÀN */}
          {ticketMode === TICKET_MODES.GROUP && (
            <>
              <Alert
                type="success"
                message="👥 Vé Đoàn / Nhóm"
                description="Bán vé theo suất đoàn. Có tối thiểu và tối đa số người trong mỗi đoàn."
                showIcon
                style={{ marginBottom: 16 }}
              />

              <Form.Item
                label="Tên loại vé *"
                name="name"
                rules={[{ required: true, message: 'Vui lòng nhập tên' }]}
              >
                <Select
                  placeholder="Chọn tên vé hoặc nhập custom"
                  mode="tags"
                  options={GROUP_PRESETS.map(p => ({ label: p, value: p }))}
                  onChange={(value) => {
                    if (value.length > 0) {
                      form.setFieldsValue({ name: value[value.length - 1] });
                    }
                  }}
                />
              </Form.Item>

              <Form.Item
                label="Cách tính giá *"
                name="priceMode"
                rules={[{ required: true }]}
              >
                <Select
                  placeholder="Chọn cách tính giá"
                  options={[
                    { label: 'Giá theo mỗi người', value: PRICE_MODES.PER_TICKET },
                    { label: 'Giá nguyên đoàn', value: PRICE_MODES.PER_GROUP },
                  ]}
                />
              </Form.Item>

              <Form.Item
                label="Giá *"
                name="price"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: 'Vui lòng nhập giá' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value < 0) {
                        return Promise.reject(new Error('Giá không được là số âm'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={0} />
              </Form.Item>

              <Form.Item
                label="Số lượng đoàn bán *"
                name="quantity"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: 'Vui lòng nhập số lượng đoàn' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value !== null && value <= 0) {
                        return Promise.reject(new Error('Số lượng đoàn phải > 0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Tối đa bao nhiêu đoàn được bán" />
              </Form.Item>

              <Space style={{ width: '100%' }} size="large">
                <Form.Item
                  label="Người tối thiểu *"
                  name="minGroupSize"
                  validateTrigger="onChange"
                  rules={[
                    { required: true, message: 'Bắt buộc' },
                    {
                      validator: (_, value) => {
                        if (value !== undefined && value < 2) {
                          return Promise.reject(new Error('Tối thiểu 2 người'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                  style={{ flex: 1 }}
                >
                  <InputNumber style={{ width: '100%' }} min={2} />
                </Form.Item>

                <Form.Item
                  label="Người tối đa *"
                  name="maxGroupSize"
                  validateTrigger="onChange"
                  rules={[
                    { required: true, message: 'Bắt buộc' },
                    {
                      validator: (_, value) => {
                        const minValue = form.getFieldValue('minGroupSize');
                        if (value !== undefined && minValue !== undefined && value < minValue) {
                          return Promise.reject(new Error('Phải >= người tối thiểu'));
                        }
                        return Promise.resolve();
                      }
                    }
                  ]}
                  style={{ flex: 1 }}
                >
                  <InputNumber style={{ width: '100%' }} min={2} />
                </Form.Item>
              </Space>

              <Form.Item
                label="QR Mode *"
                name="qrMode"
                rules={[{ required: true }]}
                style={{ marginTop: 16 }}
              >
                <Select
                  placeholder="Chọn cách quét vé"
                  options={[
                    { label: '1 mã QR cho cả đoàn', value: QR_MODES.SINGLE_QR },
                    { label: 'QR riêng từng thành viên', value: QR_MODES.SUB_QR },
                  ]}
                />
              </Form.Item>

              {form.getFieldValue('qrMode') === QR_MODES.SUB_QR && (
                <Alert
                  type="info"
                  message="Hệ thống sẽ tạo SubTicket cho từng thành viên"
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item
                label="Tối đa đoàn/người mua *"
                name="maxPerUser"
                validateTrigger="onChange"
                rules={[
                  { required: true, message: 'Bắt buộc' },
                  {
                    validator: (_, value) => {
                      if (value !== undefined && value <= 0) {
                        return Promise.reject(new Error('Phải > 0'));
                      }
                      return Promise.resolve();
                    }
                  }
                ]}
              >
                <InputNumber style={{ width: '100%' }} min={1} placeholder="Số đoàn tối đa mỗi khách hàng mua" />
              </Form.Item>
            </>
          )}

          <Divider style={{ margin: '12px 0' }} />

          {/* Thời gian bán */}
          <Form.Item label="Thời gian bán" required>
            <Space style={{ width: '100%' }} size="large">
              <Form.Item name="saleStartTime" rules={[{ required: true, message: 'Vui lòng nhập thời gian bắt đầu' }]} style={{ marginBottom: 0, flex: 1 }}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" placeholder="Từ" />
              </Form.Item>
              <Form.Item name="saleEndTime" rules={[{ required: true, message: 'Vui lòng nhập thời gian kết thúc' }]} style={{ marginBottom: 0, flex: 1 }}>
                <DatePicker showTime format="DD/MM/YYYY HH:mm" placeholder="Đến" />
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
        </Form>
      </Modal>
    </div>
  );
};

export default TicketTypesAdmin;
