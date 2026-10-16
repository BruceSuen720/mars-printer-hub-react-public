import { useCallback, useEffect, useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Check, Edit, ExternalLink, Fingerprint, Globe, Home, KeyRound, Link2, Loader2, ShoppingBag, UserPlus, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    getAliyunMarketAppCodeInfo,
    getHomeAssistantConfigInfo,
    getOpenRegistrationConfigInfo,
    getPasskeyConfigInfo,
    getPublicAccessUrlInfo,
    saveAliyunMarketAppCode,
    saveHomeAssistantConfig,
    saveOpenRegistrationConfig,
    savePasskeyConfig,
    savePublicAccessUrl,
} from '@/api/sysConfig'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useLoginUserStore } from '@/stores/useLoginUserStore'
import { showRequestError } from '@/request'
import { cn } from '@/lib/utils'

type FormState = {
    appCode: string
    appCodeMasked: string
    homeAssistantBaseUrl: string
    homeAssistantApiKey: string
    homeAssistantApiKeyMasked: string
    homeAssistantScaleEntityId: string
    openRegistrationEnabled: boolean
    publicAccessUrl: string
    passkeyRpId: string
    passkeyOrigins: string
}

/** ─────────── shared UI helpers ─────────── */

function SectionCard({
    icon: Icon,
    title,
    children,
}: {
    icon: LucideIcon
    title: string
    children: React.ReactNode
}) {
    return (
        <section className="rounded-lg border border-border/70 bg-background/40">
            <header className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
                <Icon size={14} className="shrink-0 text-primary/70" />
                <h4 className="text-sm font-semibold tracking-tight text-foreground">{title}</h4>
            </header>
            <div className="space-y-4 px-4 py-4">{children}</div>
        </section>
    )
}

function InlineEditField({
    icon: Icon,
    editing,
    value,
    displayValue,
    placeholder,
    saving,
    disabled,
    inputProps,
    onStartEdit,
    onSave,
    onCancel,
    onChange,
    autoFocus,
}: {
    icon: LucideIcon
    editing: boolean
    value: string
    displayValue?: string
    placeholder: string
    saving?: boolean
    disabled?: boolean
    inputProps?: React.InputHTMLAttributes<HTMLInputElement>
    onStartEdit: () => void
    onSave: () => void
    onCancel: () => void
    onChange: (v: string) => void
    autoFocus?: boolean
}) {
    if (editing) {
        return (
            <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                    <Icon size={14} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground" />
                    <Input
                        {...inputProps}
                        className="pl-8"
                        value={value}
                        disabled={disabled}
                        placeholder={placeholder}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') onSave()
                            if (e.key === 'Escape') onCancel()
                        }}
                        autoFocus={autoFocus}
                    />
                </div>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-emerald-600 hover:text-emerald-700"
                    onClick={onSave}
                    disabled={disabled}
                >
                    {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                </Button>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                    onClick={onCancel}
                    disabled={disabled}
                >
                    <X size={14} />
                </Button>
            </div>
        )
    }
    return (
        <div
            className="group flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-input bg-background px-3 py-1.5 transition-colors hover:border-primary/50"
            onClick={onStartEdit}
        >
            <Icon size={14} className="shrink-0 text-muted-foreground" />
            {displayValue ?? value ? (
                <span className="truncate text-sm font-medium text-foreground">{displayValue ?? value}</span>
            ) : (
                <span className="text-sm text-muted-foreground/70 group-hover:text-muted-foreground">点击设置</span>
            )}
            <Edit size={13} className="ml-auto shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
        </div>
    )
}

function FieldLabel({ children, hint }: { children: React.ReactNode; hint?: string }) {
    return (
        <div className="flex items-baseline justify-between gap-3">
            <Label className="text-xs font-medium text-foreground">{children}</Label>
            {hint && <span className="text-[11px] text-muted-foreground">{hint}</span>}
        </div>
    )
}

/** ─────────── panel ─────────── */

export default function SystemGeneralConfigPanel() {
    const { loginUser } = useLoginUserStore()
    const isIntranet = loginUser.isIntranet === true
    const [loading, setLoading] = useState(false)
    const [savingAliyun, setSavingAliyun] = useState(false)
    const [savingHomeAssistant, setSavingHomeAssistant] = useState(false)
    const [savingOpenRegistration, setSavingOpenRegistration] = useState(false)
    const [savingPublicAccessUrl, setSavingPublicAccessUrl] = useState(false)
    const [savingPasskey, setSavingPasskey] = useState(false)
    const [form, setForm] = useState<FormState>({
        appCode: '',
        appCodeMasked: '',
        homeAssistantBaseUrl: '',
        homeAssistantApiKey: '',
        homeAssistantApiKeyMasked: '',
        homeAssistantScaleEntityId: '',
        openRegistrationEnabled: false,
        publicAccessUrl: '',
        passkeyRpId: '',
        passkeyOrigins: '',
    })
    const [editingAliyun, setEditingAliyun] = useState(false)
    const [editingHomeAssistant, setEditingHomeAssistant] = useState(false)
    const [editingPublicAccessUrl, setEditingPublicAccessUrl] = useState(false)
    const [editingPasskey, setEditingPasskey] = useState(false)

    const fetchConfig = useCallback(async () => {
        setLoading(true)
        try {
            const requests = [
                getAliyunMarketAppCodeInfo(),
                isIntranet ? getHomeAssistantConfigInfo() : Promise.resolve({ data: { data: null } }),
                getOpenRegistrationConfigInfo(),
                getPublicAccessUrlInfo(),
                getPasskeyConfigInfo(),
            ] as const
            const [aliyunRes, homeAssistantRes, openRegistrationRes, publicAccessUrlRes, passkeyRes] = await Promise.all(requests)
            setForm({
                appCode: '',
                appCodeMasked: aliyunRes.data?.data?.appCode || '',
                homeAssistantBaseUrl: homeAssistantRes.data?.data?.baseUrl || '',
                homeAssistantApiKey: '',
                homeAssistantApiKeyMasked: homeAssistantRes.data?.data?.apiKey || '',
                homeAssistantScaleEntityId: homeAssistantRes.data?.data?.scaleEntityId || '',
                openRegistrationEnabled: openRegistrationRes.data?.data?.enabled === true,
                publicAccessUrl: publicAccessUrlRes.data?.data?.publicAccessUrl || '',
                passkeyRpId: passkeyRes.data?.data?.rpId || '',
                passkeyOrigins: (passkeyRes.data?.data?.origins || []).join('\n'),
            })
        } catch (error) {
            showRequestError(error, '获取系统配置失败')
        } finally {
            setLoading(false)
        }
    }, [isIntranet])

    useEffect(() => {
        fetchConfig()
    }, [fetchConfig])

    const handleSaveAliyun = useCallback(async () => {
        setSavingAliyun(true)
        try {
            const nextAppCode = form.appCode.trim()
            await saveAliyunMarketAppCode({
                appCode: nextAppCode || undefined,
            })
            setForm((prev) => ({
                ...prev,
                appCode: '',
                appCodeMasked: nextAppCode || prev.appCodeMasked,
            }))
            setEditingAliyun(false)
            toast.success('配置保存成功')
        } catch (error) {
            showRequestError(error, '配置保存失败')
        } finally {
            setSavingAliyun(false)
        }
    }, [form.appCode])

    const handleSaveHomeAssistant = useCallback(async () => {
        if (!form.homeAssistantBaseUrl.trim()) {
            toast.warning('请填写 Home Assistant 地址')
            return
        }

        setSavingHomeAssistant(true)
        try {
            const nextApiKey = form.homeAssistantApiKey.trim()
            await saveHomeAssistantConfig({
                baseUrl: form.homeAssistantBaseUrl.trim(),
                apiKey: nextApiKey || undefined,
                scaleEntityId: form.homeAssistantScaleEntityId.trim() || undefined,
            })
            setForm((prev) => ({
                ...prev,
                homeAssistantBaseUrl: form.homeAssistantBaseUrl.trim(),
                homeAssistantApiKey: '',
                homeAssistantApiKeyMasked: nextApiKey || prev.homeAssistantApiKeyMasked,
                homeAssistantScaleEntityId: form.homeAssistantScaleEntityId.trim(),
            }))
            setEditingHomeAssistant(false)
            toast.success('配置保存成功')
        } catch (error) {
            showRequestError(error, '配置保存失败')
        } finally {
            setSavingHomeAssistant(false)
        }
    }, [form.homeAssistantApiKey, form.homeAssistantBaseUrl, form.homeAssistantScaleEntityId])

    const handleToggleOpenRegistration = useCallback(async (checked: boolean) => {
        setForm((prev) => ({ ...prev, openRegistrationEnabled: checked }))
        setSavingOpenRegistration(true)
        try {
            await saveOpenRegistrationConfig({ enabled: checked })
            toast.success(`已${checked ? '开启' : '关闭'}开放自由注册`)
        } catch (error) {
            setForm((prev) => ({ ...prev, openRegistrationEnabled: !checked }))
            showRequestError(error, '保存开放自由注册配置失败')
        } finally {
            setSavingOpenRegistration(false)
        }
    }, [])

    const cancelAliyunEdit = useCallback(async () => {
        setEditingAliyun(false)
        await fetchConfig()
    }, [fetchConfig])

    const cancelHomeAssistantEdit = useCallback(async () => {
        setEditingHomeAssistant(false)
        await fetchConfig()
    }, [fetchConfig])

    const handleSavePublicAccessUrl = useCallback(async () => {
        setSavingPublicAccessUrl(true)
        try {
            const nextPublicAccessUrl = form.publicAccessUrl.trim()
            await savePublicAccessUrl({
                publicAccessUrl: nextPublicAccessUrl || undefined,
            })
            setForm((prev) => ({
                ...prev,
                publicAccessUrl: nextPublicAccessUrl,
            }))
            setEditingPublicAccessUrl(false)
            toast.success('配置保存成功')
        } catch (error) {
            showRequestError(error, '配置保存失败')
        } finally {
            setSavingPublicAccessUrl(false)
        }
    }, [form.publicAccessUrl])

    const cancelPublicAccessUrlEdit = useCallback(async () => {
        setEditingPublicAccessUrl(false)
        await fetchConfig()
    }, [fetchConfig])

    const handleSavePasskey = useCallback(async () => {
        const rpId = form.passkeyRpId.trim()
        const origins = form.passkeyOrigins
            .split('\n')
            .map((item) => item.trim())
            .filter(Boolean)

        if (!rpId) {
            toast.warning('请填写 RP ID')
            return
        }
        if (origins.length === 0) {
            toast.warning('请至少填写一个 Allowed Origin')
            return
        }

        setSavingPasskey(true)
        try {
            await savePasskeyConfig({
                rpId,
                origins,
            })
            setForm((prev) => ({
                ...prev,
                passkeyRpId: rpId,
                passkeyOrigins: origins.join('\n'),
            }))
            setEditingPasskey(false)
            toast.success('配置保存成功')
        } catch (error) {
            showRequestError(error, '配置保存失败')
        } finally {
            setSavingPasskey(false)
        }
    }, [form.passkeyOrigins, form.passkeyRpId])

    const cancelPasskeyEdit = useCallback(async () => {
        setEditingPasskey(false)
        await fetchConfig()
    }, [fetchConfig])

    const openUrl = useCallback((url: string) => {
        window.open(url, '_blank')
    }, [])

    return (
        <div className={cn('grid grid-cols-1 gap-4 p-5 xl:grid-cols-2', loading && 'opacity-70')}>
            {/* ── 阿里云市场 ── */}
            <SectionCard icon={ShoppingBag} title="阿里云市场">
                <div className="flex flex-wrap gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => openUrl('https://market.aliyun.com/detail/cmapi00054337#sku=yuncode4833700002')}
                    >
                        <ExternalLink size={13} /> 市场商品页
                    </Button>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="cursor-pointer"
                        onClick={() => openUrl('https://marketnext.console.aliyun.com/bizlist')}
                    >
                        <ExternalLink size={13} /> AppCode 管理页
                    </Button>
                </div>

                <div className="space-y-1.5">
                    <FieldLabel hint="加密保存、脱敏显示">AppCode</FieldLabel>
                    <InlineEditField
                        icon={KeyRound}
                        editing={editingAliyun}
                        value={form.appCode}
                        displayValue={form.appCodeMasked}
                        placeholder="请输入阿里云市场 AppCode"
                        saving={savingAliyun}
                        disabled={loading || savingAliyun}
                        autoFocus
                        onStartEdit={() => {
                            setForm((prev) => ({ ...prev, appCode: '' }))
                            setEditingAliyun(true)
                        }}
                        onSave={handleSaveAliyun}
                        onCancel={() => void cancelAliyunEdit()}
                        onChange={(v) => setForm((prev) => ({ ...prev, appCode: v }))}
                    />
                </div>
            </SectionCard>

            {/* ── Home Assistant ── */}
            {isIntranet && (
                <SectionCard icon={Home} title="Home Assistant">
                    <div className="space-y-1.5">
                        <FieldLabel>地址</FieldLabel>
                        <InlineEditField
                            icon={Link2}
                            editing={editingHomeAssistant}
                            value={form.homeAssistantBaseUrl}
                            placeholder="例如 http://homeassistant.local:8123"
                            disabled={loading || savingHomeAssistant}
                            autoFocus
                            onStartEdit={() => {
                                setForm((prev) => ({ ...prev, homeAssistantApiKey: '' }))
                                setEditingHomeAssistant(true)
                            }}
                            onSave={handleSaveHomeAssistant}
                            onCancel={() => void cancelHomeAssistantEdit()}
                            onChange={(v) => setForm((prev) => ({ ...prev, homeAssistantBaseUrl: v }))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <FieldLabel hint="加密保存、脱敏显示">Long-Lived Token</FieldLabel>
                        <InlineEditField
                            icon={KeyRound}
                            editing={editingHomeAssistant}
                            value={form.homeAssistantApiKey}
                            displayValue={form.homeAssistantApiKeyMasked}
                            placeholder={form.homeAssistantApiKeyMasked ? '留空则保留当前 Key' : '请输入 Home Assistant Long-Lived Access Token'}
                            saving={savingHomeAssistant}
                            disabled={loading || savingHomeAssistant}
                            onStartEdit={() => {
                                setForm((prev) => ({ ...prev, homeAssistantApiKey: '' }))
                                setEditingHomeAssistant(true)
                            }}
                            onSave={handleSaveHomeAssistant}
                            onCancel={() => void cancelHomeAssistantEdit()}
                            onChange={(v) => setForm((prev) => ({ ...prev, homeAssistantApiKey: v }))}
                        />
                    </div>

                    <div className="space-y-1.5">
                        <FieldLabel hint="用于自动读取称重数据">电子秤实体</FieldLabel>
                        <InlineEditField
                            icon={Link2}
                            editing={editingHomeAssistant}
                            value={form.homeAssistantScaleEntityId}
                            placeholder="例如 sensor.filament_scale_weight"
                            disabled={loading || savingHomeAssistant}
                            onStartEdit={() => {
                                setForm((prev) => ({ ...prev, homeAssistantApiKey: '' }))
                                setEditingHomeAssistant(true)
                            }}
                            onSave={handleSaveHomeAssistant}
                            onCancel={() => void cancelHomeAssistantEdit()}
                            onChange={(v) => setForm((prev) => ({ ...prev, homeAssistantScaleEntityId: v }))}
                        />
                    </div>
                </SectionCard>
            )}

            {/* ── 开放自由注册 ── */}
            <SectionCard icon={UserPlus} title="开放自由注册">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0 space-y-0.5">
                        <p className="text-sm text-foreground">允许未登录用户自行创建账号</p>
                        <p className="text-xs text-muted-foreground">
                            当前 · {form.openRegistrationEnabled ? '已开启' : '已关闭'}
                        </p>
                    </div>
                    <Switch
                        checked={form.openRegistrationEnabled}
                        disabled={loading || savingOpenRegistration}
                        onCheckedChange={(checked) => void handleToggleOpenRegistration(checked)}
                    />
                </div>
            </SectionCard>

            {/* ── 公网访问 URL ── */}
            <SectionCard icon={Globe} title="公网访问 URL">
                <div className="space-y-1.5">
                    <FieldLabel hint="保存时自动去除末尾斜杠">访问地址</FieldLabel>
                    <InlineEditField
                        icon={Link2}
                        editing={editingPublicAccessUrl}
                        value={form.publicAccessUrl}
                        placeholder="例如 https://printer.example.com"
                        saving={savingPublicAccessUrl}
                        disabled={loading || savingPublicAccessUrl}
                        autoFocus
                        onStartEdit={() => setEditingPublicAccessUrl(true)}
                        onSave={handleSavePublicAccessUrl}
                        onCancel={() => void cancelPublicAccessUrlEdit()}
                        onChange={(v) => setForm((prev) => ({ ...prev, publicAccessUrl: v }))}
                    />
                </div>
            </SectionCard>

            {/* ── Passkey ── */}
            <SectionCard icon={Fingerprint} title="Passkey">
                <div className="space-y-1.5">
                    <FieldLabel hint="只填域名，不带协议和端口">RP ID</FieldLabel>
                    <InlineEditField
                        icon={KeyRound}
                        editing={editingPasskey}
                        value={form.passkeyRpId}
                        placeholder="例如 localhost 或 printer.example.com"
                        disabled={loading || savingPasskey}
                        autoFocus
                        onStartEdit={() => setEditingPasskey(true)}
                        onSave={handleSavePasskey}
                        onCancel={() => void cancelPasskeyEdit()}
                        onChange={(v) => setForm((prev) => ({ ...prev, passkeyRpId: v }))}
                    />
                </div>

                <div className="space-y-1.5">
                    <FieldLabel hint="每行一个完整地址">Allowed Origins</FieldLabel>
                    {editingPasskey ? (
                        <div className="space-y-2">
                            <textarea
                                id="passkey-origins"
                                className="min-h-24 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                                value={form.passkeyOrigins}
                                disabled={loading || savingPasskey}
                                placeholder={'每行一个，例如：\nhttp://localhost:5173\nhttps://printer.example.com'}
                                onChange={(e) => setForm((prev) => ({ ...prev, passkeyOrigins: e.target.value }))}
                            />
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer text-emerald-600 hover:text-emerald-700"
                                    onClick={handleSavePasskey}
                                    disabled={loading || savingPasskey}
                                >
                                    {savingPasskey ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 cursor-pointer text-muted-foreground hover:text-destructive"
                                    onClick={() => void cancelPasskeyEdit()}
                                    disabled={loading || savingPasskey}
                                >
                                    <X size={14} />
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div
                            className="group cursor-pointer rounded-md border border-input bg-background px-3 py-2 transition-colors hover:border-primary/50"
                            onClick={() => setEditingPasskey(true)}
                        >
                            {form.passkeyOrigins ? (
                                <div className="space-y-0.5">
                                    {form.passkeyOrigins.split('\n').filter(Boolean).map((origin) => (
                                        <div key={origin} className="truncate text-sm font-medium text-foreground">{origin}</div>
                                    ))}
                                </div>
                            ) : (
                                <span className="text-sm text-muted-foreground/70 group-hover:text-muted-foreground">点击设置</span>
                            )}
                        </div>
                    )}
                </div>

                <p className="text-[11px] text-muted-foreground">
                    修改 RP ID 后，已绑定的 Passkey 可能需要重新绑定。
                </p>
            </SectionCard>
        </div>
    )
}
