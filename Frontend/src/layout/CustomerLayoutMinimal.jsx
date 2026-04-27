import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { Layout, Button } from 'antd';
import { LogoutOutlined } from '@ant-design/icons';
import useAuthStore from '../store/useAuthStore';

const { Header, Content } = Layout;

const CustomerLayoutMinimal = () => {
  const user = useAuthStore((state) => state.user);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header 
        style={{ 
          background: '#fff', 
          padding: '0 24px', 
          boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          position: 'sticky',
          top: 0,
          zIndex: 100,
        }}
      >
        <h2 style={{ margin: 0 }}>🎫 SmartEvent - Customer</h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <span>{user?.fullName || 'Khách'}</span>
          <Button 
            type="text" 
            icon={<LogoutOutlined />}
            onClick={() => {
              logout();
              navigate('/login');
            }}
          >
            Đăng xuất
          </Button>
        </div>
      </Header>

      <Content 
        style={{ 
          margin: '24px 16px', 
          padding: '24px', 
          background: '#f5f5f5',
          borderRadius: '8px',
          minHeight: 'calc(100vh - 100px)',
        }}
      >
        <Outlet />
      </Content>

      <footer style={{ padding: '24px', textAlign: 'center', color: '#999', background: '#fff' }}>
        <p>© 2026 SmartEvent. All rights reserved.</p>
      </footer>
    </Layout>
  );
};

export default CustomerLayoutMinimal;
