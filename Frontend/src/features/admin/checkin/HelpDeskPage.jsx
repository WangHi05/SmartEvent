import React, { useState } from 'react';
import { Card, Input, InputNumber,Button, Table, Tag, Space, message, Modal, Form, Tooltip } from 'antd';
import { SearchOutlined, RetweetOutlined, CheckCircleOutlined, SafetyCertificateOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';
import useAuthStore from '../../../store/useAuthStore';

const { Search } = Input;

const HelpDeskPage = () => {
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  
  const user = useAuthStore((state) => state.user);
  
  // States cho Modal Xử lý sự cố
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [actionType, setActionType] = useState(''); // 'revoke' | 'manual-checkin'
  
  const [form] = Form.useForm();

  // Hàm gọi API tìm kiếm
  const handleSearch = async (keyword) => {
    if (!keyword) {
      message.warning('Vui lòng nhập số điện thoại, CCCD hoặc tên để tìm kiếm');
      return;
    }
    
    setLoading(true);
    try {
      const response = await axiosClient.get(`/helpdesk/search`, { params: { keyword } });
      setTickets(response.data || response);
      if (response.length === 0) message.info('Không tìm thấy vé nào khớp với thông tin!');
    } catch (error) {
      message.error('Lỗi khi tìm kiếm vé');
    } finally {
      setLoading(false);
    }
  };

  // Mở modal xác nhận
  const openActionModal = (record, type) => {
    setSelectedTicket(record);
    setActionType(type);
    form.resetFields();
    setIsModalVisible(true);
  };

  // Submit xử lý (Gọi API)
  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);
      
      const payload = {
        reason: values.reason,
        // Sử dụng Username hoặc ID của người đang đăng nhập thực tế để ghi Audit Log
        actionBy: user?.username || user?.fullName || 'System_Admin',
        peopleCount: values.peopleCount || 1
      };

      if (actionType === 'revoke') {
        // Gọi API Revoke & Reissue (Sự cố 1 & 2)
        await axiosClient.post(`/helpdesk/tickets/${selectedTicket.ticketId}/revoke-reissue`, payload);
        message.success('Đã thu hồi vé cũ và cấp thẻ mới thành công!');
      } else {
        // Gọi API Check-in thủ công
        await axiosClient.post(`/helpdesk/tickets/${selectedTicket.ticketId}/manual-checkin`, payload);
        message.success(`Check-in thủ công thành công ${payload.peopleCount} lượt!`);
      }

      setIsModalVisible(false);
      // Refresh lại danh sách (tìm kiếm lại bằng CCCD cũ)
      handleSearch(selectedTicket.buyerCccd || selectedTicket.buyerPhone);
      
    } catch (error) {
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi thực hiện!');
    } finally {
      setLoading(false);
    }
  };

  // Định nghĩa cột cho Bảng
  const columns = [
    {
      title: 'Tên khách hàng',
      dataIndex: 'buyerName',
      key: 'buyerName',
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'SĐT / CCCD',
      key: 'contactInfo',
      render: (_, record) => (
        <div>
          <div>📞 {record.buyerPhone}</div>
          {record.buyerCccd ? (
            <div className="text-emerald-600"><SafetyCertificateOutlined /> {record.buyerCccd}</div>
          ) : (
            <div className="text-slate-400 italic">Không có CCCD</div>
          )}
        </div>
      )
    },
    {
      title: 'Sự kiện & Loại vé',
      key: 'eventInfo',
      render: (_, record) => (
        <div>
          <div className="font-semibold text-slate-800">{record.eventName}</div>
          <div className="text-sm text-slate-500">{record.ticketTypeName}</div>
        </div>
      )
    },
    {
        title: 'Trạng thái',
        dataIndex: 'ticketStatus',
        key: 'ticketStatus',
        render: (status) => {
          const safeStatus = String(status || '').toUpperCase();
          
          let color = 'default';
          let text = 'Không xác định';
  
          if (safeStatus === '1' || safeStatus === 'ACTIVE') {
            color = 'blue';
            text = 'Chưa Check-in';
          } else if (safeStatus === '2' || safeStatus === 'CHECKED_IN' || safeStatus === 'USED') {
            color = 'green';
            text = 'Đã vào cổng';
          } else if (safeStatus === '3' || safeStatus === 'CANCELLED') {
            color = 'red';
            text = 'Đã thu hồi / Hủy';
          }
  
          return <Tag color={color}>{text}</Tag>;
        }
    },
    {
        title: 'Hành động (Help Desk)',
        key: 'action',
        render: (_, record) => {
          const isActive = record.ticketStatus?.toUpperCase() === 'ACTIVE';
  
          return (
            <Space size="small">
              <Tooltip title="Khách mất thẻ hoặc nghi ngờ lộ mã QR">
                <Button 
                  type="primary" 
                  danger 
                  icon={<RetweetOutlined />} 
                  disabled={!isActive}
                  onClick={() => openActionModal(record, 'revoke')}
                >
                  Thu hồi & Cấp lại
                </Button>
              </Tooltip>
              
              <Tooltip title="Khách không có mạng, Check-in tay qua Web">
                <Button 
                  className="border-emerald-500 text-emerald-500 hover:bg-emerald-50"
                  icon={<CheckCircleOutlined />}
                  disabled={!isActive}
                  onClick={() => openActionModal(record, 'manual-checkin')}
                >
                  Check-in Thủ công
                </Button>
              </Tooltip>
            </Space>
          );
        },
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Quản lý Sự cố (Help Desk)</h1>
          <p className="text-slate-500">Tra cứu và hỗ trợ khách hàng gặp sự cố mất điện thoại, mất thẻ, hoặc lỗi quét QR.</p>
        </div>
      </div>

      <Card className="!rounded-2xl shadow-sm border-slate-200">
        <div className="max-w-2xl mx-auto py-4">
          <Search
            placeholder="Nhập số điện thoại, CCCD hoặc tên khách hàng..."
            allowClear
            enterButton={<Button type="primary" icon={<SearchOutlined />}>Tìm kiếm</Button>}
            size="large"
            onSearch={handleSearch}
            loading={loading}
          />
        </div>
      </Card>

      <Card className="!rounded-2xl shadow-sm border-slate-200" styles={{ body: { padding: 0 } }}>
        <Table 
          columns={columns} 
          dataSource={tickets} 
          rowKey="ticketId"
          pagination={{ pageSize: 10 }}
          loading={loading}
          locale={{ emptyText: 'Chưa có dữ liệu. Hãy tìm kiếm!' }}
          scroll={{ x: 900 }}
        />
      </Card>

      <Modal
        title={actionType === 'revoke' ? "⚠️ Xác nhận Thu hồi & Cấp vé mới" : "✅ Check-in Thủ công"}
        open={isModalVisible}
        onOk={handleModalSubmit}
        onCancel={() => setIsModalVisible(false)}
        confirmLoading={loading}
        okText="Xác nhận thực hiện"
        cancelText="Hủy bỏ"
        okButtonProps={{ danger: actionType === 'revoke' }}
      >
        <div className="mb-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <p><strong>Khách hàng:</strong> {selectedTicket?.buyerName}</p>
          <p><strong>Sự kiện:</strong> {selectedTicket?.eventName}</p>
          {actionType === 'revoke' && (
            <p className="text-red-500 mt-2 text-sm">
              * Hành động này sẽ vô hiệu hóa thẻ/mã QR cũ. Hệ thống sẽ sinh ra một thẻ mới hoàn toàn. Vui lòng in lại thẻ vật lý (nếu có) cho khách.
            </p>
          )}
        </div>
            
        <Form form={form} layout="vertical">
          {/* Chỉ hiển thị chọn số lượng nếu là thao tác check-in */}
          {actionType === 'manual-checkin' && (
            <Form.Item
              name="peopleCount"
              label="Số lượng khách Check-in"
              rules={[{ required: true, message: 'Vui lòng nhập số lượng!' }]}
              initialValue={1}
            >
              <InputNumber 
                min={1} 
                max={selectedTicket?.remainingSlots || 1} // Giới hạn bằng số vé còn lại của đoàn
                style={{ width: '100%' }} 
                size="large"
              />
            </Form.Item>
          )}

          <Form.Item
            name="reason"
            label="Lý do thực hiện (Bắt buộc để ghi Log)"
            rules={[{ required: true, message: 'Vui lòng nhập lý do để lưu Audit Log!' }]}
          >
            <Input.TextArea 
              rows={3} 
              placeholder={actionType === 'revoke' ? "VD: Khách làm mất thẻ đeo cổ..." : "VD: Máy quét lỗi, khách đã trình CCCD..."} 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default HelpDeskPage;