import { useCallback, useEffect, useMemo, useState } from 'react'
import { BookOpen, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import {
    listConfigs,
    listTemplateConfigs,
    setEnabled,
    testConfig,
    updateConfig,
    updateSort,
    updateTemplateSettings,
} from '@/api/notificationConfig'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DecimalInput } from '@/components/ui/decimal-input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { showRequestError } from '@/request'
import BarkIcon from '@/assets/images/notify/Bark.webp'
import FeishuIcon from '@/assets/images/notify/Feishu.webp'
import GotifyIcon from '@/assets/images/notify/Gotify.webp'
import TelegramIcon from '@/assets/images/notify/Telegram.webp'
import AmsSlotUnbindIcon from '@/assets/images/notify/template/ams_slot_unbind.webp'
import AmsSlotEmptyIcon from '@/assets/images/notify/template/ams_slot_empty.webp'
import AmsHumidityHighIcon from '@/assets/images/notify/template/ams_humidity_high.webp'
import FilamentNotBoundIcon from '@/assets/images/notify/template/filament_not_bound.webp'
import FilamentNotFoundIcon from '@/assets/images/notify/template/filament_not_found.webp'
import FilamentTypeMismatchIcon from '@/assets/images/notify/template/filament_type_mismatch.webp'
import FilamentWeightInsufficientIcon from '@/assets/images/notify/template/filament_weight_insufficient.webp'
import MqttReconnectIcon from '@/assets/images/notify/template/mqtt_reconnect.webp'
import PrinterPausedIcon from '@/assets/images/notify/template/printer_paused.webp'
import PrinterFinishedIcon from '@/assets/images/notify/template/printer_finished.webp'

type NotifyItem = Required<Pick<API.NotificationConfigDTO, 'channel' | 'name' | 'enabled' | 'sort'>> & {
    config?: Record<string, unknown>
}

type TemplateItem = Required<Pick<API.ConfigItemVO, 'key' | 'name' | 'enabled'>>
type FormState = Record<string, unknown> & { enabled?: boolean; proxyEnabled?: boolean }

const TUTORIAL_URLS: Record<string, string> = {
    bark: 'https://bark.day.app/#/tutorial',
    feishu: 'https://open.feishu.cn/document/client-docs/bot-v3/add-custom-bot',
    gotify: 'https://post.smzdm.com/p/a6pqr24o/',
    telegram: 'https://bika.ai/zh-CN/help/guide/automation/telegram-send-message-action',
}

const CHANNEL_DESC: Record<string, string> = {
    bark: 'Bark 是 iOS 推送通知应用',
    feishu: '通过飞书群组机器人发送通知',
    telegram: '通过 Telegram Bot 发送通知',
    gotify: 'Gotify 是一个自托管通知服务',
}

const CHANNEL_ICON: Record<string, string> = {
    bark: BarkIcon,
    feishu: FeishuIcon,
    telegram: TelegramIcon,
    gotify: GotifyIcon,
}

const TEMPLATE_ICON: Record<string, string> = {
    PRINT_PAUSED: PrinterPausedIcon,
    PRINT_FINISHED: PrinterFinishedIcon,
    AMS_SLOT_UNBIND: AmsSlotUnbindIcon,
    AMS_SLOT_EMPTY: AmsSlotEmptyIcon,
    AMS_HUMIDITY_HIGH: AmsHumidityHighIcon,
    FILAMENT_NOT_BOUND: FilamentNotBoundIcon,
    FILAMENT_NOT_FOUND: FilamentNotFoundIcon,
    FILAMENT_TYPE_MISMATCH: FilamentTypeMismatchIcon,
    FILAMENT_WEIGHT_INSUFFICIENT: FilamentWeightInsufficientIcon,
    MQTT_RECONNECT: MqttReconnectIcon,
}

export default function NotificationConfigPanel() {
    const [loading, setLoading] = useState(false)
    const [items, setItems] = useState<NotifyItem[]>([])
    const [templateLoading, setTemplateLoading] = useState(false)
    const [templates, setTemplates] = useState<TemplateItem[]>([])
    const [templateSavingKey, setTemplateSavingKey] = useState<string | null>(null)
    const [dragIndex, setDragIndex] = useState<number | null>(null)

    const [dialogOpen, setDialogOpen] = useState(false)
    const [current, setCurrent] = useState<NotifyItem | null>(null)
    const [form, setForm] = useState<FormState>({})
    const [saveLoading, setSaveLoading] = useState(false)
    const [testLoading, setTestLoading] = useState(false)
    const [isVerified, setIsVerified] = useState(false)

    const fetchList = useCallback(async () => {
        setLoading(true)
        try {
            const res = await listConfigs()
            if (res.data?.data) {
                const data = (res.data.data as API.NotificationConfigDTO[])
                    .filter((x): x is Required<Pick<API.NotificationConfigDTO, 'channel' | 'name' | 'enabled' | 'sort'>> & API.NotificationConfigDTO =>
                        typeof x.channel === 'string'
                        && typeof x.name === 'string'
                        && typeof x.enabled === 'boolean'
                        && typeof x.sort === 'number')
                    .map((x) => ({
                        channel: x.channel,
                        name: x.name,
                        enabled: x.enabled,
                        sort: x.sort,
                        config: x.config || {},
                    }))
                    .sort((a, b) => a.sort - b.sort)
                setItems(data)
            }
        } catch (error) {
            showRequestError(error, '获取通知配置失败')
        } finally {
            setLoading(false)
        }
    }, [])

    const fetchTemplates = useCallback(async () => {
        setTemplateLoading(true)
        try {
            const res = await listTemplateConfigs()
            if (res.data?.data) {
                const data = (res.data.data as API.ConfigItemVO[])
                    .filter((x): x is TemplateItem =>
                        typeof x.key === 'string' && typeof x.name === 'string' && typeof x.enabled === 'boolean')
                setTemplates(data)
            }
        } catch (error) {
            showRequestError(error, '获取模板配置失败')
        } finally {
            setTemplateLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchList()
        fetchTemplates()
    }, [fetchList, fetchTemplates])

    const handleTemplateToggle = async (key: string, enabled: boolean) => {
        setTemplateSavingKey(key)
        setTemplates((prev) => prev.map((x) => (x.key === key ? { ...x, enabled } : x)))
        try {
            await updateTemplateSettings({ [key]: enabled })
        } catch (e: unknown) {
            setTemplates((prev) => prev.map((x) => (x.key === key ? { ...x, enabled: !enabled } : x)))
            toast.error(e instanceof Error ? e.message : '保存模板设置失败')
        } finally {
            setTemplateSavingKey(null)
        }
    }

    const openEdit = (item: NotifyItem) => {
        const config = item.config || {}
        const next: FormState = { enabled: item.enabled }
        if (item.channel === 'telegram') {
            const proxy = (config.proxy as Record<string, unknown>) || {}
            next.botToken = (config.botToken as string) || ''
            next.chatId = (config.chatId as string) || ''
            next.proxyEnabled = (proxy.enabled as boolean) || false
            next.proxyHost = (proxy.host as string) || ''
            next.proxyPort = (proxy.port as number) || undefined
        } else if (item.channel === 'bark') {
            next.serverUrl = (config.serverUrl as string) || 'https://api.day.app'
            next.deviceKey = (config.deviceKey as string) || ''
        } else if (item.channel === 'feishu') {
            next.webhookUrl = (config.webhookUrl as string) || ''
            next.secret = (config.secret as string) || ''
        } else if (item.channel === 'gotify') {
            next.serverUrl = (config.serverUrl as string) || ''
            next.appToken = (config.appToken as string) || ''
            next.priority = (config.priority as number) || 5
        }
        setCurrent(item)
        setForm(next)
        setIsVerified(false)
        setDialogOpen(true)
    }

    const updateForm = (patch: FormState) => {
        setIsVerified(false)
        setForm((prev) => ({ ...prev, ...patch }))
    }

    const buildConfig = useCallback(() => {
        if (!current) return {}
        const config: Record<string, unknown> = {}
        if (current.channel === 'telegram') {
            config.botToken = form.botToken
            config.chatId = form.chatId
            if (form.proxyEnabled) {
                config.proxy = {
                    enabled: true,
                    host: form.proxyHost,
                    port: form.proxyPort,
                }
            }
        } else if (current.channel === 'bark') {
            config.serverUrl = form.serverUrl
            config.deviceKey = form.deviceKey
        } else if (current.channel === 'feishu') {
            config.webhookUrl = form.webhookUrl
            config.secret = form.secret
        } else if (current.channel === 'gotify') {
            config.serverUrl = form.serverUrl
            config.appToken = form.appToken
            config.priority = form.priority
        }
        return config
    }, [current, form])

    const validateCurrent = useCallback(() => {
        if (!current) return false
        if (current.channel === 'telegram') return !!form.botToken && !!form.chatId && (!form.proxyEnabled || (!!form.proxyHost && !!form.proxyPort))
        if (current.channel === 'bark') return !!form.serverUrl && !!form.deviceKey
        if (current.channel === 'feishu') return !!form.webhookUrl
        if (current.channel === 'gotify') return !!form.serverUrl && !!form.appToken
        return true
    }, [current, form])

    const handleTest = async () => {
        if (!current) return
        if (!validateCurrent()) { toast.warning('请先完整填写当前渠道配置'); return }
        setTestLoading(true)
        try {
            const res = await testConfig({ channel: current.channel }, buildConfig())
            if (res.data?.data?.success) {
                toast.success('测试发送成功')
                setIsVerified(true)
                return
            }
            toast.error(`测试失败: ${res.data?.data?.errorMessage || res.data?.message || '未知错误'}`)
            setIsVerified(false)
        } catch (error) {
            showRequestError(error, '测试失败')
            setIsVerified(false)
        } finally {
            setTestLoading(false)
        }
    }

    const handleSave = async () => {
        if (!current) return
        if (!isVerified) { toast.warning('请先测试发送成功后再保存'); return }
        setSaveLoading(true)
        try {
            await updateConfig({ channel: current.channel }, buildConfig())
            if (form.enabled !== current.enabled) {
                try {
                    await setEnabled({
                        channel: current.channel,
                        enabled: !!form.enabled,
                    })
                } catch {
                    toast.warning('配置保存成功，但状态更新失败')
                }
            }
            toast.success('保存成功')
            setDialogOpen(false)
            fetchList()
        } catch (e: unknown) {
            toast.error(e instanceof Error ? e.message : '保存失败')
        } finally {
            setSaveLoading(false)
        }
    }

    const onDrop = async (dropIndex: number) => {
        if (dragIndex === null || dragIndex === dropIndex) return
        const next = [...items]
        const [moved] = next.splice(dragIndex, 1)
        next.splice(dropIndex, 0, moved)
        const sorted = next.map((item, index) => ({ ...item, sort: index }))
        setItems(sorted)
        setDragIndex(null)
        try {
            await updateSort(sorted.map((x) => x.channel))
            toast.success('排序已更新')
        } catch (error) {
            showRequestError(error, '排序更新失败')
            fetchList()
        }
    }

    const configFields = useMemo(() => {
        if (!current) return null
        if (current.channel === 'bark') {
            return (
                <>
                    <div className="space-y-2"><Label>Server URL</Label><Input value={String(form.serverUrl || '')} onChange={(e) => updateForm({ serverUrl: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Device Key</Label><Input value={String(form.deviceKey || '')} onChange={(e) => updateForm({ deviceKey: e.target.value })} /></div>
                </>
            )
        }
        if (current.channel === 'feishu') {
            return (
                <>
                    <div className="space-y-2"><Label>Webhook URL</Label><Textarea value={String(form.webhookUrl || '')} onChange={(e) => updateForm({ webhookUrl: e.target.value })} rows={3} /></div>
                    <div className="space-y-2"><Label>Secret（可选）</Label><Input type="password" value={String(form.secret || '')} onChange={(e) => updateForm({ secret: e.target.value })} /></div>
                </>
            )
        }
        if (current.channel === 'gotify') {
            return (
                <>
                    <div className="space-y-2"><Label>Server URL</Label><Input value={String(form.serverUrl || '')} onChange={(e) => updateForm({ serverUrl: e.target.value })} /></div>
                    <div className="space-y-2"><Label>App Token</Label><Input type="password" value={String(form.appToken || '')} onChange={(e) => updateForm({ appToken: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Priority</Label><DecimalInput value={form.priority as number ?? 5} onValueChange={(val) => updateForm({ priority: val ?? 5 })} /></div>
                </>
            )
        }
        return (
            <>
                <div className="space-y-2"><Label>Bot Token</Label><Input type="password" value={String(form.botToken || '')} onChange={(e) => updateForm({ botToken: e.target.value })} /></div>
                <div className="space-y-2"><Label>Chat ID</Label><Input value={String(form.chatId || '')} onChange={(e) => updateForm({ chatId: e.target.value })} /></div>
                <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                    <Label className="text-sm">启用代理</Label>
                    <Switch checked={!!form.proxyEnabled} onCheckedChange={(checked) => updateForm({ proxyEnabled: checked })} />
                </div>
                {!!form.proxyEnabled && (
                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <div className="space-y-2"><Label>Proxy Host</Label><Input value={String(form.proxyHost || '')} onChange={(e) => updateForm({ proxyHost: e.target.value })} /></div>
                        <div className="space-y-2"><Label>Proxy Port</Label><DecimalInput value={form.proxyPort as number ?? ''} onValueChange={(val) => updateForm({ proxyPort: val })} /></div>
                    </div>
                )}
            </>
        )
    }, [current, form])

    return (
        <div className="space-y-6 p-5">
            <section className="space-y-3">
                <div className="flex items-baseline justify-between gap-3">
                    <h3 className="text-sm font-semibold tracking-tight text-foreground">通知渠道</h3>
                    <span className="text-xs text-muted-foreground">默认仅通知第一个渠道，可拖拽调整顺序</span>
                </div>

                <div className="overflow-hidden rounded-lg border border-border/60">
                    {loading ? (
                        <div className="space-y-px">
                            {Array.from({ length: 4 }).map((_, i) => (
                                <div key={i} className="h-[58px] animate-pulse bg-muted/40" />
                            ))}
                        </div>
                    ) : (
                        <div className="divide-y divide-border/60">
                            {items.map((item, index) => (
                                <div
                                    key={item.channel}
                                    className="flex items-center justify-between gap-3 bg-background/40 px-3 py-2.5 transition-colors hover:bg-muted/40"
                                    draggable
                                    onDragStart={() => setDragIndex(index)}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={() => onDrop(index)}
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        <GripVertical size={14} className="shrink-0 cursor-grab text-muted-foreground/70" />
                                        <img src={CHANNEL_ICON[item.channel]} alt={item.channel} className="h-7 w-7 rounded object-cover" />
                                        <div className="min-w-0">
                                            <p className="truncate text-sm font-medium">{item.name}</p>
                                            <p className="truncate text-xs text-muted-foreground">{CHANNEL_DESC[item.channel] || ''}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span
                                            className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                                                item.enabled
                                                    ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                                                    : 'bg-muted text-muted-foreground'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-1.5 w-1.5 rounded-full ${item.enabled ? 'bg-emerald-500' : 'bg-muted-foreground/60'}`}
                                            />
                                            {item.enabled ? '已启用' : '未启用'}
                                        </span>
                                        <Button type="button" variant="ghost" size="sm" className="cursor-pointer" onClick={() => openEdit(item)}>
                                            配置
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="space-y-3">
                <h3 className="text-sm font-semibold tracking-tight text-foreground">通知模板</h3>
                {templateLoading ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="h-44 animate-pulse rounded-lg bg-muted/40" />
                        ))}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                        {templates.map((tpl) => (
                            <div
                                key={tpl.key}
                                className="group overflow-hidden rounded-lg border border-border/60 bg-background/40 transition-colors hover:border-border"
                            >
                                <div className="h-32 border-b border-border/60 bg-muted/30">
                                    <img src={TEMPLATE_ICON[tpl.key]} alt={tpl.name} className="h-full w-full object-contain" />
                                </div>
                                <div className="flex items-center justify-between gap-2 px-3 py-2">
                                    <p className="truncate text-xs text-foreground/90">{tpl.name}</p>
                                    <Switch
                                        size="sm"
                                        checked={tpl.enabled}
                                        disabled={templateSavingKey === tpl.key}
                                        onCheckedChange={(checked) => handleTemplateToggle(tpl.key, checked)}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </section>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogContent className="max-h-[88vh] overflow-y-auto sm:max-w-2xl">
                    <DialogHeader><DialogTitle>配置 {current?.name || ''}</DialogTitle></DialogHeader>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between rounded-lg border border-border/70 bg-muted/20 px-3 py-2">
                            <Label className="text-sm">状态</Label>
                            <Switch checked={!!form.enabled} onCheckedChange={(checked) => updateForm({ enabled: checked })} />
                        </div>

                        {!!current?.channel && (
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="cursor-pointer"
                                onClick={() => window.open(TUTORIAL_URLS[current.channel], '_blank')}
                            >
                                <BookOpen size={14} /> 查看教程
                            </Button>
                        )}

                        {configFields}

                        <div className="flex items-center justify-between border-t pt-3">
                            <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={handleTest} disabled={testLoading}>
                                {testLoading ? '测试中...' : '发送测试'}
                            </Button>
                            <div className="flex gap-2">
                                <Button type="button" variant="outline" size="sm" className="cursor-pointer" onClick={() => setDialogOpen(false)}>
                                    取消
                                </Button>
                                <Button type="button" size="sm" className="cursor-pointer" onClick={handleSave} disabled={saveLoading || !isVerified}>
                                    {saveLoading ? '保存中...' : '保存'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    )
}
