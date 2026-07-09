import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

const ROLE_MAP = {
  '0': 'admin',
  '1': 'manager',
  '2': 'staff',
  '3': 'customer',
  '4': 'director',
};

const normalizeRole = (role) => {
  const rawRole = (role || '').toString().toLowerCase();
  return ROLE_MAP[rawRole] || rawRole;
};

const ProtectedRoute = ({ element, requiredRole = null }) => {
  const user = useAuthStore((state) => state.user);
  const location = useLocation(); // Lấy vị trí URL hiện tại mà người dùng đang định truy cập
  
  // 1. Kiểm tra đã login chưa
  if (!user) {
    // Đính kèm vị trí hiện tại (from) và lời nhắn (message) vào thuộc tính state của Navigate
    return (
      <Navigate 
        to="/login" 
        replace 
        state={{ 
          from: location, 
          message: 'Bạn cần đăng nhập tài khoản để thực hiện đặt vé sự kiện.' 
        }} 
      />
    );
  }

  // 2. Kiểm tra role (nếu có yêu cầu)
  if (requiredRole) {
    const allowedRoles = Array.isArray(requiredRole) ? requiredRole : [requiredRole];
    const normalizedUserRole = normalizeRole(user?.role || user?.Role);
    const normalizedAllowedRoles = allowedRoles.map((role) => normalizeRole(role));

    if (!normalizedAllowedRoles.includes(normalizedUserRole)) {
      return <Navigate to="/" replace />;
    }
  }

  // 3. Cho phép truy cập
  return element;
};

export default ProtectedRoute;