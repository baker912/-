import React, { useState } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, theme } from 'antd';
import {
  DashboardOutlined,
  DesktopOutlined,
  AppstoreOutlined,
  TeamOutlined,
  SettingOutlined,
  UserOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ShoppingCartOutlined
} from '@ant-design/icons';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const MainLayout: React.FC = () => {
  const [collapsed, setCollapsed] = useState(false);
  const { token } = theme.useToken();
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleMenuClick = (key: string) => {
    navigate(key);
  };

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: '仪表盘',
    },
    {
      key: '/requests',
      icon: <AppstoreOutlined />,
      label: '需求管理',
    },
    {
      key: '/procurement',
      icon: <ShoppingCartOutlined />,
      label: '采购管理',
      children: [
        {
          key: '/procurement/contracts',
          label: '采购订单合同',
        }
      ]
    },
    {
      key: '/assets',
      icon: <DesktopOutlined />,
      label: '资产管理',
      children: [
        {
          key: '/assets/dictionary',
          label: '资产类目',
        },
        {
          key: '/assets/list',
          label: '资产列表',
        },
        {
          key: '/assets/requisition',
          label: '资产领用',
        },
        {
          key: '/assets/return',
          label: '资产归还',
        },
        {
          key: '/assets/borrow',
          label: '资产借用',
        },
        {
          key: '/assets/transfer',
          label: '资产转移',
        },
        {
          key: '/assets/scrap',
          label: '资产报废',
        },
        {
          key: '/assets/dispose',
          label: '资产清运',
        }
      ]
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: '系统设置',
      children: [
        {
          key: '/settings/users',
          label: '人员管理',
        },
        {
          key: '/settings/roles',
          label: '角色管理',
        },
        {
          key: '/settings/dictionary',
          label: '字典管理',
        }
      ]
    },
  ];

  const userMenu = {
    items: [
      {
        key: 'profile',
        label: '个人中心',
        icon: <UserOutlined />,
      },
      {
        key: 'logout',
        label: '退出登录',
        icon: <LogoutOutlined />,
        onClick: handleLogout,
      },
    ],
  };

  const getBreadcrumbTitle = () => {
    const currentPath = location.pathname;
    let title = '';
    
    // Find matching menu item
    for (const item of menuItems) {
      if (item.key === currentPath) {
        title = item.label;
        break;
      }
      if (item.children) {
        const child = item.children.find(c => c.key === currentPath);
        if (child) {
          title = `${item.label} / ${child.label}`;
          break;
        }
      }
    }
    
    return title || '仪表盘';
  };

  return (
    <Layout className="min-h-screen">
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed} 
        className="shadow-md z-10"
        style={{ background: '#001529' }}
        width={220}
      >
        <div className="h-16 flex items-center justify-center border-b border-gray-700 bg-[#002140]">
          <span className={`text-xl font-bold text-white truncate transition-all duration-300 ${collapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            资产管理系统
          </span>
        </div>
        <Menu
          theme="dark"
          mode="inline"
          defaultOpenKeys={[]} // Default collapsed
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          className="border-none mt-2 custom-menu"
          style={{ background: 'transparent' }}
        />
      </Sider>
      <Layout>
        <Header style={{ background: token.colorBgContainer }} className="flex justify-between items-center px-4 shadow-sm z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              className="text-lg w-16 h-16"
            />
            <h2 className="text-xl font-medium m-0 text-gray-700">{getBreadcrumbTitle()}</h2>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-gray-600 hidden sm:inline">
              欢迎, {user?.name || user?.email || '用户'}
            </span>
            <Dropdown menu={userMenu} placement="bottomRight">
              <Avatar icon={<UserOutlined />} className="cursor-pointer bg-blue-500" />
            </Dropdown>
          </div>
        </Header>
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: token.colorBgContainer,
            borderRadius: token.borderRadiusLG,
          }}
          className="overflow-auto"
        >
          <Outlet />
        </Content>
      </Layout>
      <style>{`
        .custom-menu .ant-menu-item {
          margin-bottom: 8px;
          font-size: 15px; /* 统一一级菜单字体大小 */
          font-weight: 500; /* 统一一级菜单字体粗细 */
        }
        .custom-menu .ant-menu-submenu-title {
          font-weight: 500;
          font-size: 15px;
        }
        .custom-menu .ant-menu-item-selected {
          background-color: #1890ff !important;
          font-weight: 500;
        }
        .custom-menu .ant-menu-sub .ant-menu-item {
          background-color: #000c17;
          font-size: 14px;
        }
        .custom-menu .ant-menu-sub .ant-menu-item-selected {
          background-color: #1890ff !important;
        }
      `}</style>
    </Layout>
  );
};

export default MainLayout;
