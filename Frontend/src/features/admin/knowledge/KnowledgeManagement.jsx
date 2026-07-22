import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Typography, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined } from '@ant-design/icons';
import { BrainCircuit } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

const { Title, Text, Paragraph } = Typography;

const KnowledgeManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Gọi API lấy danh sách tài liệu
  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      // Đường dẫn API trùng khớp với Controller vừa viết
      const response = await axiosClient.get('/admin/chatbot/knowledge');
      // axiosClient đã tự động trả về response.data nhờ Interceptor
      setData(response || []);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);
      message.error('Không thể tải danh sách tri thức. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKnowledge();
  }, []);

  // Xử lý Thêm mới (Ingest)
  const handleAddSubmit = async (values) => {
    setSubmitting(true);
    try {
      await axiosClient.post('/admin/chatbot/ingest', {
        title: values.title,
        content: values.content,
      });
      message.success('Đã nạp kiến thức mới cho AI thành công!');
      setIsModalVisible(false);
      form.resetFields();
      fetchKnowledge(); // Cập nhật lại bảng
    } catch (error) {
      console.error('Lỗi khi nạp kiến thức:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi nạp kiến thức.');
    } finally {
      setSubmitting(false);
    }
  };

  // Xử lý Xóa
  const handleDelete = async (id) => {
    try {
      await axiosClient.delete(`/admin/chatbot/knowledge/${id}`);
      message.success('Đã xóa tài liệu thành công!');
      fetchKnowledge();
    } catch (error) {
      console.error('Lỗi khi xóa:', error);
      message.error(error.response?.data?.message || 'Không thể xóa tài liệu này.');
    }
  };

  const columns = [
    {
      title: 'Tiêu đề (Chủ đề)',
      dataIndex: 'title',
      key: 'title',
      width: '30%',
      render: (text) => <strong className="text-gray-800">{text}</strong>,
    },
    {
      title: 'Nội dung chi tiết (Được AI đọc)',
      dataIndex: 'content',
      key: 'content',
      render: (text) => (
        <Paragraph ellipsis={{ rows: 2, expandable: true, symbol: 'Đọc thêm' }} className="m-0 text-gray-600">
          {text}
        </Paragraph>
      ),
    },
    {
      title: 'Thao tác',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, record) => (
        <Popconfirm
          title="Xác nhận xóa tài liệu?"
          description="AI sẽ mất đi kiến thức này ngay lập tức. Bạn có chắc không?"
          onConfirm={() => handleDelete(record.id)}
          okText="Xóa ngay"
          cancelText="Hủy"
          okButtonProps={{ danger: true }}
        >
          <Button type="text" danger icon={<DeleteOutlined size={18} className="text-red-500" />} />
        </Popconfirm>
      ),
    },
  ];

  return (
    <div className="space-y-6 fade-in-up">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Title level={2} className="!mb-1 flex items-center">
            <BrainCircuit className="mr-3 text-orange-500" size={32} />
            Quản lý Tri thức AI
          </Title>
          <Text type="secondary">
            Dạy cho AI những chính sách, quy định mới nhất của hệ thống (RAG Vector Database).
          </Text>
        </div>
        <Space>
          <Button 
            icon={<ReloadOutlined size={16} />} 
            onClick={fetchKnowledge} 
            loading={loading}
          >
            Làm mới
          </Button>
          <Button
            type="primary"
            className="bg-orange-600 hover:bg-orange-700"
            icon={<PlusOutlined size={16} />}
            onClick={() => setIsModalVisible(true)}
          >
            Nạp tri thức mới
          </Button>
        </Space>
      </div>

      <Card className="rounded-xl shadow-sm border border-gray-100" bodyStyle={{ padding: 0 }}>
        <Table
          columns={columns}
          dataSource={data}
          rowKey="id"
          loading={loading}
          pagination={{ pageSize: 10, showTotal: (total) => `Tổng cộng ${total} tài liệu` }}
          className="custom-table"
          scroll={{ x: 700 }}
        />
      </Card>

      <Modal
        title={
          <div className="flex items-center text-orange-600">
            <BrainCircuit className="mr-2" size={24} />
            Dạy AI Kiến thức mới
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText="Lưu & Huấn luyện (Vectorize)"
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-orange-600 hover:bg-orange-700' }}
        width={700}
      >
        <div className="bg-orange-50 p-4 rounded-lg mb-6 border border-orange-100 text-sm text-gray-700">
          <strong>💡 Mẹo:</strong> Hãy viết nội dung thật rõ ràng, mạch lạc. AI sẽ dựa vào độ dài và từ khóa của bạn để tìm kiếm câu trả lời khi Admin hỏi.
        </div>
        
        <Form form={form} layout="vertical" onFinish={handleAddSubmit}>
          <Form.Item
            name="title"
            label="Tiêu đề (Chủ đề tài liệu)"
            rules={[
              { required: true, message: 'Vui lòng nhập tiêu đề' },
              { max: 200, message: 'Tiêu đề không được vượt quá 200 ký tự' }
            ]}
          >
            <Input placeholder="Ví dụ: Chính sách hoàn hủy vé VIP năm 2026..." size="large" />
          </Form.Item>

          <Form.Item
            name="content"
            label="Nội dung chi tiết (Văn bản huấn luyện)"
            rules={[
              { required: true, message: 'Vui lòng nhập nội dung' },
              { min: 20, message: 'Nội dung quá ngắn, AI sẽ khó hiểu. Hãy viết chi tiết hơn.' }
            ]}
          >
            <Input.TextArea 
              rows={8} 
              placeholder="Nhập toàn bộ nội dung chính sách vào đây. Ví dụ: Khách hàng mua vé VIP sẽ được hoàn 100% nếu hủy trước 7 ngày..." 
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
};

export default KnowledgeManagement;