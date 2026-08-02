import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from 'antd';
import { ArrowLeft, ShieldCheck } from 'lucide-react';

const PolicyPage = () => {
  const navigate = useNavigate();

  return (
    <div className="mx-auto max-w-3xl space-y-6 py-4">
      <Button
        icon={<ArrowLeft size={16} />}
        onClick={() => navigate('/customer/home')}
        className="!rounded-lg"
      >
        Về trang chủ
      </Button>

      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
            <ShieldCheck size={22} />
          </div>
          <div>
            <h1 className="text-xl font-black text-gray-900 sm:text-2xl">Chính sách hủy vé & hoàn tiền</h1>
            <p className="text-sm text-gray-500">Áp dụng cho toàn bộ vé đặt qua SmartEvent</p>
          </div>
        </div>

        <div className="space-y-5 text-sm leading-6 text-gray-700 sm:text-base">
          <section>
            <h2 className="mb-2 font-bold text-gray-900">1. Điều kiện hủy vé</h2>
            <p>
              Khách hàng có thể yêu cầu hủy vé trực tiếp trên hệ thống trước khi sự kiện diễn ra, với điều kiện vé
              chưa được sử dụng (chưa check-in) và đơn hàng chưa bị hủy trước đó.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-bold text-gray-900">2. Mức hoàn tiền theo thời gian hủy</h2>
            <div className="overflow-hidden rounded-xl border border-gray-200">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Thời điểm hủy so với sự kiện</th>
                    <th className="px-4 py-3 font-semibold">Tỷ lệ hoàn tiền</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  <tr>
                    <td className="px-4 py-3">Trước hơn 7 ngày</td>
                    <td className="px-4 py-3 font-semibold text-green-600">Hoàn 100% giá trị vé</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Từ 3 đến 7 ngày trước sự kiện</td>
                    <td className="px-4 py-3 font-semibold text-orange-600">Hoàn 50% giá trị vé</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3">Dưới 3 ngày trước sự kiện</td>
                    <td className="px-4 py-3 font-semibold text-red-600">Không được hủy / không hoàn tiền</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="mb-2 font-bold text-gray-900">3. Quy trình hoàn tiền</h2>
            <p>
              Sau khi yêu cầu hủy vé được hệ thống chấp thuận, đội ngũ SmartEvent sẽ liên hệ và hoàn tiền cho khách
              hàng qua hình thức chuyển khoản hoặc tiền mặt tại quầy, tùy theo phương thức thanh toán ban đầu. Thời
              gian xử lý thông thường từ 1–3 ngày làm việc kể từ khi yêu cầu được xác nhận.
            </p>
          </section>

          <section>
            <h2 className="mb-2 font-bold text-gray-900">4. Các trường hợp không áp dụng hoàn vé</h2>
            <ul className="list-disc space-y-1 pl-5">
              <li>Vé đã được sử dụng để check-in vào sự kiện.</li>
              <li>Sự kiện đã diễn ra hoặc đã kết thúc.</li>
              <li>Đơn hàng đã ở trạng thái hủy trước đó.</li>
            </ul>
          </section>

          <section>
            <h2 className="mb-2 font-bold text-gray-900">5. Liên hệ hỗ trợ</h2>
            <p>
              Nếu có bất kỳ thắc mắc nào về chính sách hủy vé, quý khách vui lòng liên hệ hotline{' '}
              <b>1900 1234</b> hoặc email <b>support@smartevent.vn</b> để được hỗ trợ.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PolicyPage;