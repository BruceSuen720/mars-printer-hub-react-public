import {Outlet, Link, Navigate, useLocation, useNavigate} from 'react-router-dom'
import {useLoginUserStore} from '@/stores/useLoginUserStore'
import {useDeviceStore} from '@/stores/useDeviceStore'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
    Home,
    Box,
    History,
    Settings,
    Receipt,
    PieChart,
    Crown,
    ChevronDown,
    User,
    Monitor,
    RefreshCw,
    UserCircle,
    Users,
    LogOut,
    BookOpen
} from 'lucide-react'
import {Avatar, AvatarFallback, AvatarImage} from '@/components/ui/avatar'
import {Button} from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {logout} from '@/api/user'
import {toast} from 'sonner'
import logoImg from '@/assets/images/logo-2.webp'
import ThemeToggle from '@/components/ThemeToggle'
import LayoutToggle from '@/components/LayoutToggle'
import CornerStyleToggle from '@/components/CornerStyleToggle'
import {useUserConfigStore} from '@/stores/useUserConfigStore'
import {isDeviceOverviewEnabled, isUserManageEnabled} from '@/config/featureFlags'
import {checkLatestVersion} from '@/services/versionCheck'

const navItems = [
    {key: '/', icon: Home, label: '主页', requiresAuth: false},
    {key: '/spool/manage', icon: Box, label: '耗材', requiresAuth: true},
    {key: '/record/manage', icon: History, label: '记录', requiresAuth: true},
    {key: '/device/manage', icon: Settings, label: '设备', requiresAuth: true},
    ...(isDeviceOverviewEnabled ? [{key: '/device/overview', icon: Monitor, label: '总览', requiresAuth: true}] : []),
    {key: '/order/manage', icon: Receipt, label: '订单', requiresAuth: true},
    {key: '/spool/summary', icon: PieChart, label: '汇总', requiresAuth: true, hideOnMobile: true},
]

const AUTO_VERSION_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const AUTO_VERSION_CHECK_STORAGE_KEY = 'mars-printer-hub:last-version-check-at'

export default function BasicLayout() {
    const {loginUser, fetchLoginUser, isLoggedIn, hasCheckedAuth, resetLoginUser} = useLoginUserStore()
    const fetchUserConfig = useUserConfigStore((s) => s.fetchUserConfig)
    const clearUserConfig = useUserConfigStore((s) => s.clearUserConfig)
    const desktopLayout = useUserConfigStore((s) => s.userConfig.desktopLayout)
    const isMobile = useDeviceStore((s) => s.isMobile)
    const isFullWidth = desktopLayout === 'fullwidth'
    const navigate = useNavigate()
    const location = useLocation()
    const [isCheckingVersion, setIsCheckingVersion] = useState(false)
    const isVersionCheckRunning = useRef(false)

    useEffect(() => {
        fetchLoginUser()
    }, [fetchLoginUser])

    useEffect(() => {
        if (isLoggedIn) {
            fetchUserConfig()
            return
        }

        clearUserConfig()
    }, [clearUserConfig, fetchUserConfig, isLoggedIn])

    useEffect(() => {
        if (!isMobile || typeof window === 'undefined') {
            return
        }

        window.scrollTo({ top: 0, left: 0, behavior: 'auto' })
    }, [isMobile, location.pathname, location.search, location.hash])

    const hasNotifiedBambuToken = useRef(false)

    useEffect(() => {
        if (isLoggedIn && loginUser.bambuTokenExpireTime && !hasNotifiedBambuToken.current) {
            const expireTime = new Date(loginUser.bambuTokenExpireTime).getTime()
            const now = new Date().getTime()
            const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000

            if (expireTime - now <= fiveDaysInMs) {
                hasNotifiedBambuToken.current = true
                const isExpired = expireTime <= now
                toast.warning(isExpired ? '拓竹账号授权已过期' : '拓竹账号授权即将过期', {
                    description: isExpired ? '您的拓竹账号授权已失效，请重新授权。' : '您的拓竹账号授权将于 5 天内过期，请及时处理。',
                    action: {
                        label: '前往处理',
                        onClick: () => navigate('/user/center'),
                    },
                    duration: 10000,
                })
            }
        }
    }, [isLoggedIn, loginUser.bambuTokenExpireTime, navigate])

    const visibleNavItems = useMemo(
        () => navItems.filter((item) => (!item.requiresAuth || isLoggedIn) && !(isMobile && item.hideOnMobile)),
        [isLoggedIn, isMobile],
    )

    const isVip = useMemo(() => {
        if (!loginUser.vipExpireTime) return false
        return new Date(loginUser.vipExpireTime) > new Date()
    }, [loginUser.vipExpireTime])

    const getInitials = (name: string) => {
        if (!name) return ''
        return name.charAt(0).toUpperCase()
    }

    const handleLogout = async () => {
        try {
            await logout()
            toast.success('退出成功')
            resetLoginUser()
            clearUserConfig()
            navigate('/user/login')
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '退出失败')
        }
    }

    const runVersionCheck = useCallback(async (mode: 'manual' | 'auto') => {
        if (isVersionCheckRunning.current) return
        isVersionCheckRunning.current = true

        const isManual = mode === 'manual'
        const loadingToastId = isManual ? toast.loading('正在检测版本...') : undefined
        if (isManual) {
            setIsCheckingVersion(true)
        }

        try {
            const result = await checkLatestVersion()
            if (loadingToastId) {
                toast.dismiss(loadingToastId)
            }

            if (result.hasUpdate) {
                toast.info(`发现新版本 ${result.latestVersion}`, {
                    description: (
                        <span className="whitespace-pre-line">
                            {`${result.title}（发布于 ${result.publishedAt}）\n当前 ${result.backendVersion}`}
                        </span>
                    ),
                    duration: 10000,
                })
                return
            }

            if (isManual) {
                toast.success('当前已是最新版本', {
                    description: `当前 ${result.backendVersion}，最新 ${result.latestVersion}`,
                })
            }
        } catch (error) {
            if (loadingToastId) {
                toast.dismiss(loadingToastId)
            }
            if (isManual) {
                toast.error('版本检测失败', {
                    description: error instanceof Error ? error.message : '请稍后重试',
                })
            } else {
                console.warn('自动版本检测失败:', error)
            }
        } finally {
            isVersionCheckRunning.current = false
            if (isManual) {
                setIsCheckingVersion(false)
            }
        }
    }, [])

    const handleCheckVersion = useCallback(() => {
        void runVersionCheck('manual')
    }, [runVersionCheck])

    useEffect(() => {
        if (!hasCheckedAuth || !isLoggedIn || !loginUser.isIntranet) {
            return
        }

        const now = Date.now()
        const lastCheckedAt = Number(localStorage.getItem(AUTO_VERSION_CHECK_STORAGE_KEY) || 0)
        if (Number.isFinite(lastCheckedAt) && now - lastCheckedAt < AUTO_VERSION_CHECK_INTERVAL_MS) {
            return
        }

        localStorage.setItem(AUTO_VERSION_CHECK_STORAGE_KEY, now.toString())
        void runVersionCheck('auto')
    }, [hasCheckedAuth, isLoggedIn, loginUser.isIntranet, runVersionCheck])

    if (!hasCheckedAuth) {
        return (
            <div className="flex min-h-screen w-full items-center justify-center text-sm text-muted-foreground">
                正在校验登录状态...
            </div>
        )
    }

    if (!isLoggedIn) {
        const currentPath = location.pathname + location.search
        return <Navigate to={`/user/login?redirect=${encodeURIComponent(currentPath)}`} replace />
    }

    // Mobile layout
    if (isMobile) {
        return (
            <div className="layout-mobile min-h-screen bg-background">
                <main
                    className="px-4 pb-[calc(100px+env(safe-area-inset-bottom))] pt-[calc(1rem+env(safe-area-inset-top))]">
                    <Outlet/>
                </main>

                {/* Bottom navigation */}
                <div className="fixed bottom-5 left-0 right-0 z-50 flex justify-center">
                    <nav
                        className="flex h-16 max-w-[500px] items-center justify-around rounded-2xl border border-border/50 bg-background/30 px-2 shadow-lg backdrop-blur-[32px] backdrop-saturate-180"
                        style={{width: 'calc(100% - 40px)'}}>
                        {visibleNavItems.map((item) => {
                            const isActive =
                                item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.key}
                                    to={item.key}
                                    className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors ${isActive
                                        ? 'text-primary'
                                        : 'text-muted-foreground'
                                    }`}
                                >
                                    <Icon size={20} strokeWidth={isActive ? 2.5 : 2}/>
                                    <span className="text-[10px] font-medium">{item.label}</span>
                                </Link>
                            )
                        })}
                        <Link
                            to={isLoggedIn ? '/user/center' : '/user/login'}
                            className={`flex flex-1 flex-col items-center justify-center gap-0.5 py-1 transition-colors ${location.pathname.startsWith('/user')
                                ? 'text-primary'
                                : 'text-muted-foreground'
                            }`}
                        >
                            <User size={20} strokeWidth={location.pathname.startsWith('/user') ? 2.5 : 2}/>
                            <span className="text-[10px] font-medium">我的</span>
                        </Link>
                    </nav>
                </div>
            </div>
        )
    }

    // Desktop layout
    return (
        <div className="layout-desktop min-h-screen flex flex-col items-center">
            {/* Header */}
            <header
                className="fixed left-0 right-0 top-0 z-50 flex w-full justify-center border-b border-border/60 bg-background/70 shadow-sm backdrop-blur-[32px] backdrop-saturate-180">
                <div className={`flex h-16 w-full items-center px-4 md:px-6 ${isFullWidth ? '' : 'max-w-[1600px]'}`}>
                    {/* Logo */}
                    <Link to="/" className="flex w-64 shrink-0 items-center gap-3 lg:w-72">
                        <img src={logoImg} alt="logo" className="h-10"/>
                        <span className="whitespace-nowrap text-base font-medium text-foreground xl:text-lg">
                            Mars Printer Hub
                        </span>
                    </Link>

                    {/* Navigation */}
                    <nav className="flex flex-1 items-center gap-1">
                        {visibleNavItems.map((item) => {
                            const isActive =
                                item.key === '/' ? location.pathname === '/' : location.pathname.startsWith(item.key)
                            const Icon = item.icon
                            return (
                                <Link
                                    key={item.key}
                                    to={item.key}
                                    className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${isActive
                                        ? 'bg-primary/5 text-primary'
                                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                                    }`}
                                >
                                    <Icon size={16}/>
                                    {item.label}
                                </Link>
                            )
                        })}
                    </nav>

                    {/* Theme toggle + User area */}
                    <div className="flex items-center gap-1">
                        {loginUser.isIntranet && (
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={handleCheckVersion}
                                disabled={isCheckingVersion}
                                className="px-2"
                                title="检查更新"
                                aria-label="检查更新"
                            >
                                <RefreshCw size={16} className={isCheckingVersion ? 'animate-spin' : ''}/>
                            </Button>
                        )}
                        <LayoutToggle/>
                        <CornerStyleToggle/>
                        <ThemeToggle/>
                        {isLoggedIn ? (
                            <DropdownMenu modal={false}>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" className="h-auto cursor-pointer px-2 py-1 text-sm">
                                        <Avatar className={`h-8 w-8 ${isVip ? 'ring-2 ring-amber-400' : ''}`}>
                                            <AvatarImage src={loginUser.avatar}/>
                                            <AvatarFallback className="bg-blue-500 text-sm text-white">
                                                {getInitials(loginUser.nickname || loginUser.username || '')}
                                            </AvatarFallback>
                                        </Avatar>
                                        <span className="whitespace-nowrap">
                                            {loginUser.nickname || loginUser.username}
                                        </span>
                                        {isVip && <Crown size={16} className="text-amber-400 drop-shadow-sm"/>}
                                        <ChevronDown size={14}/>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => navigate('/user/center')}>
                                        <UserCircle size={15}/>
                                        个人中心
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => window.open('https://wiki.hcgl.top/', '_blank', 'noopener,noreferrer')}>
                                        <BookOpen size={15}/>
                                        使用指南
                                    </DropdownMenuItem>
                                    {loginUser.role === 'admin' && isUserManageEnabled && (
                                        <DropdownMenuItem onClick={() => navigate('/user/manage')}>
                                            <Users size={15}/>
                                            用户管理
                                        </DropdownMenuItem>
                                    )}
                                    {loginUser.isIntranet && (
                                        <DropdownMenuItem onClick={() => navigate('/system/config')}>
                                            <Settings size={15}/>
                                            系统设置
                                        </DropdownMenuItem>
                                    )}
                                    <DropdownMenuItem onClick={handleLogout}>
                                        <LogOut size={15}/>
                                        退出登录
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        ) : (
                            <Button asChild>
                                <Link to="/user/login">登录</Link>
                            </Button>
                        )}
                    </div>
                </div>
            </header>

            {/* Content */}
            <main className={`flex-1 w-full px-4 md:px-6 pb-20 pt-24 ${isFullWidth ? '' : 'max-w-[1600px]'}`}>
                <Outlet/>
            </main>

            {/* Footer */}
            <footer
                className="w-full border-t border-border bg-background/88 p-4 text-center backdrop-blur-[10px] mt-auto">
                <div className="space-y-2">
                    <div className="text-sm text-muted-foreground">Mars Printer Hub</div>
                </div>
            </footer>
        </div>
    )
}
