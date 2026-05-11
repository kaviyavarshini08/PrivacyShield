import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from '../layouts/MainLayout';
import { Loader2 } from 'lucide-react';

const Login = React.lazy(() => import('../pages/Login').then(module => ({ default: module.Login })));
const Dashboard = React.lazy(() => import('../pages/Dashboard').then(module => ({ default: module.Dashboard })));
const Workspace = React.lazy(() => import('../pages/Workspace').then(module => ({ default: module.Workspace })));
const ProcessingQueue = React.lazy(() => import('../pages/ProcessingQueue').then(module => ({ default: module.ProcessingQueue })));
const Vault = React.lazy(() => import('../pages/Vault').then(module => ({ default: module.Vault })));
const Compliance = React.lazy(() => import('../pages/Compliance').then(module => ({ default: module.Compliance })));
const Analytics = React.lazy(() => import('../pages/Analytics').then(module => ({ default: module.Analytics })));
const Admin = React.lazy(() => import('../pages/Admin').then(module => ({ default: module.Admin })));
const Settings = React.lazy(() => import('../pages/Settings').then(module => ({ default: module.Settings })));
const DocumentAnalysis = React.lazy(() => import('../pages/DocumentAnalysis').then(module => ({ default: module.DocumentAnalysis })));

const PageLoader = () => (
  <div className="flex h-[80vh] items-center justify-center">
    <Loader2 className="h-10 w-10 animate-spin text-primary" />
  </div>
);

export function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          
          <Route path="workspace" element={<Workspace />} />
          <Route path="queue" element={<ProcessingQueue />} />
          <Route path="analysis/:id" element={<DocumentAnalysis />} />
          <Route path="vault" element={<Vault />} />
          
          <Route path="compliance" element={<Compliance />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="admin" element={<Admin />} />
          <Route path="settings" element={<Settings />} />
        </Route>
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Suspense>
  );
}
