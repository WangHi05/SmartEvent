import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { ConfigProvider } from 'antd';
import EventDetail from './pages/EventDetail';
import viVN from 'antd/locale/vi_VN';

// Import Layout
import AdminLayout from './layout/AdminLayout';
import CustomerLayout from './layout/CustomerLayout';
import ProtectedRoute from './components/ProtectedRoute';
import ChatbotWidget from './components/ChatbotWidget';
import useAuthStore from './store/useAuthStore';

// Import Pages - Auth
import Login from './pages/Login'; 
import Register from './pages/Register';

// Import Pages - Customer
import EventBrowse from './pages/customer/EventBrowse';
import MyTickets from './pages/customer/MyTickets';
import MyOrders from './pages/customer/MyOrders';
import BookingPage from './pages/customer/BookingPage';
import CheckoutPage from './pages/customer/CheckoutPage';
import PaymentResultPage from './pages/customer/PaymentResultPage';
import HomePage from './pages/customer/HomePage';
import ContactPage from './pages/customer/ContactPage';
import GuestTicketPage from './pages/customer/GuestTicketPage';
import CustomerProfile from './pages/customer/CustomerProfile';
import CustomerChangePassword from './pages/customer/CustomerChangePassword';

// Import Pages - Admin/Staff
import DashboardView from './features/dashboard/DashboardView';
import EventManagerDashboardView from './features/dashboard/EventManagerDashboardView';
import { EventList } from './features/admin/events';
import { TicketList } from './features/admin/tickets';
import { UserList } from './features/admin/users';
import { AuditLogsView } from './features/admin/audit-logs';
import { SettingsPage } from './features/admin/settings';
import CheckInPage from './features/admin/checkin/CheckInPage';
import HelpDeskPage from './features/admin/checkin/HelpDeskPage';
import BookingManagementPage from './features/admin/bookings/BookingManagementPage';
import GateControl from './features/admin/checkin/GateControl';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword'; 
import CheckInLogs from './features/admin/audit-logs/CheckInLogs';

const ROLE_MAP = {
  '0': 'admin',
  '1': 'manager',
  '2': 'staff',
  '3': 'customer',
  '4': 'director',
  'director': 'director',
};

const normalizeRole = (role) => {
  const rawRole = (role || '').toString().toLowerCase();
  return ROLE_MAP[rawRole] || rawRole;
};

const RoleBasedHome = () => {
  const user = useAuthStore((state) => state.user);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(user?.role || user?.Role);

  if (role === 'customer') {
    return <Navigate to="/customer/events" replace />;
  }

  if (role === 'admin') return <Navigate to="/admin/dashboard" replace />;
  if (role === 'director') return <Navigate to="/director/dashboard" replace />;
  if (role === 'staff') return <Navigate to="/bookings" replace />;
  // Fallback: manager -> legacy dashboard
  return <Navigate to="/dashboard" replace />;
};

const DashboardRoute = () => {
  const user = useAuthStore((state) => state.user);
  const role = normalizeRole(user?.role || user?.Role);

  if (role === 'staff') {
    return <Navigate to="/bookings" replace />;
  }

  return <DashboardView />;
};

const AdminShell = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  return <AdminLayout sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />;
};

const LegacyBookingRedirect = () => {
  const { eventId } = useParams();
  return <Navigate to={`/tickets/booking/${eventId}`} replace />;
};

function App() {
  const user = useAuthStore((state) => state.user);
  const currentRole = normalizeRole(user?.role || user?.Role);
  return (
    <ConfigProvider locale={viVN}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<RoleBasedHome />} />

          {/* PUBLIC ROUTES */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/guest-ticket/:ticketId" element={<GuestTicketPage />} />
          <Route path="/event/:slug/:id" element={<EventDetail />} />

          {/* ADMIN / MANAGER / STAFF / DIRECTOR ROUTES */}
          <Route
            element={
              <ProtectedRoute
                element={<AdminShell />}
                requiredRole={['Admin', 'Manager', 'Staff', 'Director']}
              />
            }
          >
            <Route path="/dashboard" element={<DashboardRoute />} />
            <Route path="/admin/dashboard" element={<DashboardRoute />} />
            <Route path="/director/dashboard" element={<EventManagerDashboardView />} />
            <Route
              path="/events"
              element={<ProtectedRoute element={<EventList />} requiredRole={['Admin', 'Manager']} />}
            />
            <Route path="/tickets" element={<TicketList />} />
            <Route path="/bookings" element={<BookingManagementPage />} />
            <Route path="/Admin/Bookings" element={<BookingManagementPage />} />
            <Route path="/checkin" element={<CheckInPage />} />
            <Route path="/gateAD" element={<GateControl />} />
            <Route path="/checkinlogs" element={<CheckInLogs />} />
            <Route path="/checkinHD" element={<HelpDeskPage />} />
            <Route
              path="/users"
              element={<ProtectedRoute element={<UserList />} requiredRole="Admin" />}
            />
            <Route
              path="/audit-logs"
              element={<ProtectedRoute element={<AuditLogsView />} requiredRole={['Admin', 'Manager']} />}
            />
            <Route
              path="/settings"
              element={<ProtectedRoute element={<SettingsPage />} requiredRole="Admin" />}
            />
          </Route>

          {/* CUSTOMER ROUTES */}
          <Route path="/customer" element={<CustomerLayout />}>
            <Route index element={<Navigate to="/customer/home" replace />} />
            <Route path="home" element={<HomePage />} />
            <Route path="events" element={<EventBrowse />} />
            <Route path="contact" element={<ContactPage />} />
            <Route
              path="my-tickets"
              element={<ProtectedRoute element={<MyTickets />} requiredRole="Customer" />}
            />
            <Route
              path="my-orders"
              element={<ProtectedRoute element={<MyOrders />} requiredRole="Customer" />}
            />
            <Route
              path="checkout"
              element={<ProtectedRoute element={<CheckoutPage />} requiredRole="Customer" />}
            />
            <Route
              path="payment-result"
              element={<ProtectedRoute element={<PaymentResultPage />} requiredRole="Customer" />}
            />
            <Route path="profile" element={<ProtectedRoute element={<CustomerProfile />} requiredRole="Customer" />} />
            <Route path="change-password" element={<ProtectedRoute element={<CustomerChangePassword />} requiredRole="Customer" />} />
          </Route>

          {/* Booking route theo yêu cầu */}
          <Route path="/tickets/booking/:slug/:eventId" element={<BookingPage />} />
          {/* Backward compatibility route */}
          <Route path="/customer/booking/:eventId" element={<LegacyBookingRedirect />} />

          {/* DEFAULT */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        {currentRole === 'customer' && <ChatbotWidget />}
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;