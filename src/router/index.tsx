import { createBrowserRouter } from 'react-router-dom'
import { lazy } from 'react'
import RouteErrorBoundary from '@/components/router/RouteErrorBoundary'
import { isDeviceOverviewEnabled, isUserManageEnabled } from '@/config/featureFlags'

// Lazy load pages
const HomeView = lazy(() => import('@/views/home/HomeView'))
const SpoolManageView = lazy(() => import('@/views/spool/manage/SpoolManageView'))
const SpoolDetailView = lazy(() => import('@/views/spool/detail/SpoolDetailView'))
const SpoolRecordManageView = lazy(() => import('@/views/spool/record/SpoolRecordManageView'))
const OrderManageView = lazy(() => import('@/views/order/manage/OrderManageView'))
const OrderDetailView = lazy(() => import('@/views/order/detail/OrderDetailView'))
const DeviceManageView = lazy(() => import('@/views/device/manage/DeviceManageView'))
const DeviceOverviewView = lazy(() => import('@/views/device/overview/DeviceOverviewView'))
const SpoolSummaryView = lazy(() => import('@/views/spool/summary/SpoolSummaryView'))
const LoginView = lazy(() => import('@/views/auth/login/LoginView'))
const RegisterView = lazy(() => import('@/views/auth/register/RegisterView'))
const SetupView = lazy(() => import('@/views/auth/setup/SetupView'))
const LicenseView = lazy(() => import('@/views/auth/license/LicenseView'))
const UserCenterView = lazy(() => import('@/views/user/center/UserCenterView'))
const UserPreferencesView = lazy(() => import('@/views/user/preferences/UserPreferencesView'))
const UserManageView = lazy(() => import('@/views/user/manage/UserManageView'))
const SystemConfigView = lazy(() => import('@/views/system/SystemConfigView'))

const appChildrenRoutes = [
    {
        index: true,
        element: <HomeView />,
    },
    {
        path: 'spool/manage',
        element: <SpoolManageView />,
    },
    {
        path: 'spool/detail/:id',
        element: <SpoolDetailView />,
    },
    {
        path: 'record/manage',
        element: <SpoolRecordManageView />,
    },
    {
        path: 'order/manage',
        element: <OrderManageView />,
    },
    {
        path: 'order/detail/:id',
        element: <OrderDetailView />,
    },
    {
        path: 'device/manage',
        element: <DeviceManageView />,
    },
    ...(isDeviceOverviewEnabled ? [{
        path: 'device/overview',
        element: <DeviceOverviewView />,
    }] : []),
    {
        path: 'spool/summary',
        element: <SpoolSummaryView />,
    },
    {
        path: 'user/center',
        element: <UserCenterView />,
    },
    {
        path: 'user/preferences',
        element: <UserPreferencesView />,
    },
    ...(isUserManageEnabled ? [{
        path: 'user/manage',
        element: <UserManageView />,
    }] : []),
    {
        path: 'system/config',
        element: <SystemConfigView />,
    },
    // TODO: Add more routes as pages are migrated
]

const router = createBrowserRouter([
    {
        path: '/',
        errorElement: <RouteErrorBoundary />,
        lazy: async () => {
            const { default: BasicLayout } = await import('@/layouts/BasicLayout')
            return { Component: BasicLayout }
        },
        children: appChildrenRoutes,
    },
    {
        path: '/user/login',
        element: <LoginView />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: '/user/register',
        element: <RegisterView />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: '/setup',
        element: <SetupView />,
        errorElement: <RouteErrorBoundary />,
    },
    {
        path: '/license',
        element: <LicenseView />,
        errorElement: <RouteErrorBoundary />,
    },
])

export default router
