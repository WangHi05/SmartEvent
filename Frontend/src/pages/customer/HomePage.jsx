import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarDays, Ticket, ShieldCheck, Sparkles } from 'lucide-react';

const features = [
  {
    title: 'Đặt vé siêu nhanh',
    desc: 'Chọn sự kiện, chọn loại vé và thanh toán trong vài bước đơn giản.',
    icon: Ticket,
  },
  {
    title: 'Lịch sự kiện rõ ràng',
    desc: 'Theo dõi sự kiện sắp diễn ra theo thời gian thực với giao diện trực quan.',
    icon: CalendarDays,
  },
  {
    title: 'Check-in an toàn',
    desc: 'Mỗi vé có QR riêng, hỗ trợ soát vé chính xác và minh bạch.',
    icon: ShieldCheck,
  },
];

const HomePage = () => {
  return (
    <div className="space-y-10">
      <section className="relative overflow-hidden rounded-3xl border border-orange-100 bg-gradient-to-br from-orange-100 via-amber-50 to-white p-8 sm:p-12">
        <div className="absolute -right-12 -top-12 h-48 w-48 rounded-full bg-orange-200/50 blur-2xl" />
        <div className="absolute -left-10 bottom-0 h-40 w-40 rounded-full bg-red-200/40 blur-2xl" />

        <div className="relative max-w-2xl space-y-5">
          <div className="inline-flex items-center gap-2 rounded-full border border-orange-200 bg-white px-3 py-1 text-xs font-semibold text-orange-700">
            <Sparkles size={14} /> Nền tảng quản lý sự kiện thế hệ mới
          </div>
          <h1 className="text-3xl font-black leading-tight text-slate-900 sm:text-5xl">
            Trải nghiệm đặt vé sự kiện nhanh, đẹp, ổn định
          </h1>
          <p className="text-sm text-slate-600 sm:text-base">
            Khám phá sự kiện nổi bật, đặt vé trực tuyến và quản lý lịch sử giao dịch ngay trong một nền tảng duy nhất.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/customer/events"
              className="rounded-xl bg-orange-500 px-5 py-3 text-sm font-semibold text-white shadow hover:bg-orange-600"
            >
              Khám phá sự kiện
            </Link>
            <Link
              to="/customer/my-orders"
              className="rounded-xl border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-400"
            >
              Xem lịch sử đặt vé
            </Link>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((item) => (
          <article key={item.title} className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 inline-flex rounded-xl bg-slate-100 p-3 text-slate-700">
              <item.icon size={22} />
            </div>
            <h3 className="mb-2 text-lg font-bold text-slate-900">{item.title}</h3>
            <p className="text-sm text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>
    </div>
  );
};

export default HomePage;
