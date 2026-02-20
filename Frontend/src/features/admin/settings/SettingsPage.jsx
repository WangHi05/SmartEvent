import React, { useState, useEffect } from 'react';
import { Card, Form, InputNumber, Switch, Button, Select, Divider, message, Descriptions, Tag } from 'antd';
import { SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import apiClient from '../../../services/apiClient';

const { Option } = Select;

/**
 * Component Settings Page - Cấu hình hệ thống
 * Bao gồm cấu hình chính sách hoàn tiền, hủy vé
 */
const SettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [refundPolicies, setRefundPolicies] = useState([]);
  const [selectedPolicy, setSelectedPolicy] = useState(null);

  useEffect(() => {
    fetchSettings();
    fetchRefundPolicies();
  }, []);

  // Lấy cấu hình hiện tại
  const fetchSettings = async () => {
    try {
      const response = await apiClient.get('/api/settings');
      form.setFieldsValue(response.data);
      setSelectedPolicy(response.data.defaultRefundStrategy);
    } catch (error) {
      console.error('Error fetching settings:', error);
      message.error('Không thể tải cấu hình hệ thống');
    }
  };

  // Lấy danh sách chính sách hoàn tiền
  const fetchRefundPolicies = async () => {
    try {
      const response = await apiClient.get('/api/tickets/refund-policies');
      setRefundPolicies(response.data);
    } catch (error) {
      console.error('Error fetching refund policies:', error);
    }
  };

  // Lưu cấu hình
  const handleSave = async (values) => {
    setLoading(true);
    try {
      await apiClient.put('/api/settings', values);
      message.success('Lưu cấu hình thành công!');
    } catch (error) {
      console.error('Error saving settings:', error);
      message.error(error.response?.data?.message || 'Không thể lưu cấu hình');
    } finally {
      setLoading(false);
    }
  };

  // Lấy thông tin policy được chọn
  const getSelectedPolicyInfo = () => {
    return refundPolicies.find(p => p.type === selectedPolicy);
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>Cấu hình hệ thống</h2>

      <Card title="Chính sách hoàn tiền và hủy vé" style={{ marginBottom: 24 }}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            defaultRefundStrategy: 'Partial',
            defaultCancellationDeadlineHours: 48,
            enableAutoRefund: true,
            refundProcessingFeePercent: 0,
          }}
        >
          <Form.Item
            label="Chính sách hoàn tiền mặc định"
            name="defaultRefundStrategy"
            tooltip="Chọn chính sách hoàn tiền áp dụng chung cho tất cả sự kiện"
            rules={[{ required: true, message: 'Vui lòng chọn chính sách' }]}
          >
            <Select
              placeholder="Chọn chính sách hoàn tiền"
              onChange={(value) => setSelectedPolicy(value)}
            >
              {refundPolicies.map(policy => (
                <Option key={policy.type} value={policy.type}>
                  {policy.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Hiển thị thông tin policy được chọn */}
          {selectedPolicy && getSelectedPolicyInfo() && (
            <Card
              size="small"
              style={{ marginBottom: 16, backgroundColor: '#f6f8fa' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label={<strong>Chính sách</strong>}>
                  <Tag color="blue">{getSelectedPolicyInfo().name}</Tag>
                </Descriptions.Item>
                <Descriptions.Item label={<strong>Mô tả</strong>}>
                  {getSelectedPolicyInfo().description}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          <Divider />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="Thời hạn hủy vé mặc định (giờ)"
              name="defaultCancellationDeadlineHours"
              tooltip="Số giờ trước sự kiện mà khách hàng có thể hủy vé"
              rules={[
                { required: true, message: 'Vui lòng nhập thời hạn' },
                { type: 'number', min: 0, max: 720, message: 'Từ 0 đến 720 giờ' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={720}
                placeholder="Ví dụ: 48"
                addonAfter="giờ"
              />
            </Form.Item>

            <Form.Item
              label="Phí xử lý hoàn tiền (%)"
              name="refundProcessingFeePercent"
              tooltip="Phần trăm phí khấu trừ khi hoàn tiền"
              rules={[
                { type: 'number', min: 0, max: 100, message: 'Từ 0 đến 100%' },
              ]}
            >
              <InputNumber
                style={{ width: '100%' }}
                min={0}
                max={100}
                step={0.1}
                placeholder="Ví dụ: 2.5"
                addonAfter="%"
              />
            </Form.Item>
          </div>

          <Form.Item
            label="Bật hoàn tiền tự động"
            name="enableAutoRefund"
            valuePropName="checked"
            tooltip="Tự động xử lý hoàn tiền khi hủy vé đủ điều kiện"
          >
            <Switch
              checkedChildren="Bật"
              unCheckedChildren="Tắt"
            />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              size="large"
            >
              Lưu cấu hình
            </Button>
          </Form.Item>
        </Form>
      </Card>

      {/* Card hướng dẫn */}
      <Card
        title={<span><InfoCircleOutlined /> Hướng dẫn</span>}
        size="small"
      >
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Full Refund">
            Hoàn 100% giá trị vé khi hủy trước thời hạn quy định
          </Descriptions.Item>
          <Descriptions.Item label="Partial Refund">
            Hoàn tiền theo tỷ lệ: 75% (≥48h), 50% (24-48h), 25% (6-24h), 0% (&lt;6h)
          </Descriptions.Item>
          <Descriptions.Item label="No Refund">
            Không hoàn tiền trong mọi trường hợp (vé khuyến mãi, vé đặc biệt)
          </Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default SettingsPage;
