import React, { useEffect, useState } from 'react';
import { Alert, Avatar, Button, Card, Descriptions, Form, Input, Spin, Tag, message } from 'antd';
import { Mail, Phone, UserRound } from 'lucide-react';
import AvatarUpload from '../../features/admin/users/AvatarUpload';
import useAuthStore from '../../store/useAuthStore';
import { CustomerSectionTitle } from '../../components/customer/CustomerPrimitives';
import { customerAccountService } from '../../services/customerAccountService';

const displayValue = (value) => (value ? value : 'Chưa cập nhật');

const CustomerProfile = () => {
  const [form] = Form.useForm();
  const setUser = useAuthStore((state) => state.setUser);
  const currentUser = useAuthStore((state) => state.user);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState('');

  const loadProfile = async () => {
    setLoading(true);
    setError('');

    try {
      const response = await customerAccountService.getMe();
      const data = response?.data || response;
      setProfile(data);
      form.setFieldsValue({
        fullName: data?.fullName || data?.FullName || '',
        email: data?.email || data?.Email || '',
        phoneNumber: data?.phoneNumber || data?.PhoneNumber || '',
        avatarUrl: data?.avatarUrl || data?.AvatarUrl || '',
      });
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải thông tin tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfile();
  }, []);

  const handleSubmit = async (values) => {
    setSaving(true);
    setError('');

    try {
      const updatedProfile = await customerAccountService.updateMe({
        fullName: values.fullName,
        email: values.email,
        phoneNumber: values.phoneNumber,
        avatarUrl: values.avatarUrl,
      });

      setProfile(updatedProfile);
      form.setFieldsValue({
        fullName: updatedProfile?.fullName || '',
        email: updatedProfile?.email || '',
        phoneNumber: updatedProfile?.phoneNumber || '',
        avatarUrl: updatedProfile?.avatarUrl || '',
      });

      // Đồng bộ lại thông tin user trong store để Header cập nhật avatar/tên ngay lập tức
      setUser({ ...currentUser, ...updatedProfile });

      message.success('Cập nhật hồ sơ thành công.');
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể cập nhật hồ sơ.');
    } finally {
      setSaving(false);
    }
  };

  const username = profile?.username || profile?.Username || '';
  const fullName = profile?.fullName || profile?.FullName || '';
  const email = profile?.email || profile?.Email || '';
  const phoneNumber = profile?.phoneNumber || profile?.PhoneNumber || '';
  const avatarUrl = profile?.avatarUrl || profile?.AvatarUrl || '';
  const role = profile?.role || profile?.Role || '';
  const isActive = profile?.isActive ?? profile?.IsActive;

  const avatarLabel = (fullName || username || 'U').trim().charAt(0).toUpperCase() || 'U';

  return (
    <div className="space-y-8">
      <CustomerSectionTitle
        kicker="Account"
        title="Hồ sơ cá nhân"
        description="Cập nhật thông tin khách hàng đang đăng nhập. Role và trạng thái được hiển thị để đối chiếu nhưng không thể chỉnh sửa."
      />

      {error ? <Alert type="error" showIcon message={error} className="rounded-2xl" /> : null}

      {loading ? (
        <div className="flex min-h-[320px] items-center justify-center rounded-[28px] border border-dashed border-slate-300 bg-white">
          <Spin size="large" tip="Đang tải hồ sơ..." />
        </div>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <Card className="rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="flex items-center gap-4">
              <Avatar
                size={64}
                src={avatarUrl || undefined}
                className="bg-gradient-to-br from-orange-500 to-amber-600 text-xl font-bold text-white"
              >
                {!avatarUrl && avatarLabel}
              </Avatar>
              <div className="min-w-0">
                <p className="truncate text-lg font-bold text-slate-900">{displayValue(fullName || username)}</p>
                <p className="text-sm font-medium text-slate-500">Tài khoản khách hàng</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <Tag color={isActive ? 'green' : 'red'}>{isActive ? 'Đang hoạt động' : 'Đã khóa'}</Tag>
                  <Tag color="orange">{displayValue(role)}</Tag>
                </div>
              </div>
            </div>

            <Descriptions className="mt-6" column={1} bordered size="small">
              <Descriptions.Item label="Username">{displayValue(username)}</Descriptions.Item>
              <Descriptions.Item label="Họ và tên">{displayValue(fullName)}</Descriptions.Item>
              <Descriptions.Item label="Email">{displayValue(email)}</Descriptions.Item>
              <Descriptions.Item label="Số điện thoại">{displayValue(phoneNumber)}</Descriptions.Item>
              <Descriptions.Item label="Vai trò">{displayValue(role)}</Descriptions.Item>
            </Descriptions>
          </Card>

          <Card className="rounded-[28px] border border-slate-200 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-slate-900 text-white">
                <UserRound size={20} />
              </div>
              <div>
                <p className="text-lg font-bold text-slate-900">Chỉnh sửa thông tin</p>
                <p className="text-sm text-slate-500">Không cho phép thay đổi Role hoặc Status.</p>
              </div>
            </div>

            <Form layout="vertical" form={form} onFinish={handleSubmit} requiredMark={false}>
              <Form.Item name="avatarUrl" label="Ảnh đại diện">
                <AvatarUpload required={false} />
              </Form.Item>

              <Form.Item
                label="Họ và tên"
                name="fullName"
                rules={[
                  { max: 100, message: 'Họ và tên tối đa 100 ký tự' },
                ]}
              >
                <Input placeholder="Chưa cập nhật" size="large" />
              </Form.Item>

              <Form.Item
                label="Email"
                name="email"
                rules={[
                  { type: 'email', message: 'Email không hợp lệ' },
                  { max: 100, message: 'Email tối đa 100 ký tự' },
                ]}
              >
                <Input prefix={<Mail size={16} className="text-slate-400" />} placeholder="Chưa cập nhật" size="large" />
              </Form.Item>

              <Form.Item
                label="Số điện thoại"
                name="phoneNumber"
                rules={[
                  { max: 30, message: 'Số điện thoại tối đa 30 ký tự' },
                ]}
              >
                <Input prefix={<Phone size={16} className="text-slate-400" />} placeholder="Chưa cập nhật" size="large" />
              </Form.Item>

              <div className="flex flex-wrap gap-3 pt-2">
                <Button type="primary" htmlType="submit" loading={saving} className="!h-11 !rounded-2xl !border-orange-600 !bg-orange-600 !px-5 !font-semibold">
                  Lưu thay đổi
                </Button>
                <Button className="!h-11 !rounded-2xl !px-5" onClick={loadProfile}>
                  Tải lại
                </Button>
              </div>
            </Form>
          </Card>
        </div>
      )}
    </div>
  );
};

export default CustomerProfile;