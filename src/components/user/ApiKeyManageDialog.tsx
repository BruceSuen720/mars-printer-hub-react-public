import { useState } from 'react'
import { copyToClipboard } from '@/utils/clipboard'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
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
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { FormattedTime } from '@/components/ui/formatted-time'
import { Copy, KeyRound, Loader2, LockOpen, Plus, Power, RefreshCw } from 'lucide-react'

type UserApiKeyCreateResponse = API.UserApiKeyCreateVO
type UserApiKeyItem = API.UserApiKeyVO

type ApiKeyManageDialogProps = {
    open: boolean
    onOpenChange: (open: boolean) => void
    apiKeyItem: UserApiKeyItem | null
    apiKeyLoading: boolean
    apiKeySaving: boolean
    apiKeyActionLoading: boolean
    apiKeyForm: {
        name: string
    }
    setApiKeyForm: React.Dispatch<React.SetStateAction<{
        name: string
    }>>
    latestCreatedApiKey: UserApiKeyCreateResponse | null
    handleRefreshApiKey: () => Promise<void> | void
    handleCreateApiKey: () => Promise<void> | void
    handleUpdateApiKey: () => Promise<void> | void
    handleEnableApiKey: () => Promise<void> | void
    handleDisableApiKey: () => Promise<void> | void
    handleResetApiKey: () => Promise<void> | void
}

export function ApiKeyManageDialog({
    open,
    onOpenChange,
    apiKeyItem,
    apiKeyLoading,
    apiKeySaving,
    apiKeyActionLoading,
    apiKeyForm,
    setApiKeyForm,
    latestCreatedApiKey,
    handleRefreshApiKey,
    handleCreateApiKey,
    handleUpdateApiKey,
    handleEnableApiKey,
    handleDisableApiKey,
    handleResetApiKey,
}: ApiKeyManageDialogProps) {
    const [hiddenCreatedApiKey, setHiddenCreatedApiKey] = useState<string | null>(null)
    const createdApiKeyVisible = Boolean(
        latestCreatedApiKey?.apiKey && latestCreatedApiKey.apiKey !== hiddenCreatedApiKey,
    )

    const hasApiKey = Boolean(apiKeyItem)
    const isEnabled = apiKeyItem?.status === 1
    const currentApiKey = apiKeyItem
    const usageSummary = currentApiKey?.lastUsedTime ? '最近有调用记录' : '尚未被调用'

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[85vh] max-w-2xl flex-col overflow-hidden p-4 sm:max-h-[90vh] sm:p-6">
                <DialogHeader>
                    <DialogTitle>API Key 管理</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 overflow-y-auto py-1 pr-1 sm:space-y-5 sm:py-2">
                    <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">为开放查询接口维护一把长期凭证</p>
                            <p className="text-xs text-muted-foreground">
                                当前约束为一位用户一把 key。明文 key 只会在创建成功后展示一次。
                            </p>
                            <p className="text-xs text-muted-foreground">
                                具体使用查看：
                                <a
                                    href="https://wiki.hcgl.top/open-api"
                                    target="_blank"
                                    rel="noreferrer"
                                    className="ml-1 text-foreground underline underline-offset-4"
                                >
                                    https://wiki.hcgl.top/open-api
                                </a>
                            </p>
                        </div>
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="shrink-0 cursor-pointer"
                            onClick={() => void handleRefreshApiKey()}
                            disabled={apiKeyLoading || apiKeySaving || apiKeyActionLoading}
                        >
                            {apiKeyLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                            刷新
                        </Button>
                    </div>

                    {latestCreatedApiKey?.apiKey && createdApiKeyVisible && (
                        <div className="space-y-3 rounded-xl border border-emerald-200/60 bg-emerald-50/50 px-4 py-4 text-emerald-950 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-100">
                            <div className="flex items-center gap-2 text-sm font-medium">
                                <KeyRound size={15} />
                                新 API Key
                            </div>
                            <p className="text-xs text-emerald-800/90 dark:text-emerald-200/90">
                                这串 key 后续不会再次返回，请先保存好。
                            </p>
                            <div className="rounded-lg bg-black/[0.04] px-3 py-3 font-mono text-xs leading-6 break-all dark:bg-white/[0.06]">
                                {latestCreatedApiKey.apiKey}
                            </div>
                            <div className="flex flex-wrap gap-2">
                                <Button
                                    type="button"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => void copyToClipboard(latestCreatedApiKey.apiKey!, 'API Key 已复制')}
                                >
                                    <Copy size={14} className="mr-1" />
                                    复制
                                </Button>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="cursor-pointer"
                                    onClick={() => setHiddenCreatedApiKey(latestCreatedApiKey.apiKey ?? null)}
                                >
                                    我已保存
                                </Button>
                            </div>
                        </div>
                    )}

                    <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">名称</Label>
                        <Input
                            value={apiKeyForm.name}
                            onChange={(e) => setApiKeyForm((prev) => ({ ...prev, name: e.target.value }))}
                            placeholder="例如：桌面监控使用"
                            maxLength={100}
                            disabled={apiKeySaving || apiKeyActionLoading}
                        />
                    </div>

                    <div className="flex flex-wrap gap-2">
                        {!hasApiKey ? (
                            <Button
                                type="button"
                                className="cursor-pointer"
                                onClick={() => void handleCreateApiKey()}
                                disabled={apiKeySaving || apiKeyActionLoading}
                            >
                                {apiKeySaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Plus size={14} className="mr-1" />}
                                创建 API Key
                            </Button>
                        ) : (
                            <Button
                                type="button"
                                className="cursor-pointer"
                                onClick={() => void handleUpdateApiKey()}
                                disabled={apiKeySaving || apiKeyActionLoading}
                            >
                                {apiKeySaving ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                                保存设置
                            </Button>
                        )}

                        {hasApiKey && (
                            <>
                                {isEnabled ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="cursor-pointer"
                                        onClick={() => void handleDisableApiKey()}
                                        disabled={apiKeySaving || apiKeyActionLoading}
                                    >
                                        {apiKeyActionLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <Power size={14} className="mr-1" />}
                                        禁用
                                    </Button>
                                ) : (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="cursor-pointer"
                                        onClick={() => void handleEnableApiKey()}
                                        disabled={apiKeySaving || apiKeyActionLoading}
                                    >
                                        {apiKeyActionLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <LockOpen size={14} className="mr-1" />}
                                        启用
                                    </Button>
                                )}
                            </>
                        )}

                        {hasApiKey && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="cursor-pointer"
                                        disabled={apiKeySaving || apiKeyActionLoading}
                                    >
                                        {apiKeyActionLoading ? <Loader2 size={14} className="mr-1 animate-spin" /> : <RefreshCw size={14} className="mr-1" />}
                                        重置 Key
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>确定重置这把 API Key 吗？</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                重置后旧 key 会立即不可用，系统会生成一把新的 key，并只展示一次明文。
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                        <AlertDialogAction
                                            onClick={() => void handleResetApiKey()}
                                            className="cursor-pointer"
                                        >
                                            确认重置
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>

                    <Separator />

                    {!hasApiKey ? (
                        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
                            当前还没有 API Key。创建后可以用于后续开放查询接口调用。
                        </div>
                    ) : currentApiKey ? (
                        <div className="space-y-4 rounded-xl border bg-muted/15 px-4 py-4">
                            <div className="grid gap-3 sm:grid-cols-[minmax(0,1.4fr)_minmax(13rem,0.9fr)]">
                                <div className="rounded-xl border bg-background/50 px-4 py-4">
                                    <p className="truncate text-base font-semibold text-foreground">{currentApiKey.name}</p>
                                    <p className="mt-1 text-xs text-muted-foreground leading-normal">
                                        此 API Key 用于调用系统开放查询接口，是当前账号唯一可用凭证。
                                    </p>
                                    <div className="mt-4 rounded-lg bg-muted/60 px-3 py-2.5">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">
                                            Key 前缀
                                        </p>
                                        <p className="mt-1.5 font-mono text-sm text-foreground">
                                            {currentApiKey.keyPrefix}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid gap-3">
                                    <div className="rounded-xl border bg-background/50 px-4 py-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">
                                            使用情况
                                        </p>
                                        <p className="mt-1.5 text-sm font-medium text-foreground">{usageSummary}</p>
                                        <p className="mt-0.5 text-xs text-muted-foreground leading-normal">
                                            {currentApiKey.lastUsedTime ? <FormattedTime time={currentApiKey.lastUsedTime} /> : '尚未调用开放接口'}
                                        </p>
                                    </div>
                                    <div className="rounded-xl border bg-background/50 px-4 py-4">
                                        <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/80">
                                            最后调用 IP
                                        </p>
                                        <p className="mt-1.5 font-mono text-sm text-foreground">
                                            {currentApiKey.lastUsedIp || '暂无记录'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="grid gap-3 text-xs text-muted-foreground sm:grid-cols-2">
                                <div className="rounded-lg border bg-background/40 px-3 py-3">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/75">创建时间</span>
                                    <span className="mt-1 block text-sm text-foreground">
                                        {currentApiKey.createTime ? <FormattedTime time={currentApiKey.createTime} /> : '未知'}
                                    </span>
                                </div>
                                <div className="rounded-lg border bg-background/40 px-3 py-3">
                                    <span className="block text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground/75">调用状态</span>
                                    <span className="mt-1 block text-sm text-foreground">{isEnabled ? '已启用（允许调用开放接口）' : '已禁用（暂停开放接口调用）'}</span>
                                </div>
                            </div>
                        </div>
                    ) : null
                    }
                </div>
            </DialogContent>
        </Dialog>
    )
}
