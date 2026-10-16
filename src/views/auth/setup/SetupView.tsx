import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { checkSystemInitialized, setupAdmin } from '@/api/user'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { setSystemInitialized } from '@/stores/setupState'
import { toast } from 'sonner'
import { Loader2, ArrowRight, Rocket } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import AuthLayout from '@/layouts/AuthLayout'

type SetupForm = {
    username: string
    nickname: string
    password: string
    checkPassword: string
    bambuRegion: 'CHINA' | 'OTHER'
}

export default function SetupView() {
    const [form, setForm] = useState<SetupForm>({
        username: '',
        nickname: '',
        password: '',
        checkPassword: '',
        bambuRegion: 'CHINA',
    })
    const [loading, setLoading] = useState(false)
    const [checkingAccess, setCheckingAccess] = useState(true)
    const navigate = useNavigate()
    const fetchLoginUser = useLoginUserStore((s) => s.fetchLoginUser)
    const hasCheckedRef = useRef(false)

    useEffect(() => {
        if (hasCheckedRef.current) return
        hasCheckedRef.current = true

        const checkAccess = async () => {
            try {
                const res = await checkSystemInitialized()
                const initialized = res.data.data === true
                setSystemInitialized(initialized)

                if (initialized) {
                    toast.warning('系统已初始化，不能进入该页面')
                    navigate('/user/login', { replace: true })
                    return
                }
            } catch {
                // If check fails, block direct setup access by default.
                navigate('/user/login', { replace: true })
                return
            } finally {
                setCheckingAccess(false)
            }
        }

        checkAccess()
    }, [navigate])

    const updateField = <K extends keyof SetupForm>(field: K, value: SetupForm[K]) => {
        setForm((prev) => ({ ...prev, [field]: value }))
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()

        if (!form.username) {
            toast.warning('请输入管理员账号')
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
            const setupData = {
                username: form.username,
                nickname: form.nickname,
                password: form.password,
                bambuRegion: form.bambuRegion,
            }
            const res = await setupAdmin(setupData)
            if (!res.data.data) {
                toast.error('创建失败，未返回有效结果')
                return
            }
            setSystemInitialized(true)
            await fetchLoginUser()
            toast.success('管理员账号创建成功')
            navigate('/', { replace: true })
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '创建管理员失败')
        } finally {
            setLoading(false)
        }
    }

    const handleEnterSubmit = (event: React.KeyboardEvent<HTMLInputElement>) => {
        if (event.key !== 'Enter' || event.nativeEvent.isComposing || loading) return
        event.preventDefault()
        void handleSubmit(event)
    }

    if (checkingAccess) {
        return (
            <AuthLayout>
                <div className="flex min-h-[220px] items-center justify-center text-muted-foreground">
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    校验访问权限中...
                </div>
            </AuthLayout>
        )
    }

    return (
        <AuthLayout>
            {/* Header with setup indicator */}
            <div className="mb-6">
                <Badge variant="secondary" className="mb-3 gap-1.5">
                    <Rocket size={12} />
                    系统初始化
                </Badge>
                <h1 className="text-xl font-semibold text-foreground">创建管理员</h1>
                <p className="mt-1 text-sm text-muted-foreground">
                    首次使用，请创建管理员账号以开始使用系统
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                    <Label htmlFor="username">管理员账号</Label>
                    <Input
                        id="username"
                        placeholder="请设置管理员用户名"
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
                        onValueChange={(value) => updateField('bambuRegion', value as SetupForm['bambuRegion'])}
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
                        placeholder="请设置密码（至少 8 位）"
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
                            创建管理员并进入系统
                            <ArrowRight size={16} className="ml-1" />
                        </>
                    )}
                </Button>
            </form>
        </AuthLayout>
    )
}
