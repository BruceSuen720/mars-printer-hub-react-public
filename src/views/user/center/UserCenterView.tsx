import { useUserCenter } from './useUserCenter'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { toast } from 'sonner'
import { useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Combobox } from '@/components/ui/combobox'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
    Dialog,
    DialogContent,
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
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
    InputOTP,
    InputOTPGroup,
    InputOTPSlot,
    InputOTPSeparator
} from '@/components/ui/input-otp'
import { Separator } from '@/components/ui/separator'
import {
    Crown,
    CheckCircle,
    Link as LinkIcon,
    RefreshCw,
    Unlink,
    Save,
    Send,
    Loader2,
    Mail,
    HeartHandshake,
    Upload,
    ShieldCheck,
    Lock,
    User,
    CalendarDays,
    Settings2,
    KeyRound,
    Fingerprint,
    Trash2,
    CloudSync,
    Globe2,
    ShieldAlert,
} from 'lucide-react'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { FormattedTime } from '@/components/ui/formatted-time'
import { ApiKeyManageDialog } from '@/components/user/ApiKeyManageDialog'
import { useNavigate } from 'react-router-dom'
import { cn } from '@/lib/utils'

const sponsorPayImageUrl = 'https://spool-r2.hcgl.top/pay.webp'

const vipBenefits = [
    { label: '同时连接 10 台设备', note: '多台设备监控更加顺畅，如有大规模部署需求可联系作者' },
    { label: '激活图片功能', note: '支持上传头像、查看设备实时打印封面图' },
    { label: '激活完整打印历史记录', note: '可导入设备所有打印历史记录' },
    { label: '设备离线自动重连', note: '网络波动时，后台自动尝试重新建立连接' },
]

const EMAIL_SUFFIXES = [
    'qq.com',
    'gmail.com',
    '163.com',
    'outlook.com',
    'foxmail.com',
    'icloud.com',
    '126.com',
    'hotmail.com',
]

const EMAIL_SUFFIX_OPTIONS = EMAIL_SUFFIXES.map((s) => ({ label: s, value: s }))
const BAMBU_REGION_LABELS = {
    CHINA: '中国大陆',
    OTHER: '海外地区',
} as const

function EmailInput({ value, onChange }: { value: string; onChange: (email: string) => void }) {
    const atIdx = value.indexOf('@')
    const prefix = atIdx === -1 ? value : value.slice(0, atIdx)
    const suffix = atIdx === -1 ? '' : value.slice(atIdx + 1)

    const handlePrefixChange = (newPrefix: string) => {
        onChange(suffix ? `${newPrefix}@${suffix}` : newPrefix)
    }

    const handleSuffixChange = (newSuffix: string) => {
        onChange(prefix ? `${prefix}@${newSuffix}` : newSuffix ? `@${newSuffix}` : '')
    }

    return (
        <div className="flex items-center gap-2">
            <Input
                value={prefix}
                onChange={(e) => handlePrefixChange(e.target.value)}
                placeholder="邮箱账号"
                className="flex-1 min-w-0"
            />
            <span className="text-muted-foreground text-sm shrink-0">@</span>
            <Combobox
                options={EMAIL_SUFFIX_OPTIONS}
                value={suffix}
                onChange={handleSuffixChange}
                placeholder="选择后缀"
                searchPlaceholder="搜索或输入..."
                allowCustom
                className="w-[140px] shrink-0"
            />
        </div>
    )
}

export default function UserCenterView() {
    const navigate = useNavigate()
    const isMobile = useDeviceStore((s) => s.isMobile)
    const [passkeyModalOpen, setPasskeyModalOpen] = useState(false)
    const [apiKeyModalOpen, setApiKeyModalOpen] = useState(false)
    const [bambuRegionModalOpen, setBambuRegionModalOpen] = useState(false)
    
    const {
        loginUser,
        userForm,
        setUserForm,
        loading,
        avatarLoading,
        getInitials,
        handleAvatarUpload,
        handleSubmit,
        bindModalOpen,
        setBindModalOpen,
        bindForm,
        setBindForm,
        bambuRegion,
        setBambuRegion,
        bambuRegionSaving,
        sendingCode,
        countdown,
        sendVerificationCode,
        handleBindBambu,
        handleBambuRegionSubmit,
        handleUnbind,
        handleSyncAll,
        syncAllLoading,
        passwordForm,
        setPasswordForm,
        passwordLoading,
        handlePasswordSubmit,
        passkeySupported,
        passkeyList,
        passkeyLoading,
        passkeyCreating,
        passkeyDeletingId,
        passkeyNickname,
        setPasskeyNickname,
        handleCreatePasskey,
        handleDeletePasskey,
        apiKeyItem,
        apiKeyLoading,
        apiKeySaving,
        apiKeyActionLoading,
        apiKeyForm,
        setApiKeyForm,
        latestCreatedApiKey,
        fetchCurrentApiKey,
        handleCreateApiKey,
        handleUpdateApiKey,
        handleEnableApiKey,
        handleDisableApiKey,
        handleResetApiKey,
        isVip,
        vipModalOpen,
        setVipModalOpen,
        payModalOpen,
        setPayModalOpen,
        copyEmail,
        showPayModal,
    } = useUserCenter()

    const fileInputRef = useRef<HTMLInputElement>(null)
    const canUploadAvatar = loginUser.isIntranet || isVip

    return (
        <div className={isMobile ? 'space-y-6 p-4 pb-10' : 'space-y-6 p-6 pb-12'}>
            
            {/* ── Page Header ── */}
            <div className="border-b border-border/50 pb-4">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">个人中心</h1>
            </div>

            {/* ── Profile Summary Card ── */}
            <div className="rounded-xl border bg-card text-card-foreground p-6 shadow-xs">
                <div className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex flex-col items-center gap-5 sm:flex-row text-center sm:text-left">
                        {/* Avatar */}
                        <div className="relative shrink-0 group">
                            <div
                                data-keep-round
                                className={cn(
                                    'relative inline-flex rounded-full bg-background p-1 border border-border/60 shadow-xs transition-all',
                                    canUploadAvatar ? 'cursor-pointer hover:border-primary/40' : 'cursor-not-allowed'
                                )}
                                onClick={() => {
                                    if (canUploadAvatar) fileInputRef.current?.click()
                                }}
                            >
                                <Avatar className="h-20 w-20 rounded-full border border-border/30 sm:h-24 sm:w-24">
                                    <AvatarImage src={userForm.avatar} className="object-cover" />
                                    <AvatarFallback className="bg-muted text-2xl font-semibold text-muted-foreground">
                                        {getInitials(userForm.nickname || userForm.username)}
                                    </AvatarFallback>
                                </Avatar>

                                {isVip && (
                                    <div
                                        data-keep-round
                                        className="absolute -bottom-1 -right-1 bg-amber-500 text-amber-950 rounded-full p-1.5 shadow-sm border-2 border-background"
                                    >
                                        <Crown size={12} />
                                    </div>
                                )}

                                {avatarLoading ? (
                                    <div
                                        data-keep-round
                                        className="absolute inset-1 rounded-full flex items-center justify-center bg-black/40 backdrop-blur-xs z-10"
                                    >
                                        <Loader2 size={18} className="animate-spin text-white" />
                                    </div>
                                ) : (
                                    <div
                                        data-keep-round
                                        className="absolute inset-1 rounded-full flex items-center justify-center bg-black/0 opacity-0 transition-all duration-200 group-hover:bg-black/55 group-hover:opacity-100 z-10"
                                    >
                                        <div className="flex flex-col items-center text-white text-center">
                                            <Upload size={14} className="mb-0.5" />
                                            <span className="text-[9px] font-medium leading-normal">
                                                {canUploadAvatar ? '更换头像' : '受限'}
                                            </span>
                                        </div>
                                    </div>
                                )}
                                <Input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/jpeg,image/png"
                                    className="hidden"
                                    disabled={!canUploadAvatar}
                                    onChange={handleAvatarUpload}
                                />
                            </div>
                        </div>

                        {/* Name and Info */}
                        <div className="space-y-1.5">
                            <div className="flex flex-wrap items-center justify-center gap-2 sm:justify-start">
                                <h2 className="text-xl font-bold tracking-tight text-foreground sm:text-2xl">
                                    {loginUser.nickname || loginUser.username}
                                </h2>
                                {loginUser.role === 'admin' && (
                                    <Badge variant="outline" className="font-normal text-xs bg-muted/40 border-border/80 text-foreground py-0 h-5 px-2">
                                        <ShieldCheck size={12} className="mr-1 text-primary/70 shrink-0" /> 管理员
                                    </Badge>
                                )}
                            </div>
                            
                            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground sm:justify-start">
                                <span className="flex items-center">
                                    <User size={13} className="mr-1 opacity-70 shrink-0" />
                                    @{loginUser.username}
                                </span>
                                {loginUser.createTime && (
                                    <span className="flex items-center">
                                        <CalendarDays size={13} className="mr-1 opacity-70 shrink-0" />
                                        加入于 <FormattedTime time={loginUser.createTime} className="ml-0.5" />
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-wrap gap-2 w-full sm:w-auto justify-center sm:justify-end">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer font-medium"
                            onClick={() => navigate('/user/preferences')}
                        >
                            <Settings2 size={14} className="mr-1" />
                            偏好设置
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer font-medium"
                            onClick={() => setPasskeyModalOpen(true)}
                        >
                            <Fingerprint size={14} className="mr-1" />
                            Passkey 管理
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="cursor-pointer font-medium"
                            onClick={() => setApiKeyModalOpen(true)}
                        >
                            <KeyRound size={14} className="mr-1" />
                            API Key 管理
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Main Layout Grid ── */}
            <div className="space-y-6">
                {/* Row 1: Basic Info & Password */}
                <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
                    {/* Basic Info Form */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-xs flex flex-col h-full">
                        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4 shrink-0">
                            <User size={15} className="text-primary/70" />
                            <h3 className="text-base font-semibold tracking-tight text-foreground">基本信息</h3>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="grid gap-5 sm:grid-cols-2">
                                {/* username */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">用户名</Label>
                                    <Input
                                        value={userForm.username}
                                        disabled
                                        className="bg-muted/30 text-muted-foreground cursor-not-allowed shadow-none"
                                    />
                                    <p className="text-[11px] text-muted-foreground leading-none">用户名作为唯一登录凭证，不可更改</p>
                                </div>
                                {/* nickname */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">昵称</Label>
                                    <Input
                                        value={userForm.nickname}
                                        onChange={(e) =>
                                            setUserForm((prev) => ({
                                                ...prev,
                                                nickname: e.target.value,
                                            }))
                                        }
                                        placeholder="显示昵称"
                                        maxLength={12}
                                    />
                                </div>
                                {/* email */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">邮箱</Label>
                                    <EmailInput
                                        value={userForm.email}
                                        onChange={(email) =>
                                            setUserForm((prev) => ({
                                                ...prev,
                                                email,
                                            }))
                                        }
                                    />
                                </div>
                                {/* phone */}
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">手机号</Label>
                                    <Input
                                        value={userForm.phone}
                                        onChange={(e) =>
                                            setUserForm((prev) => ({
                                                ...prev,
                                                phone: e.target.value,
                                            }))
                                        }
                                        placeholder="11 位手机号"
                                        maxLength={11}
                                    />
                                </div>
                            </div>

                            <div className="space-y-5 mt-auto pt-5">
                                <Separator className="bg-border/50" />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handleSubmit}
                                        disabled={loading || avatarLoading}
                                        className="cursor-pointer"
                                    >
                                        {loading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                                        保存基本信息
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Password Card */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-xs flex flex-col h-full">
                        <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4 shrink-0">
                            <Lock size={15} className="text-primary/70" />
                            <h3 className="text-base font-semibold tracking-tight text-foreground">修改密码</h3>
                        </div>
                        <div className="p-5 flex-1 flex flex-col justify-between">
                            <div className="space-y-3">
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">旧密码</Label>
                                    <Input
                                        type="password"
                                        value={passwordForm.oldPassword}
                                        onChange={(e) => setPasswordForm((p) => ({...p, oldPassword: e.target.value}))}
                                        placeholder="输入当前密码"
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">新密码</Label>
                                    <Input
                                        type="password"
                                        value={passwordForm.newPassword}
                                        onChange={(e) => setPasswordForm((p) => ({...p, newPassword: e.target.value}))}
                                        placeholder="新密码（至少 8 位）"
                                        className="h-9"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <Label className="text-xs text-muted-foreground">确认新密码</Label>
                                    <Input
                                        type="password"
                                        value={passwordForm.confirmPassword}
                                        onChange={(e) => setPasswordForm((p) => ({
                                            ...p,
                                            confirmPassword: e.target.value
                                        }))}
                                        placeholder="再次输入新密码"
                                        className="h-9"
                                    />
                                </div>
                            </div>
                            <div className="space-y-5 mt-auto pt-5">
                                <Separator className="bg-border/50" />
                                <div className="flex justify-end">
                                    <Button
                                        onClick={handlePasswordSubmit}
                                        disabled={passwordLoading}
                                        className="cursor-pointer"
                                    >
                                        {passwordLoading ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                                        更新密码
                                    </Button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Row 2: Bambu Cloud Account Binding & VIP Card */}
                <div className="grid w-full grid-cols-1 gap-6 lg:grid-cols-2 items-stretch">
                    {/* Bambu Cloud Account Binding Card */}
                    <div className="rounded-xl border bg-card text-card-foreground shadow-xs flex flex-col h-full">
                        <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-4 shrink-0">
                            <div className="flex items-center gap-2 min-w-0">
                                <LinkIcon size={15} className="text-primary/70 shrink-0" />
                                <h3 className="text-base font-semibold tracking-tight text-foreground truncate">拓竹云账号绑定</h3>
                                {loginUser.bambuUsername ? (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                        已绑定
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center gap-1.5 rounded-full border border-border/70 bg-muted/50 px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                        未绑定
                                    </span>
                                )}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 shrink-0 cursor-pointer gap-1 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => setBambuRegionModalOpen(true)}
                            >
                                <Globe2 size={13} />
                                {BAMBU_REGION_LABELS[loginUser.bambuRegion || 'CHINA']}
                            </Button>
                        </div>
                        <div className="p-5 flex-1 flex flex-col">
                            {loginUser.bambuUsername ? (
                                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 text-sm sm:grid-cols-2">
                                    <div className="space-y-1">
                                        <dt className="text-xs text-muted-foreground">绑定账号</dt>
                                        <dd
                                            className="truncate font-semibold text-foreground"
                                            title={loginUser.bambuUsername}
                                        >
                                            {loginUser.bambuUsername}
                                        </dd>
                                    </div>
                                    <div className="space-y-1">
                                        <dt className="text-xs text-muted-foreground">账户区域</dt>
                                        <dd className="font-semibold text-foreground">
                                            {BAMBU_REGION_LABELS[loginUser.bambuRegion || 'CHINA']}
                                        </dd>
                                    </div>
                                    <div className="space-y-1 sm:col-span-2">
                                        <dt className="text-xs text-muted-foreground">凭证有效期</dt>
                                        <dd className="font-semibold text-foreground tabular-nums">
                                            {loginUser.bambuTokenExpireTime ? (
                                                <FormattedTime time={loginUser.bambuTokenExpireTime} />
                                            ) : (
                                                '长期有效'
                                            )}
                                        </dd>
                                    </div>
                                </dl>
                            ) : (
                                <div className="space-y-3">
                                    <p className="text-sm leading-relaxed text-foreground/80">
                                        绑定拓竹云账号后，可自动同步账号下所有打印机，并通过官方云 MQTT 实时接收打印状态。
                                    </p>
                                    <ul className="space-y-2 text-xs text-muted-foreground">
                                        <li className="flex items-start gap-2">
                                            <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                                            <span>自动同步账号下的拓竹打印机，无需手动填写 IP 与访问密码</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <CheckCircle size={13} className="mt-0.5 shrink-0 text-emerald-500" />
                                            <span>通过官方云 MQTT 实时接收打印状态、喷嘴温度、进度</span>
                                        </li>
                                        <li className="flex items-start gap-2">
                                            <ShieldCheck size={13} className="mt-0.5 shrink-0 text-sky-500" />
                                            <span>使用拓竹官方鉴权流程，本系统不存储明文密码</span>
                                        </li>
                                    </ul>
                                </div>
                            )}

                            <div className="mt-auto flex flex-wrap items-center justify-end gap-2 pt-5">
                                {loginUser.bambuUsername ? (
                                    <>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="cursor-pointer"
                                                >
                                                    更多
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="start" className="w-44">
                                                <DropdownMenuItem
                                                    className="cursor-pointer"
                                                    onClick={() => setBindModalOpen(true)}
                                                >
                                                    <RefreshCw size={14} className="mr-2" />
                                                    刷新授权
                                                </DropdownMenuItem>
                                                <DropdownMenuSeparator />
                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <DropdownMenuItem
                                                            className="cursor-pointer text-destructive focus:text-destructive"
                                                            onSelect={(e) => e.preventDefault()}
                                                        >
                                                            <Unlink size={14} className="mr-2" />
                                                            解绑账号
                                                        </DropdownMenuItem>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle className="flex items-center gap-2">
                                                                <ShieldAlert size={16} className="text-destructive" />
                                                                确定要解绑拓竹账号吗？
                                                            </AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                解绑后将无法同步设备信息，并且部分依赖拓竹云的功能将失效。
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={handleUnbind}
                                                                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                确定解绑
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </DropdownMenuContent>
                                        </DropdownMenu>

                                        <Button
                                            size="sm"
                                            className="cursor-pointer"
                                            onClick={handleSyncAll}
                                            disabled={syncAllLoading}
                                        >
                                            {syncAllLoading ? (
                                                <Loader2 size={14} className="mr-1.5 shrink-0 animate-spin" />
                                            ) : (
                                                <CloudSync size={14} className="mr-1.5 shrink-0" />
                                            )}
                                            同步设备
                                        </Button>
                                    </>
                                ) : (
                                    <Button
                                        size="sm"
                                        className="cursor-pointer"
                                        onClick={() => setBindModalOpen(true)}
                                    >
                                        <LinkIcon size={14} className="mr-1.5 shrink-0" /> 立即绑定拓竹账号
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* VIP Card — hide for intranet users */}
                    {!loginUser.isIntranet && (
                        <div className={cn(
                            'rounded-xl border bg-card text-card-foreground shadow-xs transition-colors flex flex-col h-full',
                            isVip && 'border-amber-500/40 dark:border-amber-500/25',
                        )}>
                            <div className="flex items-center gap-2 border-b border-border/60 px-5 py-4 shrink-0">
                                <Crown size={15} className="text-amber-500" />
                                <h3 className="text-base font-semibold tracking-tight text-foreground">VIP 会员</h3>
                            </div>
                            <div className="p-5 flex-1 flex flex-col justify-between">
                                <div className="space-y-4">
                                    <div>
                                        {isVip ? (
                                            <Badge
                                                variant="outline"
                                                className="w-full justify-center border-amber-500/30 bg-amber-500/10 py-1.5 text-amber-700 dark:text-amber-400 font-medium"
                                            >
                                                <Crown size={12} className="mr-1.5 shrink-0" />
                                                有效期至：
                                                <FormattedTime time={loginUser.vipExpireTime} className="ml-1" />
                                            </Badge>
                                        ) : (
                                            <Badge variant="secondary" className="w-full justify-center py-1.5 font-normal text-muted-foreground">
                                                当前非 VIP 用户
                                            </Badge>
                                        )}
                                    </div>

                                    <ul className="space-y-2.5">
                                        {vipBenefits.map(({label, note}) => (
                                            <li key={label} className="flex items-start gap-2 text-sm text-foreground">
                                                <CheckCircle size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                                                <div className="space-y-0.5 leading-tight">
                                                    <div className="font-medium">{label}</div>
                                                    {note && (
                                                        <div className="text-xs text-muted-foreground leading-normal">
                                                            {note}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                </div>

                                <div className="flex justify-end mt-auto pt-4">
                                    <Button
                                        variant={isVip ? "outline" : "default"}
                                        size="sm"
                                        className={cn("cursor-pointer", isVip ? "border-amber-500/30 hover:bg-amber-500/10 text-amber-700 dark:text-amber-400" : "")}
                                        onClick={() => setVipModalOpen(true)}
                                    >
                                        <Crown size={14} className="mr-1.5" />
                                        {isVip ? '续费 VIP' : '升级为 VIP'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Sponsor Card ── */}
            <div className="group relative overflow-hidden rounded-xl border bg-card text-card-foreground shadow-xs transition-colors hover:border-primary/40">
                <span
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-px opacity-70"
                    style={{ background: 'linear-gradient(90deg, transparent, rgb(244 63 94 / 0.4), transparent)' }}
                />
                <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-7">
                    <div className="flex flex-1 items-start gap-3">
                        <HeartHandshake size={18} className="mt-0.5 shrink-0 text-rose-500" />
                        <div className="min-w-0 space-y-1.5">
                            <h3 className="text-base font-semibold tracking-tight text-foreground">
                                支持项目发展
                            </h3>
                            <p className="text-sm leading-relaxed text-muted-foreground">
                                本系统由个人开发者在业余时间开发与维护。如果它对您有帮助，欢迎赞助，用于维持服务器与云服务的持续运行。
                            </p>
                        </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap gap-2 sm:flex-nowrap">
                        <Button
                            variant="outline"
                            size="sm"
                            className="cursor-pointer"
                            onClick={copyEmail}
                        >
                            <Mail size={14} />
                            联系作者
                        </Button>
                        <Button
                            size="sm"
                            className="cursor-pointer bg-rose-500 text-white hover:bg-rose-500/90 dark:bg-rose-500 dark:text-white dark:hover:bg-rose-500/90"
                            onClick={showPayModal}
                        >
                            <HeartHandshake size={14} />
                            赞助支持
                        </Button>
                    </div>
                </div>
            </div>

            {/* ── Bambu Region Modal ── */}
            <Dialog open={bambuRegionModalOpen} onOpenChange={setBambuRegionModalOpen}>
                <DialogContent className="max-w-[420px]">
                    <DialogHeader>
                        <DialogTitle>修改拓竹账户区域</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <p className="text-sm text-muted-foreground leading-normal">
                            当前状态：{loginUser.bambuUsername ? `已绑定（账号: ${loginUser.bambuUsername}）` : '未绑定'}
                        </p>
                        <div className="rounded-lg border border-amber-200/60 bg-amber-50/50 px-4 py-3 text-xs text-amber-900 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200 leading-normal">
                            更改区域会清空系统中已存储的拓竹账户绑定及同步设备，该操作不影响已有耗材信息。
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">所属区域</Label>
                            <Select
                                value={bambuRegion}
                                onValueChange={(value) => setBambuRegion(value as 'CHINA' | 'OTHER')}
                            >
                                <SelectTrigger className="w-full cursor-pointer">
                                    <SelectValue placeholder="请选择拓竹账户区域" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="CHINA">中国大陆</SelectItem>
                                    <SelectItem value="OTHER">海外地区</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <AlertDialog>
                            <AlertDialogTrigger asChild>
                                <Button
                                    className="w-full cursor-pointer"
                                    disabled={bambuRegionSaving || bambuRegion === (loginUser.bambuRegion || 'CHINA')}
                                >
                                    {bambuRegionSaving ? (
                                        <Loader2 size={14} className="mr-1.5 animate-spin"/>
                                    ) : (
                                        <Save size={14} className="mr-1.5"/>
                                    )}
                                    保存区域设置
                                </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>确定要修改拓竹账户区域吗？</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        更改区域会清空系统中存储的拓竹账户信息及绑定设备，不会影响已有耗材信息。
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                    <AlertDialogAction
                                        className="cursor-pointer"
                                        onClick={async () => {
                                            await handleBambuRegionSubmit()
                                            setBambuRegionModalOpen(false)
                                        }}
                                    >
                                        确认修改
                                    </AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── Bambu Bind Dialog ── */}
            <Dialog open={bindModalOpen} onOpenChange={setBindModalOpen}>
                <DialogContent className="max-w-[460px]">
                    <DialogHeader>
                        <DialogTitle>
                            {loginUser.bambuUsername ? '刷新拓竹账号' : '绑定拓竹账号'}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">拓竹账号</Label>
                            <Input
                                value={bindForm.account}
                                onChange={(e) =>
                                    setBindForm((prev) => ({
                                        ...prev,
                                        account: e.target.value,
                                    }))
                                }
                                placeholder={bambuRegion === 'CHINA' ? '请输入手机号' : '请输入邮箱'}
                            />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">验证码</Label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <InputOTP
                                        id="digits-only"
                                        maxLength={6}
                                        value={bindForm.code}
                                        onChange={(val) =>
                                            setBindForm((prev) => ({...prev, code: val}))
                                        }
                                    >
                                        <InputOTPGroup>
                                            <InputOTPGroup>
                                                <InputOTPSlot index={0}/>
                                                <InputOTPSlot index={1}/>
                                            </InputOTPGroup>
                                            <InputOTPSeparator/>
                                            <InputOTPGroup>
                                                <InputOTPSlot index={2}/>
                                                <InputOTPSlot index={3}/>
                                            </InputOTPGroup>
                                            <InputOTPSeparator/>
                                            <InputOTPGroup>
                                                <InputOTPSlot index={4}/>
                                                <InputOTPSlot index={5}/>
                                            </InputOTPGroup>
                                        </InputOTPGroup>
                                    </InputOTP>
                                </div>
                                <Button
                                    variant="outline"
                                    className="shrink-0 cursor-pointer min-w-[110px]"
                                    disabled={
                                        sendingCode || countdown > 0 || !bindForm.account
                                    }
                                    onClick={sendVerificationCode}
                                >
                                    {sendingCode ? <Loader2 size={14} className="animate-spin"/> :
                                        <Send size={14} className="mr-1"/>}
                                    {countdown > 0
                                        ? `${countdown}秒后重发`
                                        : '发送验证码'}
                                </Button>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            className="cursor-pointer"
                            onClick={() => setBindModalOpen(false)}
                        >
                            取消
                        </Button>
                        <Button
                            className="cursor-pointer"
                            onClick={handleBindBambu}
                            disabled={!bindForm.account || !bindForm.code}
                        >
                            {loginUser.bambuUsername ? '刷新绑定' : '确认绑定'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ── Passkey Modal ── */}
            <Dialog open={passkeyModalOpen} onOpenChange={setPasskeyModalOpen}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Passkey 免密登录凭证管理</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-5 py-2">
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-foreground">使用当前设备添加免密凭证</p>
                                <Badge variant={passkeySupported ? 'outline' : 'secondary'} className={cn(passkeySupported ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' : '')}>
                                    {passkeySupported ? '设备已支持' : '不支持'}
                                </Badge>
                            </div>
                            <p className="text-xs text-muted-foreground leading-normal">
                                绑定后，您可以在后续登录流程中直接使用系统的生物识别（如指纹、面容）或设备 PIN 码完成登录。
                            </p>
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs text-muted-foreground">Passkey 名称</Label>
                            <Input
                                value={passkeyNickname}
                                onChange={(e) => setPasskeyNickname(e.target.value)}
                                placeholder="例如：我的 MacBook Pro"
                                maxLength={100}
                                disabled={!passkeySupported || passkeyCreating}
                            />
                        </div>

                        <Button
                            onClick={handleCreatePasskey}
                            disabled={!passkeySupported || passkeyCreating}
                            className="w-full cursor-pointer"
                        >
                            {passkeyCreating ? (
                                <Loader2 size={14} className="mr-1 animate-spin"/>
                            ) : (
                                <Fingerprint size={14} className="mr-1"/>
                            )}
                            添加当前设备 Passkey
                        </Button>

                        <Separator className="bg-border/50" />

                        <div className="space-y-3">
                            <div className="flex items-center justify-between gap-3">
                                <p className="text-sm font-medium text-foreground">已绑定的凭证列表</p>
                                {passkeyLoading &&
                                    <Loader2 size={14} className="animate-spin text-muted-foreground"/>}
                            </div>

                            {passkeyList.length === 0 ? (
                                <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                                    暂无已绑定的 Passkey 凭证
                                </div>
                            ) : (
                                <div className="max-h-[300px] space-y-3 overflow-y-auto pr-1 themed-scrollbar">
                                    {passkeyList.map((passkey) => (
                                        <div
                                            key={passkey.id}
                                            className="rounded-xl border bg-muted/20 px-4 py-4"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="min-w-0 space-y-1.5">
                                                    <div className="flex items-center gap-2">
                                                        <p className="truncate text-sm font-semibold text-foreground">
                                                            {passkey.nickname || '未命名 Passkey'}
                                                        </p>
                                                        {passkey.attachment && (
                                                            <Badge variant="outline" className="font-normal text-[10px] h-4.5 py-0 px-1.5 border-border/80">
                                                                {passkey.attachment}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="font-mono text-[10px] text-muted-foreground truncate">
                                                        凭证 ID：{passkey.credentialId}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        传输方式：{passkey.transports || '未知'}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground">
                                                        添加时间：{passkey.createTime ?
                                                        <FormattedTime time={passkey.createTime}/> : '未知'}
                                                    </p>
                                                </div>

                                                <AlertDialog>
                                                    <AlertDialogTrigger asChild>
                                                        <Button
                                                            variant="outline"
                                                            size="icon-sm"
                                                            className="cursor-pointer shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive border-destructive/20 dark:border-destructive/30"
                                                            disabled={!passkey.id || passkeyDeletingId === passkey.id}
                                                        >
                                                            {passkeyDeletingId === passkey.id ? (
                                                                <Loader2 size={14} className="animate-spin"/>
                                                            ) : (
                                                                <Trash2 size={14}/>
                                                            )}
                                                        </Button>
                                                    </AlertDialogTrigger>
                                                    <AlertDialogContent>
                                                        <AlertDialogHeader>
                                                            <AlertDialogTitle>确定删除这个 Passkey 吗？</AlertDialogTitle>
                                                            <AlertDialogDescription>
                                                                删除后，该设备将无法继续通过此 Passkey 进行快捷免密登录。
                                                            </AlertDialogDescription>
                                                        </AlertDialogHeader>
                                                        <AlertDialogFooter>
                                                            <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                                            <AlertDialogAction
                                                                onClick={() => passkey.id && handleDeletePasskey(passkey.id)}
                                                                className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                            >
                                                                确认删除
                                                            </AlertDialogAction>
                                                        </AlertDialogFooter>
                                                    </AlertDialogContent>
                                                </AlertDialog>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── API Key Manage Dialog ── */}
            <ApiKeyManageDialog
                open={apiKeyModalOpen}
                onOpenChange={setApiKeyModalOpen}
                apiKeyItem={apiKeyItem}
                apiKeyLoading={apiKeyLoading}
                apiKeySaving={apiKeySaving}
                apiKeyActionLoading={apiKeyActionLoading}
                apiKeyForm={apiKeyForm}
                setApiKeyForm={setApiKeyForm}
                latestCreatedApiKey={latestCreatedApiKey}
                handleRefreshApiKey={fetchCurrentApiKey}
                handleCreateApiKey={handleCreateApiKey}
                handleUpdateApiKey={handleUpdateApiKey}
                handleEnableApiKey={handleEnableApiKey}
                handleDisableApiKey={handleDisableApiKey}
                handleResetApiKey={handleResetApiKey}
            />

            {/* ── Pay QR Code Dialog ── */}
            <Dialog open={payModalOpen} onOpenChange={setPayModalOpen}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-center">赞助支持</DialogTitle>
                    </DialogHeader>
                    <div className="py-4 space-y-4 text-center flex flex-col items-center">
                        <img
                            src={sponsorPayImageUrl}
                            alt="赞助收款码"
                            className="w-72 h-72 sm:w-80 sm:h-80 object-contain rounded-lg border border-border/50 shadow-xs"
                        />
                        <p className="text-sm font-medium text-muted-foreground px-4 leading-normal max-w-sm">
                            支持支付宝、微信扫码赞助。金额任意，您的支持是维护项目持续运行的动力，非常感谢！
                        </p>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── VIP Activate Dialog ── */}
            <VipActivateDialog
                open={vipModalOpen}
                onOpenChange={setVipModalOpen}
            />
        </div>
    )
}

/* ── VIP Activate Dialog ── */
function VipActivateDialog({
                               open,
                               onOpenChange,
                           }: {
    open: boolean
    onOpenChange: (v: boolean) => void
}) {
    const [code, setCode] = useState('')
    const [loading, setLoading] = useState(false)

    const handleActivate = async () => {
        if (!code.trim()) {
            toast.error('请输入激活码')
            return
        }
        setLoading(true)
        try {
            const { activateVip } = await import('@/api/user')
            await activateVip({ code: code.trim() })
            toast.success('VIP 激活成功')
            onOpenChange(false)
            setCode('')
            await useLoginUserStore.getState().fetchLoginUser()
        } catch (error: unknown) {
            toast.error(error instanceof Error ? error.message : '激活失败')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>激活 VIP</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                    <p className="text-sm text-muted-foreground leading-normal">
                        输入激活码 <code className="font-mono text-foreground">mars</code>，
                        激活后有效期至 9999 年 12 月 31 日 23:59:59。
                    </p>
                    <div className="space-y-1.5">
                        <Label htmlFor="vip-activation-code" className="text-xs text-muted-foreground">激活码</Label>
                        <Input
                            id="vip-activation-code"
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            placeholder="请输入 mars"
                            className="font-mono text-sm"
                        />
                    </div>
                </div>
                <DialogFooter className="gap-2 sm:gap-0">
                    <Button
                        variant="outline"
                        className="cursor-pointer"
                        onClick={() => onOpenChange(false)}
                    >
                        取消
                    </Button>
                    <Button
                        className="cursor-pointer"
                        onClick={handleActivate}
                        disabled={loading}
                    >
                        {loading ? <Loader2 size={14} className="mr-1 animate-spin"/> :
                            <Crown size={14} className="mr-1"/>}
                        立即激活
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
