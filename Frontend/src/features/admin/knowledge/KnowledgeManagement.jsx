import React, { useState, useEffect } from 'react';
import { Table, Button, Modal, Form, Input, Space, Popconfirm, message, Typography, Card } from 'antd';
import { PlusOutlined, DeleteOutlined, ReloadOutlined, EditOutlined } from '@ant-design/icons';
import { BrainCircuit } from 'lucide-react';
import axiosClient from '../../../api/axiosClient';

const { Title, Text, Paragraph } = Typography;

const KnowledgeManagement = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form] = Form.useForm();

  // Chế độ modal: 'add' hoặc 'edit'
  const [modalMode, setModalMode] = useState('add');
  const [editingRecord, setEditingRecord] = useState(null);

  // Gọi API lấy danh sách tài liệu
  const fetchKnowledge = async () => {
    setLoading(true);
    try {
      const response = await axiosClient.get('/admin/chatbot/knowledge');
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

  const openAddModal = () => {
    setModalMode('add');
    setEditingRecord(null);
    form.resetFields();
    setIsModalVisible(true);
  };

  const openEditModal = (record) => {
    setModalMode('edit');
    setEditingRecord(record);
    form.setFieldsValue({ title: record.title, content: record.content });
    setIsModalVisible(true);
  };

  // Xử lý Thêm mới hoặc Cập nhật
  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (modalMode === 'edit' && editingRecord) {
        await axiosClient.put(`/admin/chatbot/knowledge/${editingRecord.id}`, {
          title: values.title,
          content: values.content,
        });
        message.success('Đã cập nhật tài liệu thành công!');
      } else {
        await axiosClient.post('/admin/chatbot/ingest', {
          title: values.title,
          content: values.content,
        });
        message.success('Đã nạp kiến thức mới cho AI thành công!');
      }
      setIsModalVisible(false);
      form.resetFields();
      setEditingRecord(null);
      fetchKnowledge();
    } catch (error) {
      console.error('Lỗi khi lưu tri thức:', error);
      message.error(error.response?.data?.message || 'Có lỗi xảy ra khi lưu.');
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
      width: 160,
      align: 'center',
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            icon={<EditOutlined size={18} className="text-blue-500" />}
            onClick={() => openEditModal(record)}
          />
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
        </Space>
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
            onClick={openAddModal}
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
            {modalMode === 'edit' ? 'Sửa kiến thức đã nạp' : 'Dạy AI Kiến thức mới'}
          </div>
        }
        open={isModalVisible}
        onCancel={() => {
          setIsModalVisible(false);
          form.resetFields();
          setEditingRecord(null);
        }}
        onOk={() => form.submit()}
        confirmLoading={submitting}
        okText={modalMode === 'edit' ? 'Lưu thay đổi (Vectorize lại)' : 'Lưu & Huấn luyện (Vectorize)'}
        cancelText="Hủy"
        okButtonProps={{ className: 'bg-orange-600 hover:bg-orange-700' }}
        width={700}
      >
        <div className="bg-orange-50 p-4 rounded-lg mb-6 border border-orange-100 text-sm text-gray-700">
          <strong>💡 Mẹo:</strong> Hãy viết nội dung thật rõ ràng, mạch lạc. AI sẽ dựa vào độ dài và từ khóa của bạn để tìm kiếm câu trả lời khi Admin hỏi.
          {modalMode === 'edit' && (
            <> <br />Khi lưu, hệ thống sẽ tính lại vector embedding mới cho nội dung này.</>
          )}
        </div>

        <Form form={form} layout="vertical" onFinish={handleSubmit}>
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