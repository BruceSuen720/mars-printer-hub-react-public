import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { listUsers, adminResetPassword, adminBanUser, adminUnbanUser } from '@/api/user'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { isUserManageEnabled } from '@/config/featureFlags'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { FormattedTime } from '@/components/ui/formatted-time'
import { Skeleton } from '@/components/ui/skeleton'
import { Ban, KeyRound, Loader2, RefreshCw, ShieldCheck, Unlock } from 'lucide-react'

const cardBase = 'rounded-xl border bg-card text-card-foreground shadow-xs'

export default function UserManageView() {
    const navigate = useNavigate()
    const { loginUser, fetchLoginUser } = useLoginUserStore()

    const [checkingAuth, setCheckingAuth] = useState(true)
    const [loading, setLoading] = useState(false)
    const [actionLoading, setActionLoading] = useState(false)
    const [users, setUsers] = useState<API.UserListItemVO[]>([])

    const [resetDialogOpen, setResetDialogOpen] = useState(false)
    const [resetTarget, setResetTarget] = useState<API.UserListItemVO | null>(null)
    const [resetForm, setResetForm] = useState({
        newPassword: '',
        confirmPassword: '',
    })

    const [banDialogOpen, setBanDialogOpen] = useState(false)
    const [banTarget, setBanTarget] = useState<API.UserListItemVO | null>(null)
    const [banReason, setBanReason] = useState('')

    const [unbanDialogOpen, setUnbanDialogOpen] = useState(false)
    const [unbanTarget, setUnbanTarget] = useState<API.UserListItemVO | null>(null)

    const isAdmin = useMemo(() => loginUser.role === 'admin', [loginUser.role])

    const fetchUsers = useCallback(async () => {
        setLoading(true)
        try {
            const res = await listUsers()
            setUsers(res.data.data ?? [])
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '获取用户列表失败')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        let mounted = true

        const bootstrap = async () => {
            try {
                await fetchLoginUser()
                const latestUser = useLoginUserStore.getState().loginUser

                if (!mounted) return

                if (!isUserManageEnabled) {
                    toast.error('当前环境未开启用户管理功能')
                    navigate('/', { replace: true })
                    return
                }

                if (latestUser.role !== 'admin') {
                    toast.error('仅管理员可访问用户管理页面')
                    navigate('/', { replace: true })
                    return
                }

                await fetchUsers()
            } finally {
                if (mounted) {
                    setCheckingAuth(false)
                }
            }
        }

        bootstrap()

        return () => {
            mounted = false
        }
    }, [fetchLoginUser, fetchUsers, navigate])

    const openResetDialog = (user: API.UserListItemVO) => {
        setResetTarget(user)
        setResetForm({ newPassword: '', confirmPassword: '' })
        setResetDialogOpen(true)
    }

    const openBanDialog = (user: API.UserListItemVO) => {
        setBanTarget(user)
        setBanReason('')
        setBanDialogOpen(true)
    }

    const openUnbanDialog = (user: API.UserListItemVO) => {
        setUnbanTarget(user)
        setUnbanDialogOpen(true)
    }

    const handleResetPassword = async () => {
        if (!resetTarget?.id) {
            toast.warning('用户ID不存在，无法重置密码')
            return
        }
        if (!resetForm.newPassword || !resetForm.confirmPassword) {
            toast.warning('请填写新密码和确认密码')
            return
        }
        if (resetForm.newPassword.length < 8) {
            toast.warning('新密码至少 8 位')
            return
        }
        if (resetForm.newPassword !== resetForm.confirmPassword) {
            toast.warning('两次输入的新密码不一致')
            return
        }

        setActionLoading(true)
        try {
            await adminResetPassword({
                userId: resetTarget.id,
                newPassword: resetForm.newPassword,
                confirmPassword: resetForm.confirmPassword,
            })
            toast.success(`已重置用户 ${resetTarget.username} 的密码`)
            setResetDialogOpen(false)
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '重置密码失败')
        } finally {
            setActionLoading(false)
        }
    }

    const handleBanUser = async () => {
        if (!banTarget?.id) {
            toast.warning('用户ID不存在，无法封禁')
            return
        }

        setActionLoading(true)
        try {
            await adminBanUser({
                userId: banTarget.id,
                reason: banReason.trim() || undefined,
            })
            toast.success(`已封禁用户 ${banTarget.username}`)
            setBanDialogOpen(false)
            await fetchUsers()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '封禁用户失败')
        } finally {
            setActionLoading(false)
        }
    }

    const handleUnbanUser = async () => {
        if (!unbanTarget?.id) {
            toast.warning('用户ID不存在，无法解封')
            return
        }

        setActionLoading(true)
        try {
            await adminUnbanUser({ userId: unbanTarget.id })
            toast.success(`已解封用户 ${unbanTarget.username}`)
            setUnbanDialogOpen(false)
            await fetchUsers()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '解封用户失败')
        } finally {
            setActionLoading(false)
        }
    }

    if (checkingAuth) {
        return (
            <div className="min-h-full sm:p-6">
                <div className="flex min-h-[280px] items-center justify-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={14} className="animate-spin" />
                    校验管理员权限中…
                </div>
            </div>
        )
    }

    if (!isAdmin) {
        return null
    }

    return (
        <div className="min-h-full space-y-6 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">用户管理</h1>
            </div>

            <section className={`${cardBase} overflow-hidden`}>
                <header className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">共</span>
                        <span className="font-semibold tabular-nums text-foreground">{users.length}</span>
                        <span className="text-muted-foreground">位用户</span>
                    </div>
                    <Button
                        variant="outline"
                        size="sm"
                        className="h-8 cursor-pointer"
                        onClick={() => fetchUsers()}
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                        刷新
                    </Button>
                </header>

                <Table>
                    <TableHeader>
                        <TableRow className="border-b hover:bg-transparent">
                            {['ID', '用户名', '昵称', '注册时间', '最近登录', '状态', '封禁信息'].map((h, idx) => (
                                <TableHead
                                    key={h}
                                    className={`px-4 py-3 text-xs font-semibold text-muted-foreground ${idx === 0 ? 'w-[80px]' : ''}`}
                                >
                                    {h}
                                </TableHead>
                            ))}
                            <TableHead className="px-4 py-3 text-right text-xs font-semibold text-muted-foreground">操作</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <TableRow key={`skeleton-${i}`} className="border-b hover:bg-transparent">
                                    {Array.from({ length: 8 }).map((_, j) => (
                                        <TableCell key={j} className="px-4 py-4">
                                            <Skeleton className="h-4 w-full" />
                                        </TableCell>
                                    ))}
                                </TableRow>
                            ))
                        ) : users.length === 0 ? (
                            <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={8} className="h-32 px-4 py-12 text-center text-sm text-muted-foreground">
                                    暂无用户数据
                                </TableCell>
                            </TableRow>
                        ) : (
                            users.map((user) => {
                                const isCurrentUser = Boolean(loginUser.id && user.id === loginUser.id)
                                return (
                                    <TableRow key={user.id ?? user.username} className="border-b transition-colors hover:bg-muted/40">
                                        <TableCell className="px-4 py-3 font-mono text-xs text-muted-foreground">{user.id ?? '-'}</TableCell>
                                        <TableCell className="px-4 py-3 font-medium">
                                            {user.username ?? '-'}
                                            {isCurrentUser && (
                                                <span className="ml-1.5 rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-primary">我</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-muted-foreground">{user.nickname ?? '-'}</TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                            <FormattedTime time={user.createTime} />
                                        </TableCell>
                                        <TableCell className="px-4 py-3 text-xs text-muted-foreground">
                                            <FormattedTime time={user.lastLoginTime} fallback="从未登录" />
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            {user.isBanned ? (
                                                <span className="inline-flex items-center rounded bg-rose-500/10 px-2 py-0.5 text-xs font-medium text-rose-600 dark:text-rose-400">已封禁</span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1 rounded bg-emerald-500/10 px-2 py-0.5 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                                    正常
                                                </span>
                                            )}
                                        </TableCell>
                                        <TableCell className="max-w-[260px] whitespace-normal px-4 py-3 text-xs text-muted-foreground">
                                            {user.isBanned ? (
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                                                        <span>封禁于 </span>
                                                        <span className="text-foreground"><FormattedTime time={user.banTime} /></span>
                                                    </div>
                                                    <div className="pl-3 text-muted-foreground/80">原因：{user.banReason || '无'}</div>
                                                </div>
                                            ) : (
                                                <span className="text-muted-foreground/60">-</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="px-4 py-3">
                                            <div className="flex justify-end gap-2">
                                                <Button
                                                    size="xs"
                                                    variant="outline"
                                                    className="cursor-pointer"
                                                    onClick={() => openResetDialog(user)}
                                                    disabled={!user.id || actionLoading}
                                                >
                                                    <KeyRound size={12} />
                                                    重置密码
                                                </Button>
                                                {user.isBanned ? (
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className="cursor-pointer text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 hover:border-emerald-200 dark:hover:bg-emerald-950/30"
                                                        onClick={() => openUnbanDialog(user)}
                                                        disabled={!user.id || actionLoading}
                                                    >
                                                        <Unlock size={12} />
                                                        解封
                                                    </Button>
                                                ) : (
                                                    <Button
                                                        size="xs"
                                                        variant="outline"
                                                        className="cursor-pointer text-destructive hover:text-destructive hover:bg-destructive/10 hover:border-destructive/30"
                                                        onClick={() => openBanDialog(user)}
                                                        disabled={!user.id || isCurrentUser || actionLoading}
                                                    >
                                                        <Ban size={12} />
                                                        封禁
                                                    </Button>
                                                )}
                                            </div>
                                            {isCurrentUser && !user.isBanned && (
                                                <div className="mt-1 text-right text-[11px] text-muted-foreground/70">当前登录账号不可封禁</div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })
                        )}
                    </TableBody>
                </Table>
            </section>

            <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>重置用户密码</DialogTitle>
                        <DialogDescription>
                            为用户 {resetTarget?.username ?? '-'} 设置新密码
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-3">
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">新密码</label>
                            <Input
                                type="password"
                                placeholder="至少 8 位"
                                value={resetForm.newPassword}
                                onChange={(e) => setResetForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs text-muted-foreground">确认密码</label>
                            <Input
                                type="password"
                                placeholder="再次输入新密码"
                                value={resetForm.confirmPassword}
                                onChange={(e) => setResetForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setResetDialogOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            className="cursor-pointer"
                            onClick={handleResetPassword}
                            disabled={actionLoading}
                        >
                            {actionLoading && <Loader2 size={14} className="animate-spin" />}
                            确认重置
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <ShieldCheck size={16} className="text-destructive" />
                            封禁用户
                        </DialogTitle>
                        <DialogDescription>
                            即将封禁用户 {banTarget?.username ?? '-'}，可填写封禁原因。
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-1">
                        <label className="text-xs text-muted-foreground">封禁原因（可选）</label>
                        <Textarea
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="例如：多次异常登录、违规操作等"
                            rows={4}
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setBanDialogOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            variant="destructive"
                            className="cursor-pointer"
                            onClick={handleBanUser}
                            disabled={actionLoading}
                        >
                            {actionLoading && <Loader2 size={14} className="animate-spin" />}
                            确认封禁
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <AlertDialog open={unbanDialogOpen} onOpenChange={setUnbanDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认解封</AlertDialogTitle>
                        <AlertDialogDescription>
                            将恢复用户 {unbanTarget?.username ?? '-'} 的登录权限，是否继续？
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                        <AlertDialogAction
                            className="cursor-pointer"
                            onClick={handleUnbanUser}
                            disabled={actionLoading}
                        >
                            {actionLoading && <Loader2 size={14} className="animate-spin" />}
                            确认解封
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    )
}
