import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { getHomeAssistantEntityState, updateAmsEntities } from '@/api/device'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { showRequestError } from '@/request'

interface AmsEntityDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    ams: API.AmsVO | null
    onSaved: () => Promise<void>
}

export function AmsEntityDialog({ open, onOpenChange, ams, onSaved }: AmsEntityDialogProps) {
    const [temperatureEntityId, setTemperatureEntityId] = useState('')
    const [humidityEntityId, setHumidityEntityId] = useState('')
    const [testTemperatureLoading, setTestTemperatureLoading] = useState(false)
    const [testHumidityLoading, setTestHumidityLoading] = useState(false)
    const [saveLoading, setSaveLoading] = useState(false)

    useEffect(() => {
        if (!open) return
        setTemperatureEntityId(ams?.temperatureEntityId ?? '')
        setHumidityEntityId(ams?.humidityEntityId ?? '')
    }, [ams, open])

    const handleTest = async (type: 'temperature' | 'humidity') => {
        const entityId = (type === 'temperature' ? temperatureEntityId : humidityEntityId).trim()
        if (!entityId) {
            toast.warning(`请先填写${type === 'temperature' ? '温度' : '湿度'}实体`)
            return
        }

        const setLoading = type === 'temperature' ? setTestTemperatureLoading : setTestHumidityLoading
        setLoading(true)
        try {
            const response = await getHomeAssistantEntityState({ entityId })
            const state = response.data?.data
            toast.success('测试成功', {
                description: state?.state
                    ? `当前${type === 'temperature' ? '温度' : '湿度'}：${state.state}${state.unit ?? ''}`
                    : '已成功获取实体状态',
            })
        } catch (error) {
            showRequestError(error, '测试失败')
        } finally {
            setLoading(false)
        }
    }

    const handleSave = async () => {
        if (!ams?.id) return
        const nextTemperatureEntityId = temperatureEntityId.trim()
        const nextHumidityEntityId = humidityEntityId.trim()
        if (
            (ams.temperatureEntityId ?? '') === nextTemperatureEntityId
            && (ams.humidityEntityId ?? '') === nextHumidityEntityId
        ) {
            onOpenChange(false)
            return
        }

        setSaveLoading(true)
        try {
            await updateAmsEntities({
                amsId: ams.id,
                temperatureEntityId: nextTemperatureEntityId || undefined,
                humidityEntityId: nextHumidityEntityId || undefined,
            })
            toast.success('AMS 实体更新成功')
            onOpenChange(false)
            await onSaved()
        } catch (error) {
            showRequestError(error, 'AMS 实体更新失败')
        } finally {
            setSaveLoading(false)
        }
    }

    const busy = saveLoading || testTemperatureLoading || testHumidityLoading

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>AMS 实体配置</DialogTitle>
                    <DialogDescription>
                        为 {ams?.amsName || '当前 AMS'} 绑定 Home Assistant 温湿度实体。留空表示使用设备原始数据。
                    </DialogDescription>
                </DialogHeader>
                <div className="min-w-0 space-y-4">
                    <div className="min-w-0 space-y-2">
                        <Label className="text-sm">温度实体</Label>
                        <Input value={temperatureEntityId} onChange={(event) => setTemperatureEntityId(event.target.value)} placeholder="sensor.ams_temperature" className="h-9 w-full max-w-full font-mono text-xs" disabled={busy} onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleSave()
                        }} />
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 cursor-pointer text-xs" onClick={() => void handleTest('temperature')} disabled={busy}>
                                {testTemperatureLoading && <Loader2 size={12} className="mr-1 animate-spin" />}测试温度
                            </Button>
                            {ams?.temperatureEntityId && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">当前: {ams.temperatureEntityId}</span>}
                        </div>
                    </div>
                    <div className="min-w-0 space-y-2">
                        <Label className="text-sm">湿度实体</Label>
                        <Input value={humidityEntityId} onChange={(event) => setHumidityEntityId(event.target.value)} placeholder="sensor.ams_humidity" className="h-9 w-full max-w-full font-mono text-xs" disabled={busy} onKeyDown={(event) => {
                            if (event.key === 'Enter') void handleSave()
                        }} />
                        <div className="flex min-w-0 flex-wrap items-center gap-2">
                            <Button variant="outline" size="sm" className="h-8 cursor-pointer text-xs" onClick={() => void handleTest('humidity')} disabled={busy}>
                                {testHumidityLoading && <Loader2 size={12} className="mr-1 animate-spin" />}测试湿度
                            </Button>
                            {ams?.humidityEntityId && <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">当前: {ams.humidityEntityId}</span>}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" className="cursor-pointer" onClick={() => onOpenChange(false)} disabled={saveLoading}>取消</Button>
                    <Button className="cursor-pointer" onClick={() => void handleSave()} disabled={busy}>
                        {saveLoading && <Loader2 size={14} className="mr-2 animate-spin" />}保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
