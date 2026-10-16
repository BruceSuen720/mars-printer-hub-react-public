import { useCallback, useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'
import { listDeviceConfigs, updateDeviceSettings } from '@/api/device'
import { Switch } from '@/components/ui/switch'
import { showRequestError } from '@/request'

type ConfigItem = {
    key: string
    name: string
    enabled: boolean
}

const DESCRIPTIONS: Record<string, string> = {
    AUTO_SNAPSHOT: '打印过程中自动保存设备快照图片（需 NAS 和打印机处于同一局域网）',
    AUTO_REPLENISH_SPLIT_DEDUCTION: '发生自动续料时，分开扣除耗材（槽位必须有绑定耗材）',
    AMS_SLOT_AUTO_UNBIND: '当 AMS 槽位变空时自动解绑耗材',
    P1S_AUTO_OFF_LIGHT: 'P1S 机型开始打印时自动关闭腔体灯',
    MQTT_AUTO_RECONNECT: '每 30 分钟自动检查并重连已断开的设备',
}

export default function DeviceConfigPanel() {
    const [loading, setLoading] = useState(false)
    const [savingKey, setSavingKey] = useState<string | null>(null)
    const [items, setItems] = useState<ConfigItem[]>([])

    const fetchList = useCallback(async () => {
        setLoading(true)
        try {
            const res = await listDeviceConfigs()
            if (res.data?.data) {
                const data = (res.data.data as API.ConfigItemVO[])
                    .filter((x): x is Required<Pick<API.ConfigItemVO, 'key' | 'name' | 'enabled'>> =>
                        typeof x.key === 'string' && typeof x.name === 'string' && typeof x.enabled === 'boolean')
                    .map((x) => ({ key: x.key, name: x.name, enabled: x.enabled }))
                setItems(data)
            }
        } catch (error) {
            showRequestError(error, '获取设备配置失败')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchList() }, [fetchList])

    const updateLocal = useCallback((key: string, enabled: boolean) => {
        setItems((prev) => prev.map((x) => (x.key === key ? { ...x, enabled } : x)))
    }, [])

    const onToggle = useCallback(async (key: string, checked: boolean) => {
        updateLocal(key, checked)
        setSavingKey(key)
        try {
            await updateDeviceSettings({ [key]: checked })
            toast.success(`${checked ? '启用' : '禁用'}成功`)
        } catch (error) {
            updateLocal(key, !checked)
            showRequestError(error, '操作失败')
        } finally {
            setSavingKey(null)
        }
    }, [updateLocal])

    const content = useMemo(() => {
        if (loading) {
            return (
                <div className="space-y-2">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="h-16 animate-pulse rounded-lg bg-muted/60" />
                    ))}
                </div>
            )
        }
        return (
            <div className="space-y-2">
                {items.map((item) => (
                    <div
                        key={item.key}
                        className="flex items-center justify-between gap-4 rounded-lg border border-border/60 bg-background/40 px-4 py-3 transition-colors hover:border-border hover:bg-muted/40"
                    >
                        <div className="min-w-0 pr-2">
                            <p className="text-sm font-medium text-foreground">{item.name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                                {DESCRIPTIONS[item.key] || '暂无描述'}
                            </p>
                        </div>
                        <Switch
                            checked={item.enabled}
                            disabled={savingKey === item.key}
                            onCheckedChange={(checked) => onToggle(item.key, checked)}
                        />
                    </div>
                ))}
            </div>
        )
    }, [items, loading, onToggle, savingKey])

    return <div className="p-5">{content}</div>
}
