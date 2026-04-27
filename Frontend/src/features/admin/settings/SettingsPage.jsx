import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  InputNumber,
  Switch,
  Button,
  Select,
  Divider,
  message,
  Descriptions,
} from 'antd';
import { ReloadOutlined, SaveOutlined, InfoCircleOutlined } from '@ant-design/icons';
import axiosClient from '../../../api/axiosClient';

const REFUND_POLICY_OPTIONS = [
  { label: 'Hoàn 100% (Full Refund)', value: '1' },
  { label: 'Hoàn một phần theo thời gian (Partial Refund)', value: '2' },
  { label: 'Không hoàn tiền (No Refund)', value: '3' },
];

const SettingsPage = () => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await axiosClient.get('/settings');
      const settingsList = response.data || response;
      const settingsMap = {};

      (settingsList || []).forEach((setting) => {
        settingsMap[setting.settingKey] = setting.settingValue;
      });

      form.setFieldsValue({
        RefundPolicy: settingsMap.RefundPolicy || '2',
        CancelHoursBeforeEvent: Number(settingsMap.CancelHoursBeforeEvent || 24),
        RefundFeePercent: Number(settingsMap.RefundFeePercent || 2.5),
        AutoRefund: settingsMap.AutoRefund === 'true',
      });
    } catch (error) {
      message.error('Không thể tải cấu hình hệ thống');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (values) => {
    try {
      setSaving(true);
      await Promise.all([
        axiosClient.put('/settings/RefundPolicy', { value: String(values.RefundPolicy) }),
        axiosClient.put('/settings/CancelHoursBeforeEvent', { value: String(values.CancelHoursBeforeEvent) }),
        axiosClient.put('/settings/RefundFeePercent', { value: String(values.RefundFeePercent) }),
        axiosClient.put('/settings/AutoRefund', { value: values.AutoRefund ? 'true' : 'false' }),
      ]);
      message.success('Lưu cấu hình thành công');
      await fetchSettings();
    } catch (error) {
      message.error(error.response?.data?.message || 'Không thể lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '24px', maxWidth: 1200, margin: '0 auto' }}>
      <h2 style={{ marginBottom: 24 }}>Cấu hình hệ thống</h2>

      <Card
        title="Chính sách hoàn tiền và hủy vé"
        style={{ marginBottom: 24 }}
        loading={loading}
        extra={
          <Button icon={<ReloadOutlined />} onClick={fetchSettings}>
            Làm mới
          </Button>
        }
      >
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item
            label="* Chính sách hoàn tiền mặc định"
            name="RefundPolicy"
            rules={[{ required: true, message: 'Vui lòng chọn chính sách' }]}
          >
            <Select placeholder="Chọn chính sách hoàn tiền" options={REFUND_POLICY_OPTIONS} />
          </Form.Item>

          <Divider />

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <Form.Item
              label="* Thời hạn hủy vé tối thiểu (giờ)"
              name="CancelHoursBeforeEvent"
              rules={[
                { required: true, message: 'Vui lòng nhập thời hạn' },
                { type: 'number', min: 0, max: 720, message: 'Từ 0 đến 720 giờ' },
              ]}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={720} addonAfter="giờ" />
            </Form.Item>

            <Form.Item
              label="Phí xử lý hoàn tiền (%)"
              name="RefundFeePercent"
              rules={[{ type: 'number', min: 0, max: 100, message: 'Từ 0 đến 100%' }]}
            >
              <InputNumber style={{ width: '100%' }} min={0} max={100} step={0.1} addonAfter="%" />
            </Form.Item>
          </div>

          <Form.Item label="Bật hoàn tiền tự động" name="AutoRefund" valuePropName="checked">
            <Switch checkedChildren="Bật" unCheckedChildren="Tắt" />
          </Form.Item>

          <Divider />

          <Form.Item style={{ marginBottom: 0 }}>
            <Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={saving} size="large">
              Lưu cấu hình
            </Button>
          </Form.Item>
        </Form>
      </Card>

      <Card title={<span><InfoCircleOutlined /> Hướng dẫn</span>} size="small">
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Full Refund">Hoàn 100% giá trị vé (trừ phí xử lý)</Descriptions.Item>
          <Descriptions.Item label="Partial Refund">Hoàn theo mốc: &gt;7 ngày: 100%, 3-7 ngày: 75%, 1-3 ngày: 50%, &lt;24h: 0%</Descriptions.Item>
          <Descriptions.Item label="No Refund">Không hoàn tiền trong mọi trường hợp</Descriptions.Item>
        </Descriptions>
      </Card>
    </div>
  );
};

export default SettingsPage;
