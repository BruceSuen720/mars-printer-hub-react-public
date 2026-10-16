import { useEffect, useState } from 'react'
import { Check, Loader2, MapPin, X } from 'lucide-react'
import { toast } from 'sonner'
import {
    getPrinter,
    refreshPrinters,
    unbindPrinters,
    updatePrinterChamberTempEntity,
    updatePrinterCustomCameraRtspUrl,
    updatePrinterLocation,
    updatePrinterPowerEntity,
} from '@/api/printer'
import { getHomeAssistantEntityState } from '@/api/device'
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
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { FormattedTime } from '@/components/ui/formatted-time'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { showRequestError } from '@/request'

interface PrinterDetailDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    printerId?: number
    isIntranet: boolean
    onChanged: () => Promise<void>
}

interface EditableEntityFieldProps {
    label: string
    value: string
    savedValue?: string
    placeholder: string
    editing: boolean
    saving: boolean
    testing?: boolean
    badgeClassName: string
    onChange: (value: string) => void
    onEdit: () => void
    onCancel: () => void
    onSave: () => void
    onTest?: () => void
}

function EditableEntityField({
    label,
    value,
    savedValue,
    placeholder,
    editing,
    saving,
    testing = false,
    badgeClassName,
    onChange,
    onEdit,
    onCancel,
    onSave,
    onTest,
}: EditableEntityFieldProps) {
    return (
        <div className={`flex gap-1.5 ${editing ? 'items-start' : 'items-center'}`}>
            <span className="shrink-0 text-muted-foreground">{label}:</span>
            <div className="min-w-0 flex-1">
                {editing ? (
                    <div className="space-y-2">
                        <Input
                            value={value}
                            onChange={(event) => onChange(event.target.value)}
                            placeholder={placeholder}
                            className="h-8 font-mono text-base md:text-xs"
                            onKeyDown={(event) => {
                                if (event.key === 'Enter') onSave()
                                if (event.key === 'Escape') onCancel()
                            }}
                            autoFocus
                            disabled={saving || testing}
                        />
                        <div className="flex flex-wrap items-center gap-1">
                            {onTest && (
                                <Button variant="outline" size="sm" className="h-7 cursor-pointer text-xs" onClick={onTest} disabled={saving || testing}>
                                    {testing && <Loader2 size={12} className="mr-1 animate-spin" />}
                                    测试
                                </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-green-600 hover:text-green-700" onClick={onSave} disabled={saving || testing}>
                                {saving ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 cursor-pointer text-red-500 hover:text-red-600" onClick={onCancel} disabled={saving || testing}>
                                <X size={12} />
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="group flex min-w-0 cursor-pointer items-center gap-1" onClick={onEdit}>
                        {savedValue ? (
                            <span className={`truncate rounded px-1.5 py-0.5 font-mono text-xs ${badgeClassName}`}>{savedValue}</span>
                        ) : (
                            <span className="text-xs text-muted-foreground opacity-60 group-hover:opacity-100">点击设置</span>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}

export function PrinterDetailDialog({ open, onOpenChange, printerId, isIntranet, onChanged }: PrinterDetailDialogProps) {
    const [printer, setPrinter] = useState<API.PrinterVO | null>(null)
    const [loading, setLoading] = useState(false)
    const [unbindLoading, setUnbindLoading] = useState(false)
    const [refreshLoading, setRefreshLoading] = useState(false)

    const [location, setLocation] = useState('')
    const [locationEditing, setLocationEditing] = useState(false)
    const [saveLocationLoading, setSaveLocationLoading] = useState(false)
    const [powerEntityId, setPowerEntityId] = useState('')
    const [powerEntityEditing, setPowerEntityEditing] = useState(false)
    const [testPowerLoading, setTestPowerLoading] = useState(false)
    const [savePowerLoading, setSavePowerLoading] = useState(false)
    const [chamberTempEntityId, setChamberTempEntityId] = useState('')
    const [chamberTempEntityEditing, setChamberTempEntityEditing] = useState(false)
    const [testChamberTempLoading, setTestChamberTempLoading] = useState(false)
    const [saveChamberTempLoading, setSaveChamberTempLoading] = useState(false)
    const [cameraRtspUrl, setCameraRtspUrl] = useState('')
    const [cameraRtspEditing, setCameraRtspEditing] = useState(false)
    const [saveCameraRtspLoading, setSaveCameraRtspLoading] = useState(false)

    useEffect(() => {
        if (!open || !printerId) return

        setLoading(true)
        setPrinter(null)
        getPrinter({ id: printerId })
            .then((response) => {
                const nextPrinter = response.data.data ?? null
                setPrinter(nextPrinter)
                setLocation(nextPrinter?.location ?? '')
                setPowerEntityId(nextPrinter?.powerEntityId ?? '')
                setChamberTempEntityId(nextPrinter?.chamberTempEntityId ?? '')
                setCameraRtspUrl(nextPrinter?.customCameraRtspUrl ?? '')
            })
            .catch((error) => showRequestError(error, '获取详情失败'))
            .finally(() => setLoading(false))
    }, [open, printerId])

    const closeEditors = () => {
        setLocationEditing(false)
        setPowerEntityEditing(false)
        setChamberTempEntityEditing(false)
        setCameraRtspEditing(false)
    }

    const handleOpenChange = (nextOpen: boolean) => {
        onOpenChange(nextOpen)
        if (!nextOpen) closeEditors()
    }

    const refreshPrinter = async () => {
        if (!printer?.id) return null
        const response = await getPrinter({ id: printer.id })
        const nextPrinter = response.data.data ?? null
        setPrinter(nextPrinter)
        return nextPrinter
    }

    const handleUnbind = async () => {
        if (!printer?.id) return
        setUnbindLoading(true)
        try {
            await unbindPrinters({ printerId: printer.id })
            toast.success('解绑成功')
            onOpenChange(false)
            await onChanged()
        } catch (error) {
            showRequestError(error, '解绑失败')
        } finally {
            setUnbindLoading(false)
        }
    }

    const handleRefresh = async () => {
        if (!printer?.id) return
        setRefreshLoading(true)
        try {
            await refreshPrinters({ printerId: printer.id })
            toast.success('刷新成功')
            onOpenChange(false)
            await onChanged()
        } catch (error) {
            showRequestError(error, '刷新失败')
        } finally {
            setRefreshLoading(false)
        }
    }

    const handleSaveLocation = async () => {
        if (!printer?.id) return
        const nextValue = location.trim()
        if ((printer.location ?? '') === nextValue) {
            setLocationEditing(false)
            return
        }
        setSaveLocationLoading(true)
        try {
            await updatePrinterLocation({ printerId: printer.id, location: nextValue || undefined })
            const nextPrinter = await refreshPrinter()
            setLocation(nextPrinter?.location ?? nextValue)
            setLocationEditing(false)
            toast.success('位置更新成功')
        } catch (error) {
            showRequestError(error, '位置更新失败')
        } finally {
            setSaveLocationLoading(false)
        }
    }

    const testEntity = async (type: 'power' | 'temperature') => {
        const entityId = (type === 'power' ? powerEntityId : chamberTempEntityId).trim()
        if (!entityId) {
            toast.warning(`请先填写${type === 'power' ? '功耗' : '仓温'}实体`)
            return
        }
        const setTesting = type === 'power' ? setTestPowerLoading : setTestChamberTempLoading
        setTesting(true)
        try {
            const response = await getHomeAssistantEntityState({ entityId })
            const state = response.data?.data
            toast.success('测试成功', {
                description: state?.state
                    ? `当前${type === 'power' ? '功率' : '仓温'}：${state.state}${type === 'temperature' ? state.unit ?? '' : ''}`
                    : '已成功获取实体状态',
            })
        } catch (error) {
            showRequestError(error, '测试失败')
        } finally {
            setTesting(false)
        }
    }

    const saveEntity = async (type: 'power' | 'temperature') => {
        if (!printer?.id) return
        const isPower = type === 'power'
        const value = (isPower ? powerEntityId : chamberTempEntityId).trim()
        const savedValue = isPower ? printer.powerEntityId : printer.chamberTempEntityId
        const setEditing = isPower ? setPowerEntityEditing : setChamberTempEntityEditing
        const setSaving = isPower ? setSavePowerLoading : setSaveChamberTempLoading
        if ((savedValue ?? '') === value) {
            setEditing(false)
            return
        }
        setSaving(true)
        try {
            if (isPower) {
                await updatePrinterPowerEntity({ printerId: printer.id, powerEntityId: value || undefined })
            } else {
                await updatePrinterChamberTempEntity({ printerId: printer.id, chamberTempEntityId: value || undefined })
            }
            const nextPrinter = await refreshPrinter()
            if (isPower) setPowerEntityId(nextPrinter?.powerEntityId ?? value)
            else setChamberTempEntityId(nextPrinter?.chamberTempEntityId ?? value)
            setEditing(false)
            toast.success(`${isPower ? '功耗' : '仓温'}实体更新成功`)
        } catch (error) {
            showRequestError(error, `${isPower ? '功耗' : '仓温'}实体更新失败`)
        } finally {
            setSaving(false)
        }
    }

    const handleSaveCamera = async () => {
        if (!printer?.id) return
        const nextValue = cameraRtspUrl.trim()
        if ((printer.customCameraRtspUrl ?? '') === nextValue) {
            setCameraRtspEditing(false)
            return
        }
        setSaveCameraRtspLoading(true)
        try {
            await updatePrinterCustomCameraRtspUrl({ printerId: printer.id, customCameraRtspUrl: nextValue || undefined })
            const nextPrinter = await refreshPrinter()
            setCameraRtspUrl(nextPrinter?.customCameraRtspUrl ?? nextValue)
            setCameraRtspEditing(false)
            toast.success('自定义摄像头 RTSP 更新成功')
        } catch (error) {
            showRequestError(error, '自定义摄像头 RTSP 更新失败')
        } finally {
            setSaveCameraRtspLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>打印机详情</DialogTitle>
                    <DialogDescription className="sr-only">设备信息</DialogDescription>
                </DialogHeader>
                {loading ? (
                    <div className="space-y-3"><Skeleton className="h-5 w-full" /><Skeleton className="h-5 w-3/4" /><Skeleton className="h-5 w-1/2" /></div>
                ) : printer ? (
                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-3 text-sm">
                            <div><span className="text-muted-foreground">设备名称:</span> <span className="font-medium">{printer.name || '-'}</span></div>
                            <div><span className="text-muted-foreground">设备ID:</span> <span className="font-mono text-xs">{printer.deviceId || '-'}</span></div>
                            <div><span className="text-muted-foreground">型号:</span> <span className="font-medium">{printer.model || '-'}</span></div>
                            <div><span className="text-muted-foreground">访问码:</span> <span className="font-mono text-xs">{printer.accessCode || '-'}</span></div>
                            <div><span className="text-muted-foreground">IP地址:</span> <span className="font-mono text-xs">{printer.ipAddress || '-'}</span></div>
                            <div className="min-w-0">
                                <div className="flex items-center gap-1.5 whitespace-nowrap">
                                    <span className="shrink-0 text-muted-foreground">位置:</span>
                                    {locationEditing ? (
                                        <div className="flex items-center gap-0.5">
                                            <Input value={location} onChange={(event) => setLocation(event.target.value)} placeholder="1-A2-3-A" className="h-7 w-24 text-base md:text-xs" onKeyDown={(event) => {
                                                if (event.key === 'Enter') void handleSaveLocation()
                                                if (event.key === 'Escape') {
                                                    setLocation(printer.location ?? '')
                                                    setLocationEditing(false)
                                                }
                                            }} autoFocus disabled={saveLocationLoading} />
                                            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer text-green-600 hover:text-green-700" onClick={() => void handleSaveLocation()} disabled={saveLocationLoading}>
                                                {saveLocationLoading ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                                            </Button>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 cursor-pointer text-red-500 hover:text-red-600" onClick={() => {
                                                setLocation(printer.location ?? '')
                                                setLocationEditing(false)
                                            }} disabled={saveLocationLoading}><X size={12} /></Button>
                                        </div>
                                    ) : (
                                        <div className="group flex min-w-0 cursor-pointer items-center gap-1" onClick={() => {
                                            setLocation(printer.location ?? '')
                                            setLocationEditing(true)
                                        }}>
                                            {printer.location ? (
                                                <span className="flex items-center gap-1 rounded bg-primary/10 px-1 py-0.5 text-xs font-medium text-primary"><MapPin size={10} />{printer.location}</span>
                                            ) : <span className="text-xs text-muted-foreground opacity-60 group-hover:opacity-100">点击设置</span>}
                                        </div>
                                    )}
                                </div>
                            </div>
                            {isIntranet && (
                                <div className="col-span-2 min-w-0 space-y-3">
                                    <EditableEntityField label="功耗实体" value={powerEntityId} savedValue={printer.powerEntityId} placeholder="sensor.xxx_power" editing={powerEntityEditing} saving={savePowerLoading} testing={testPowerLoading} badgeClassName="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" onChange={setPowerEntityId} onEdit={() => {
                                        setPowerEntityId(printer.powerEntityId ?? '')
                                        setPowerEntityEditing(true)
                                    }} onCancel={() => {
                                        setPowerEntityId(printer.powerEntityId ?? '')
                                        setPowerEntityEditing(false)
                                    }} onSave={() => void saveEntity('power')} onTest={() => void testEntity('power')} />
                                    <EditableEntityField label="仓温实体" value={chamberTempEntityId} savedValue={printer.chamberTempEntityId} placeholder="sensor.xxx_chamber_temp" editing={chamberTempEntityEditing} saving={saveChamberTempLoading} testing={testChamberTempLoading} badgeClassName="bg-orange-500/10 text-orange-700 dark:text-orange-300" onChange={setChamberTempEntityId} onEdit={() => {
                                        setChamberTempEntityId(printer.chamberTempEntityId ?? '')
                                        setChamberTempEntityEditing(true)
                                    }} onCancel={() => {
                                        setChamberTempEntityId(printer.chamberTempEntityId ?? '')
                                        setChamberTempEntityEditing(false)
                                    }} onSave={() => void saveEntity('temperature')} onTest={() => void testEntity('temperature')} />
                                    <EditableEntityField label="自定义摄像头" value={cameraRtspUrl} savedValue={printer.customCameraRtspUrl} placeholder="rtsp://..." editing={cameraRtspEditing} saving={saveCameraRtspLoading} badgeClassName="bg-sky-500/10 text-sky-700 dark:text-sky-300" onChange={setCameraRtspUrl} onEdit={() => {
                                        setCameraRtspUrl(printer.customCameraRtspUrl ?? '')
                                        setCameraRtspEditing(true)
                                    }} onCancel={() => {
                                        setCameraRtspUrl(printer.customCameraRtspUrl ?? '')
                                        setCameraRtspEditing(false)
                                    }} onSave={() => void handleSaveCamera()} />
                                </div>
                            )}
                            <div><span className="text-muted-foreground">创建时间:</span> {printer.createTime ? <FormattedTime time={printer.createTime} className="text-xs" /> : '-'}</div>
                            <div className="col-span-2"><span className="text-muted-foreground">更新时间:</span> {printer.updateTime ? <FormattedTime time={printer.updateTime} className="text-xs" /> : '-'}</div>
                        </div>
                        <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => void handleRefresh()} disabled={refreshLoading} className="cursor-pointer">
                                {refreshLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />} 刷新
                            </Button>
                            <AlertDialog>
                                <AlertDialogTrigger asChild><Button variant="destructive" className="cursor-pointer">解绑</Button></AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader><AlertDialogTitle>确定要解绑这个打印机吗？</AlertDialogTitle><AlertDialogDescription>解绑后需要重新绑定才能使用。</AlertDialogDescription></AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel className="cursor-pointer">取消</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => void handleUnbind()} disabled={unbindLoading} className="cursor-pointer bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                            {unbindLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}确定解绑
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        </div>
                    </div>
                ) : <p className="py-6 text-center text-muted-foreground">暂无信息</p>}
            </DialogContent>
        </Dialog>
    )
}
