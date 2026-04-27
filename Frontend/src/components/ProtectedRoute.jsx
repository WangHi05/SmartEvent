import React from 'react';
import { Navigate } from 'react-router-dom';
import useAuthStore from '../store/useAuthStore';

/**
 * Component ProtectedRoute - Bảo vệ các route dựa trên authentication & role
 * 
 * Cách dùng:
 * <ProtectedRoute requiredRole="Customer" element={<CustomerPage />} />
 * <ProtectedRoute requiredRole="Admin" element={<AdminPage />} />
 */
const ROLE_MAP = {
  '0': 'admin',
  '1': 'manager',
  '2': 'staff',
  '3': 'customer',
};

const normalizeRole = (role) => {
  const rawRole = (role || '').toString().toLowerCase();
  return ROLE_MAP[rawRole] || rawRole;
};

const ProtectedRoute = ({ element, requiredRole = null }) => {
  const user = useAuthStore((state) => state.user);
  
  // 1. Kiểm tra đã login chưa
  if (!user) {
    return <Navigate to="/login" replace />;
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
