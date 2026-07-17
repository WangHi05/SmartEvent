import React, { useState } from 'react';
import { Alert, Button, Card, Form, Input, message } from 'antd';
import { KeyRound, LockKeyhole, ShieldAlert } from 'lucide-react';
import { CustomerSectionTitle } from '../../components/customer/CustomerPrimitives';
import { customerAccountService } from '../../services/customerAccountService';

const CustomerChangePassword = () => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleFinish = async (values) => {
    setSaving(true);
    setError('');
    setSuccess('');

    if (values.newPassword !== values.confirmPassword) {
      form.setFields([
        {
          name: 'confirmPassword',
          errors: ['Mật khẩu xác nhận không khớp với mật khẩu mới.'],
        },
      ]);
      setSaving(false);
      return;
    }

    try {
      await customerAccountService.changePassword(values.currentPassword, values.newPassword);
      message.success('Đổi mật khẩu thành công.');
      setSuccess('Mật khẩu đã được cập nhật. Bạn có thể tiếp tục sử dụng mật khẩu mới.');
      form.resetFields();
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể đổi mật khẩu.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      <CustomerSectionTitle
        kicker="Security"
        title="Đổi mật khẩu"
        description="Nhập mật khẩu hiện tại và thiết lập mật khẩu mới tối thiểu 6 ký tự."
      />

      {error ? <Alert type="error" showIcon message={error} className="rounded-2xl" /> : null}
      {success ? <Alert type="success" showIcon message={success} className="rounded-2xl" /> : null}

      <Card className="mx-auto max-w-2xl rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
            <KeyRound size={20} />
          </div>
          <div>
            <p className="text-lg font-bold text-slate-900">Cập nhật mật khẩu</p>
            <p className="text-sm text-slate-500">Không hiển thị hay lưu password plain text trên frontend.</p>
          </div>
        </div>

        <Form layout="vertical" form={form} onFinish={handleFinish} requiredMark={false}>
          <Form.Item
            label="Mật khẩu hiện tại"
            name="currentPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu hiện tại' },
            ]}
          >
            <Input.Password
              prefix={<ShieldAlert size={16} className="text-slate-400" />}
              placeholder="Nhập mật khẩu hiện tại"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Mật khẩu mới"
            name="newPassword"
            rules={[
              { required: true, message: 'Vui lòng nhập mật khẩu mới' },
              { min: 6, message: 'Mật khẩu mới phải tối thiểu 6 ký tự' },
            ]}
          >
            <Input.Password
              prefix={<LockKeyhole size={16} className="text-slate-400" />}
              placeholder="Nhập mật khẩu mới"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Xác nhận mật khẩu mới"
            name="confirmPassword"
            dependencies={['newPassword']}
            rules={[
              { required: true, message: 'Vui lòng xác nhận mật khẩu mới' },
              ({ getFieldValue }) => ({
                validator(_, value) {
                  if (!value || getFieldValue('newPassword') === value) {
                    return Promise.resolve();
                  }
                  return Promise.reject(new Error('Mật khẩu xác nhận không khớp với mật khẩu mới.'));
                },
              }),
            ]}
          >
            <Input.Password
              prefix={<ShieldAlert size={16} className="text-slate-400" />}
              placeholder="Nhập lại mật khẩu mới"
              size="large"
            />
          </Form.Item>

          <div className="flex flex-wrap gap-3 pt-2">
            <Button type="primary" htmlType="submit" loading={saving} className="!h-11 !rounded-2xl !border-orange-600 !bg-orange-600 !px-5 !font-semibold">
              Đổi mật khẩu
            </Button>
            <Button className="!h-11 !rounded-2xl !px-5" onClick={() => form.resetFields()}>
              Xóa form
            </Button>
          </div>
        </Form>
      </Card>
    </div>
  );
};

export default CustomerChangePassword;