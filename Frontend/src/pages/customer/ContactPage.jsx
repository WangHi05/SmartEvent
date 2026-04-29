import React from 'react';
import { Button } from 'antd';
import { Mail, Phone, MapPin, Clock3, Facebook, Youtube, MessageCircle, Ticket, ShieldCheck } from 'lucide-react';
import { CustomerSectionTitle } from '../../components/customer/CustomerPrimitives';

const ContactPage = () => {
  return (
    <div className="space-y-8">
      <CustomerSectionTitle
        kicker="Contact"
        title="Liên hệ SmartEvent"
        description="Kênh hỗ trợ cho đặt vé, hoàn tiền, chính sách và các vấn đề kỹ thuật của khách hàng."
      />

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)]">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-3xl bg-slate-950 p-5 text-white">
              <Mail size={20} className="text-orange-400" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-white/60">Email</p>
              <p className="mt-2 text-lg font-bold">support@smartevent.vn</p>
            </div>
            <div className="rounded-3xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white">
              <Phone size={20} />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-white/70">Hotline</p>
              <p className="mt-2 text-lg font-bold">1900 1234</p>
            </div>
            <div className="rounded-3xl bg-slate-100 p-5 text-slate-900">
              <MapPin size={20} className="text-orange-500" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-500">Văn phòng</p>
              <p className="mt-2 text-lg font-bold">Hà Nội, Việt Nam</p>
            </div>
            <div className="rounded-3xl bg-slate-100 p-5 text-slate-900">
              <Clock3 size={20} className="text-orange-500" />
              <p className="mt-4 text-sm uppercase tracking-[0.2em] text-slate-500">Giờ hỗ trợ</p>
              <p className="mt-2 text-lg font-bold">08:00 - 22:00</p>
            </div>
          </div>

          <div className="mt-6 rounded-[24px] border border-dashed border-slate-300 bg-slate-50 p-5">
            <p className="text-sm font-semibold text-slate-900">SmartEvent hỗ trợ các nhu cầu sau:</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
                <Ticket size={18} className="text-orange-500" />
                <span className="text-sm text-slate-600">Hỗ trợ đặt vé và tra cứu vé</span>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white p-4">
                <ShieldCheck size={18} className="text-emerald-500" />
                <span className="text-sm text-slate-600">Hoàn tiền và chính sách bảo mật</span>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] border border-slate-200 bg-gradient-to-br from-slate-950 via-slate-900 to-orange-600 p-6 text-white shadow-[0_18px_50px_rgba(15,23,42,0.12)]">
          <h2 className="text-2xl font-black">Kênh kết nối nhanh</h2>
          <p className="mt-2 text-sm text-white/75">Liên hệ qua kênh phù hợp nhất để được hỗ trợ nhanh hơn.</p>

          <div className="mt-6 space-y-3">
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white transition hover:bg-white/15">
              <span className="inline-flex items-center gap-3"><Facebook size={18} /> Facebook</span>
              <span className="text-sm text-white/60">/SmartEvent</span>
            </a>
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white transition hover:bg-white/15">
              <span className="inline-flex items-center gap-3"><Youtube size={18} /> YouTube</span>
              <span className="text-sm text-white/60">/SmartEvent</span>
            </a>
            <a href="https://zalo.me" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-white transition hover:bg-white/15">
              <span className="inline-flex items-center gap-3"><MessageCircle size={18} /> Zalo</span>
              <span className="text-sm text-white/60">Chat trực tiếp</span>
            </a>
          </div>

          <div className="mt-6 rounded-[24px] bg-white/10 p-5">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">Cần hỗ trợ gấp?</p>
            <p className="mt-2 text-sm text-white/80">Gọi hotline hoặc gửi email, đội ngũ hỗ trợ sẽ phản hồi sớm nhất trong khung giờ làm việc.</p>
            <Button className="mt-4 !h-11 !rounded-2xl !border-white !bg-white !font-semibold !text-slate-950" href="mailto:support@smartevent.vn">
              Gửi email hỗ trợ
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;
