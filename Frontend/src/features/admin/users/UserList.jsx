import React from 'react';
import { Tabs } from 'antd';
import UserTable from './UserTable';

const UserList = () => {
  const items = [
    { key: 'employee', label: 'Quản lý nhân viên', children: <UserTable type="employee" /> },
    { key: 'customer', label: 'Quản lý khách hàng', children: <UserTable type="customer" /> },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <h2 style={{ marginBottom: 16 }}>Quản lý người dùng</h2>
      <Tabs items={items} />
    </div>
  );
};

export default UserList;