import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { getCurrentUser, register } from '@/api/user'
import { toast } from 'sonner'
import { Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AuthLayout from '@/layouts/AuthLayout'

type RegisterForm = {
    username: string
    nickname: string
    password: string
    checkPassword: string
    bambuRegion: 'CHINA' | 'OTHER'
}

export default function RegisterView() {
    const [form, setForm] = useState<RegisterForm>({
        username: '',
        nickname: '',
        password: '',
        checkPassword: '',
        bambuRegion: 'CHINA',
    })
    const [loading, setLoading] = useState(false)
    const [checkingAuth, setCheckingAuth] = useState(true)
    const navigate = useNavigate()
    const hasCheckedRef = useRef(false)

    useEffect(() => {
        if (hasCheckedRef.current) return
        hasCheckedRef.current = true

        const checkAuth = async () => {
            try {
                const res = await getCurrentUser()
                if (res.data.data) {
                    navigate('/', { replace: true })
                    return
                }
            } finally {
                setCheckingAuth(false)
            }
        }

        checkAuth()
    }, [navigate])

    const updateField = <K extends keyof RegisterForm>(field: K, value: RegisterForm[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.username) {
            toast.warning('请输入用户名')
            return
        }
        if (!form.password || form.password.length < 8) {
            toast.warning('密码不能小于 8 位')
            return
        }
        if (form.password !== form.checkPassword) {
            toast.warning('两次输入的密码不一致')
            return
        }

        setLoading(true)
        try {
            const registerData = {
                username: form.username,
                nickname: form.nickname,
                password: form.password,
                bambuRegion: form.bambuRegion,
            }
            await register(registerData)
            toast.success('注册成功，请登录')
            navigate('/user/login', { replace: true })
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '注册失败')
        } finally {
            setLoading(false)
        }
    }

    const handleEnterSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || loading) return
        event.preventDefault()
        void handleSubmit(event)
    }

    if (checkingAuth) {
        return (
            <AuthLayout>
                <div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    校验登录状态中...
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            {/* Header */}
            <div className="mb-6">
                <h1 className="text-xl font-semibold text-foreground">创建账号</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    注册以开始管理您的 3D 打印设备
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username">用户名</Label>
                    <Input
                        id="username"
                        placeholder="请输入用户名"
                        value={form.username}
                        onChange={(e) => updateField('username', e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        autoComplete="username"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="nickname">昵称</Label>
                    <Input
                        id="nickname"
                        placeholder="请输入昵称"
                        value={form.nickname}
                        onChange={(e) => updateField('nickname', e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        autoComplete="nickname"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="bambuRegion">拓竹账户区域</Label>
                    <Select
                        value={form.bambuRegion}
                        onValueChange={(value) => updateField('bambuRegion', value as RegisterForm['bambuRegion'])}
                    >
                        <SelectTrigger id="bambuRegion" className="w-full cursor-pointer">
                            <SelectValue placeholder="请选择拓竹账户区域" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="CHINA">中国大陆</SelectItem>
                            <SelectItem value="OTHER">海外地区</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="password">密码</Label>
                    <Input
                        id="password"
                        type="password"
                        placeholder="请输入密码（至少 8 位）"
                        value={form.password}
                        onChange={(e) => updateField('password', e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        autoComplete="new-password"
                    />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="checkPassword">确认密码</Label>
                    <Input
                        id="checkPassword"
                        type="password"
                        placeholder="请再次输入密码"
                        value={form.checkPassword}
                        onChange={(e) => updateField('checkPassword', e.target.value)}
                        onKeyDown={handleEnterSubmit}
                        autoComplete="new-password"
                    />
                </div>
                <Button type="submit" className="w-full cursor-pointer" disabled={loading}>
                    {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                        <>
                            注册
                            <ArrowRight size={16} className="ml-1" />
                        </>
                    )}
                </Button>
            </form>

            {/* Footer link */}
            <div className="mt-5 text-center text-sm text-muted-foreground">
                已有账号？{' '}
                <Button asChild variant="link" className="h-auto cursor-pointer px-0 text-sm">
                    <Link to="/user/login">立即登录</Link>
                </Button>
            </div>
        </AuthLayout>
    )
}
