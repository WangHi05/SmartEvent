import http from 'k6/http';
import { check } from 'k6';
import exec from 'k6/execution';

export const options = {
  // TẠO SPIKE TEST (Tăng vọt) để ép lỗi Race Condition
  // Bắn 100 Users vào cùng lúc trong 2 giây đầu tiên. 
  stages: [
    { duration: '2s', target: 100 }, 
    { duration: '5s', target: 100 } 
  ],
  insecureSkipTLSVerify: true,
};

export function setup() {
  // 1. ĐĂNG NHẬP LẤY TOKEN CỦA NHÂN VIÊN
  const loginUrl = 'http://localhost:5013/api/Users/authenticate'; 
  const loginPayload = JSON.stringify({
    username: 'staff01', 
    password: '123456', 
  });

  const loginParams = { headers: { 'Content-Type': 'application/json' } };
  const loginRes = http.post(loginUrl, loginPayload, loginParams);

  let token = '';
  try {
      token = loginRes.json('token') || loginRes.json('data.token'); 
  } catch (e) {
      console.log('❌ Lỗi xử lý JSON đăng nhập!');
  }

  if (!token) {
      exec.test.abort('❌ KHÔNG THỂ TIẾN HÀNH TEST: Đăng nhập thất bại, không có Token!');
  }

  // 2. GỌI API LẤY MỘT MÃ QR HỢP LỆ VÀ MỚI NHẤT
  const getTicketUrl = 'http://localhost:5013/api/Tickets/get-unused-qr-for-test'; 
  const ticketRes = http.get(getTicketUrl, { headers: { 'Authorization': `Bearer ${token}` } });
  
  // IN RA LOG ĐỂ XEM TẠI SAO BACKEND LẠI BÁO KHÔNG CÓ VÉ
  console.log(`\n[API LẤY VÉ RESPONSE]: Status ${ticketRes.status} - Body: ${ticketRes.body}\n`);
  
  let validQrPayload = '';
  try {
      validQrPayload = ticketRes.json('qrPayload');
  } catch(e) {}

  if (!validQrPayload) {
      console.log('⚠️ Hệ thống không thể lấy QR tự động từ Database. Khả năng cao do trạng thái vé (Status) đang là PAID thay vì ACTIVE.');
      
      // FALLBACK: CƠ CHẾ DỰ PHÒNG CHẠY BẰNG TAY (ĐÃ MỞ KHÓA)
      // HƯỚNG DẪN: Bấm "Mở Vé" trên UI -> Quét mã lấy Text -> Dán vào biến bên dưới
      // LƯU Ý: Em phải chạy k6 cực nhanh (trong vòng 30s) trước khi mã OTP này hết hạn!
      
      validQrPayload = "DÁN_MÃ_QR_LẤY_ĐƯỢC_TỪ_NÚT_MỞ_VÉ_VÀO_ĐÂY"; // <-- Thay chuỗi này bằng mã thật

      if (!validQrPayload || validQrPayload === "DÁN_MÃ_QR_LẤY_ĐƯỢC_TỪ_NÚT_MỞ_VÉ_VÀO_ĐÂY") {
          exec.test.abort('❌ KHÔNG THỂ TIẾN HÀNH TEST: DB hết vé. Hãy sửa Backend TicketService.cs (tìm Status = PAID) hoặc dán mã thủ công vào script!');
      } else {
          console.log('⚠️ K6 sẽ dùng mã QR cứng (Fallback) do em cung cấp! Nhanh tay lên vì nó sẽ hết hạn sau 30s!');
      }
  } else {
      console.log(`✅ CHUẨN BỊ DỮ LIỆU TỰ ĐỘNG THÀNH CÔNG!`);
  }

  console.log(`👉 100 Virtual Users sẽ cùng quét mã QR này: ${validQrPayload}`);

  return { token: token, validQrPayload: validQrPayload }; 
}

export default function (data) {
  const url = 'http://localhost:5013/api/Checkin/scan';
  
  const payload = JSON.stringify({
    qrPayload: data.validQrPayload,
    peopleCount: 1,
    gateName: "Cổng chính - Lối vào 1"
  });

  const params = {
    headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${data.token}` 
    },
  };

  const res = http.post(url, payload, params);

  if (res.status === 400) {
    console.log(`LỖI 400: ${res.body}`);
  }
  // KỲ VỌNG ĐÚNG CỦA HỆ THỐNG:
  // Vì chỉ có 1 vé thực sự, nên chỉ DUY NHẤT 1 request được phép có Status = 200.
  // 99 request còn lại CÙNG LÚC đó phải bị văng ra với lỗi 400 (Vé đã check-in hoặc Lỗi Concurrency).
  check(res, {
    'Check-in OK (200) - CHỈ NÊN CÓ 1 LẦN': (r) => r.status === 200,
    'Bị chặn vì vé đã dùng / đụng độ (400)': (r) => r.status === 400,
  });
}