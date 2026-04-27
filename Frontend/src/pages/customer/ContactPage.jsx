import React from 'react';
import { Mail, Phone, MapPin, Clock3 } from 'lucide-react';

const ContactPage = () => {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="mb-2 text-2xl font-black text-slate-900">Liên hệ SmartEvent</h1>
        <p className="mb-6 text-sm text-slate-600">
          Cần hỗ trợ về đặt vé, hoàn tiền hoặc thông tin sự kiện? Đội ngũ SmartEvent luôn sẵn sàng hỗ trợ bạn.
        </p>

        <div className="space-y-4">
          <div className="flex items-start gap-3">
            <Mail size={18} className="mt-0.5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Email</p>
              <p className="text-sm text-slate-600">support@smartevent.vn</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Phone size={18} className="mt-0.5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Hotline</p>
              <p className="text-sm text-slate-600">1900 1234</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <MapPin size={18} className="mt-0.5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Văn phòng</p>
              <p className="text-sm text-slate-600">Hà Nội, Việt Nam</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Clock3 size={18} className="mt-0.5 text-orange-500" />
            <div>
              <p className="text-sm font-semibold text-slate-900">Giờ hỗ trợ</p>
              <p className="text-sm text-slate-600">08:00 - 22:00 (Thứ 2 - Chủ nhật)</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-orange-50 to-amber-50 p-6 shadow-sm">
        <h2 className="mb-2 text-xl font-bold text-slate-900">Gửi yêu cầu nhanh</h2>
        <p className="mb-6 text-sm text-slate-600">Tính năng form contact sẽ được mở ở bản cập nhật kế tiếp.</p>
        <div className="rounded-xl border border-dashed border-orange-300 bg-white p-8 text-center text-sm text-slate-500">
          Bạn có thể liên hệ ngay qua hotline hoặc email ở bên trái để được hỗ trợ nhanh nhất.
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
