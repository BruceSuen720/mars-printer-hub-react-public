import {useEffect, useRef, useState} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {finishPasskeyLogin, getCurrentUser, startPasskeyLogin, userLogin, checkSystemInitialized} from '@/api/user'
import {getPasskeyAssertion, isPasskeySupported} from '@/utils/webauthn'
import {useLoginUserStore} from '@/stores/useLoginUserStore'
import {toast} from 'sonner'
import {Loader2, ArrowRight, KeyRound} from 'lucide-react'
import {Button} from '@/components/ui/button'
import {Input} from '@/components/ui/input'
import {Label} from '@/components/ui/label'
import AuthLayout from '@/layouts/AuthLayout'
import {Link} from 'react-router-dom'

const getSafeRedirectPath = (redirect: string | null) => {
    if (!redirect) return '/'

    const trimmed = redirect.trim()
    if (!trimmed.startsWith('/') || trimmed.startsWith('//') || trimmed.includes('\\')) {
        return '/'
    }

    try {
        const url = new URL(trimmed, window.location.origin)
        if (url.origin !== window.location.origin) {
            return '/'
        }
        return `${url.pathname}${url.search}${url.hash}` || '/'
    } catch {
        return '/'
    }
}

export default function LoginView() {
    const [username, setUsername] = useState('')
    const [password, setPassword] = useState('')
    const [loading, setLoading] = useState(false)
    const [passkeyLoading, setPasskeyLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const fetchLoginUser = useLoginUserStore((s) => s.fetchLoginUser)
    const hasCheckedRef = useRef(false)
    const passkeySupported = isPasskeySupported()
    const canShowPasskeyLogin =
        typeof window !== 'undefined' &&
        window.isSecureContext

    useEffect(() => {
        if (hasCheckedRef.current) return
        hasCheckedRef.current = true

        const checkAuth = async () => {
            try {
                // 1. Check if the system is initialized
                const initRes = await checkSystemInitialized()
                if (initRes.data.data === false) {
                    navigate('/setup', {replace: true})
                    return
                }

                // 2. Check if the user is already logged in
                const res = await getCurrentUser()
                if (res.data.data) {
                    navigate('/', {replace: true})
                    return
                }
            } finally {
                setCheckingAuth(false)
            }
        }

        checkAuth()
    }, [navigate])

    const handleEnterSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || loading) return
        event.preventDefault()
        void handleSubmit(event)
    }

    const handleLoginSuccess = async () => {
        await fetchLoginUser()
        const redirect = getSafeRedirectPath(searchParams.get('redirect'))
        navigate(redirect, {replace: true})
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!username || !password) {
            toast.warning('请填写用户名和密码')
            return
        }

        setLoading(true)
        try {
            const res = await userLogin({username, password})
            if (!res.data.data) {
                toast.error('登录失败：未返回有效令牌')
                return
            }
            toast.success('登录成功')
            await handleLoginSuccess()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '登录失败')
        } finally {
            setLoading(false)
        }
    }

    const handlePasskeyLogin = async () => {
        if (!passkeySupported) {
            toast.error('当前浏览器不支持 Passkey')
            return
        }

        setPasskeyLoading(true)
        try {
            const startRes = await startPasskeyLogin({
                username: username.trim() || undefined,
            })
            const payload = startRes.data.data
            if (!payload?.requestId || !payload.options) {
                toast.error('Passkey 登录参数无效')
                return
            }

            const credential = await getPasskeyAssertion(payload.options as never)
            const verifyRes = await finishPasskeyLogin(
                { requestId: payload.requestId },
                { credential },
            )
            if (!verifyRes.data.data) {
                toast.error('Passkey 登录失败：未返回有效令牌')
                return
            }

            toast.success('登录成功')
            await handleLoginSuccess()
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : 'Passkey 登录失败'
            if (message.includes('cancel') || message.includes('timed out')) {
                toast.warning('Passkey 登录已取消')
                return
            }
            toast.error(message)
        } finally {
            setPasskeyLoading(false)
        }
    }

    if (checkingAuth) {
        return (
            <AuthLayout>
                <div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    校验登录状态中...
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground">登录</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    输入您的凭据以访问控制面板
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                        id="username"
                        placeholder="请输入用户名"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        autoComplete="username"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="请输入密码"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        autoComplete="current-password"
                    />
                </div>
                <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                    ) : (
                        <>
                            登录
                            <ArrowRight size={16} className="ml-1"/>
                        </>
                    )}
                </Button>
                {canShowPasskeyLogin && (
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full cursor-pointer"
                        disabled={!passkeySupported || passkeyLoading}
                        onClick={() => void handlePasskeyLogin()}
                    >
                        {passkeyLoading ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin"/>
                        ) : (
                            <KeyRound size={16} className="mr-2"/>
                        )}
                        使用 Passkey 登录
                    </Button>
                )}
            </form>

            {/* Footer link */}
            <div className="mt-5 text-center text-sm text-muted-foreground">
                还没有账号？{' '}
                <Button asChild variant="link" className="h-auto cursor-pointer px-0 text-sm">
                    <Link to="/user/register">注册</Link>
                </Button>
            </div>
        </AuthLayout>
    )
}
