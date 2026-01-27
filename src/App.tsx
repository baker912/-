import React, { Suspense, lazy } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ConfigProvider, Spin } from 'antd';
import zhCN from 'antd/locale/zh_CN';

// Lazy load components
const Login = lazy(() => import('./pages/Login'));
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const AssetList = lazy(() => import('./pages/AssetList'));
const RequestList = lazy(() => import('./pages/RequestList'));
const ProcurementContract = lazy(() => import('./pages/ProcurementContract'));
const AssetDictionary = lazy(() => import('./pages/AssetDictionary'));
const AssetOperationPage = lazy(() => import('./pages/AssetOperationPage'));
const UserManagementPage = lazy(() => import('./pages/UserManagementPage'));
const DictionaryManagementPage = lazy(() => import('./pages/DictionaryManagementPage'));
const RoleManagementPage = lazy(() => import('./pages/RoleManagementPage'));

// Loading Fallback
const PageLoading = () => (
  <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50 gap-4">
    <Spin size="large" />
    <span className="text-gray-500 font-medium">系统加载中...</span>
  </div>
);

// Protected Route Component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) {
    return <PageLoading />;
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

const App: React.FC = () => {
  return (
    <ConfigProvider locale={zhCN}>
      <BrowserRouter>
        <AuthProvider>
          <Suspense fallback={<PageLoading />}>
            <Routes>
              <Route path="/login" element={<Login />} />
              
              <Route path="/" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              }>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                <Route path="requests" element={<RequestList />} />
                <Route path="procurement/contracts" element={<ProcurementContract />} />
                <Route path="assets/dictionary" element={<AssetDictionary />} />
                <Route path="assets/list" element={<AssetList />} />
                <Route path="assets/requisition" element={<AssetOperationPage type="requisition" title="资产领用" />} />
                <Route path="assets/return" element={<AssetOperationPage type="return" title="资产归还" />} />
                <Route path="assets/borrow" element={<AssetOperationPage type="borrow" title="资产借用" />} />
                <Route path="assets/transfer" element={<AssetOperationPage type="transfer" title="资产转移" />} />
                <Route path="assets/scrap" element={<AssetOperationPage type="scrap" title="资产报废" />} />
                <Route path="assets/dispose" element={<AssetOperationPage type="dispose" title="资产清运" />} />
                <Route path="status" element={<div>状态管理页面 (开发中)</div>} />
                <Route path="reports" element={<div>报表分析页面 (开发中)</div>} />
                <Route path="settings" element={<div>系统设置页面 (开发中)</div>} />
                <Route path="settings/users" element={<UserManagementPage />} />
                <Route path="settings/roles" element={<RoleManagementPage />} />
                <Route path="settings/dictionary" element={<DictionaryManagementPage />} />
              </Route>

              <Route path="*" element={<Navigate to="/dashboard" replace />} />
            </Routes>
          </Suspense>
        </AuthProvider>
      </BrowserRouter>
    </ConfigProvider>
  );
};

export default App;
