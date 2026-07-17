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
        {/* KHỐI TRÁI: THÔNG TIN LIÊN HỆ ĐỘC LẬP */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="grid gap-4 sm:grid-cols-2">
            {/* 🔴 EMAIL: Trả về sắc Đỏ/Cam biểu tượng hộp thư điện tử công nghệ */}
            <div className="rounded-2xl bg-slate-950 p-5 text-white border border-white/5 shadow-inner">
              <Mail size={20} className="text-orange-400" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/50">Email</p>
              <p className="mt-1 text-base font-black tracking-tight">support@smartevent.vn</p>
            </div>
            
            {/* 🟠 HOTLINE: Trả về dải màu Gradient Cam - Hổ phách nguyên bản rực rỡ, khẩn cấp và nổi bật hẳn lên */}
            <div className="rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 p-5 text-white shadow-md shadow-orange-900/20 transform transition-transform hover:scale-[1.01]">
              <Phone size={20} className="text-white animate-pulse" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-white/80">Hotline tổng đài</p>
              <p className="mt-1 text-base font-black tracking-tight">1900 1234</p>
            </div>
            
            <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-5 text-slate-800">
              <MapPin size={20} className="text-orange-600" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Văn phòng</p>
              <p className="mt-1 text-base font-black tracking-tight text-slate-800">Hà Nội, Việt Nam</p>
            </div>
            
            <div className="rounded-2xl bg-slate-50 border border-slate-200/60 p-5 text-slate-800">
              <Clock3 size={20} className="text-orange-600" />
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.2em] text-slate-400">Giờ hỗ trợ</p>
              <p className="mt-1 text-base font-black tracking-tight text-slate-800">08:00 - 22:00</p>
            </div>
          </div>

          <div className="mt-6 rounded-xl border border-dashed border-slate-200 bg-slate-50/50 p-5">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">SmartEvent hỗ trợ các nhu cầu sau:</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <Ticket size={18} className="text-orange-600" />
                <span className="text-sm font-semibold text-slate-600">Hỗ trợ đặt vé và tra cứu vé</span>
              </div>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <ShieldCheck size={18} className="text-orange-600" />
                <span className="text-sm font-semibold text-slate-600">Hoàn tiền và chính sách bảo mật</span>
              </div>
            </div>
          </div>
        </div>

        {/* KHỐI PHẢI: KÊNH KẾT NỐI NHANH - TRẢ VỀ MÀU NGUYÊN BẢN CỦA FACEBOOK, YOUTUBE, ZALO */}
        <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-6 text-white shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute inset-0 bg-gradient-to-r from-orange-950/10 via-transparent to-slate-950/20 pointer-events-none" />
          
          <div className="relative z-10 space-y-2">
            <h2 className="text-xl font-black tracking-tight">Kênh kết nối nhanh</h2>
            <p className="text-xs text-slate-400 font-medium">Liên hệ qua kênh phù hợp nhất để được hỗ trợ nhanh hơn.</p>
          </div>

          <div className="mt-6 space-y-2.5 relative z-10">
            {/* 🔵 FACEBOOK: Màu xanh biển chính thức (#1877F2) */}
            <a href="https://facebook.com" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-white transition-all hover:border-[#1877F2]/40 hover:bg-[#1877F2]/10 backdrop-blur-sm group">
              <span className="inline-flex items-center gap-3 text-sm font-semibold">
                <Facebook size={16} className="text-[#1877F2] transition-transform group-hover:scale-110" /> 
                Facebook
              </span>
              <span className="text-xs text-white/50 font-medium group-hover:text-white transition-colors">/SmartEvent</span>
            </a>

            {/* 🔴 YOUTUBE: Màu đỏ rực chính thức (#FF0000) */}
            <a href="https://youtube.com" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-white transition-all hover:border-[#FF0000]/40 hover:bg-[#FF0000]/10 backdrop-blur-sm group">
              <span className="inline-flex items-center gap-3 text-sm font-semibold">
                <Youtube size={16} className="text-[#FF0000] transition-transform group-hover:scale-110" /> 
                YouTube
              </span>
              <span className="text-xs text-white/50 font-medium group-hover:text-white transition-colors">/SmartEvent</span>
            </a>

            {/* 🔵 ZALO: Màu xanh ngọc chính thức (#0068FF) */}
            <a href="https://zalo.me" target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-white transition-all hover:border-[#0068FF]/40 hover:bg-[#0068FF]/10 backdrop-blur-sm group">
              <span className="inline-flex items-center gap-3 text-sm font-semibold">
                <MessageCircle size={16} className="text-[#0068FF] transition-transform group-hover:scale-110" /> 
                Zalo chat
              </span>
              <span className="text-xs text-white/50 font-medium group-hover:text-white transition-colors">Chat trực tiếp</span>
            </a>
          </div>

          <div className="mt-6 rounded-xl bg-white/5 border border-white/10 p-5 relative z-10 backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-orange-300">Cần hỗ trợ gấp?</p>
            <p className="mt-2 text-xs text-slate-300 font-normal leading-relaxed">Gọi hotline hoặc gửi email, đội ngũ hỗ trợ sẽ phản hồi sớm nhất trong khung giờ làm việc.</p>
            <Button 
              className="mt-4 !h-10 !rounded-xl !border-white !bg-white !text-xs !font-bold !text-slate-950 hover:!bg-slate-100 transition-all transform hover:scale-[1.01]" 
              href="mailto:support@smartevent.vn"
            >
              Gửi email hỗ trợ
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default ContactPage;