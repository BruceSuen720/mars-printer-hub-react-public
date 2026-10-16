import { useCallback, useMemo, useRef, useState } from 'react'
import { Download, Eye, Link2, Loader2, QrCode, RefreshCw, ScanLine, Unlink } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { QRCodeSVG } from 'qrcode.react'
import { toast } from 'sonner'
import { bindSlotSpool } from '@/api/device'
import { getAllAvailableSpools, getAllAvailableSpoolsWithId, listSpoolsBound } from '@/api/spool'
import HomeScanDialog from '@/components/home/HomeScanDialog'
import { Button, iconTextUniformWidthClass } from '@/components/ui/button'
import { Combobox } from '@/components/ui/combobox'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { showRequestError } from '@/request'
import { formatColor, getHexTagStyle, getSlotDisplayName } from '../deviceManage.utils'

interface SlotWorkflowDialogsProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    ams: API.AmsVO | null
    slot: API.AmsSlotsVO | null
    printerId?: number
    onReload: () => Promise<void>
}

export function SlotWorkflowDialogs({ open, onOpenChange, ams, slot, printerId, onReload }: SlotWorkflowDialogsProps) {
    const navigate = useNavigate()
    const qrRef = useRef<HTMLDivElement | null>(null)
    const [bindOpen, setBindOpen] = useState(false)
    const [bindLoading, setBindLoading] = useState(false)
    const [allSpools, setAllSpools] = useState<API.SpoolVO[]>([])
    const [boundIds, setBoundIds] = useState<Set<number>>(new Set())
    const [selectedSpoolId, setSelectedSpoolId] = useState('')
    const [scanOpen, setScanOpen] = useState(false)
    const [qrOpen, setQrOpen] = useState(false)

    const qrValue = useMemo(() => {
        if (!printerId || !slot?.amsId || slot.slotNo == null) return ''
        return `/ams/slot?printerId=${printerId}&amsId=${slot.amsId}&slotNo=${slot.slotNo}`
    }, [printerId, slot?.amsId, slot?.slotNo])

    const loadSpools = async (currentSpoolId?: number) => {
        try {
            const spoolRequest = currentSpoolId == null
                ? getAllAvailableSpools()
                : getAllAvailableSpoolsWithId({ spoolId: currentSpoolId })
            const [spoolResponse, boundResponse] = await Promise.all([spoolRequest, listSpoolsBound()])
            setAllSpools(spoolResponse.data.data ?? [])
            setBoundIds(new Set((boundResponse.data.data ?? []).map((item) => item.id).filter((id): id is number => typeof id === 'number')))
        } catch (error) {
            console.error('加载耗材列表失败:', error)
        }
    }

    const openBind = () => {
        onOpenChange(false)
        setSelectedSpoolId('')
        setBindOpen(true)
        void loadSpools()
    }

    const openRebind = () => {
        const currentSpoolId = slot?.spoolId
        setSelectedSpoolId(String(currentSpoolId ?? ''))
        onOpenChange(false)
        setBindOpen(true)
        if (currentSpoolId != null) void loadSpools(currentSpoolId)
    }

    const bindWithSpoolId = useCallback(async (spoolId: number) => {
        if (!slot || !spoolId) {
            toast.warning('请选择耗材')
            return
        }
        setBindLoading(true)
        try {
            const payload: API.AmsBindRequest = {
                amsId: slot.amsId!,
                slotNo: slot.slotNo!,
                spoolId,
                syncUpdateDevice: false,
            }
            if (slot.trayInfoIdx) payload.trayInfoIdx = slot.trayInfoIdx
            await bindSlotSpool(payload)
            toast.success('绑定成功')
            setBindOpen(false)
            await onReload()
        } catch (error) {
            showRequestError(error, '绑定失败')
        } finally {
            setBindLoading(false)
        }
    }, [onReload, slot])

    const handleScanResult = useCallback(async (rawText: string) => {
        const text = rawText.trim()
        if (!text) {
            toast.error('未识别到二维码内容')
            return
        }

        let spoolId: number | null = null
        const directMatch = text.match(/^\/spool\/detail\/(\d+)(?:[/?#].*)?$/)
        if (directMatch) {
            spoolId = Number(directMatch[1])
        } else {
            try {
                const url = new URL(text, window.location.origin)
                const pathMatch = url.pathname.match(/^\/spool\/detail\/(\d+)$/)
                if (pathMatch) spoolId = Number(pathMatch[1])
            } catch {
                spoolId = null
            }
        }

        if (!spoolId) {
            toast.error('这不是有效的耗材二维码')
            return
        }
        const matchedSpool = allSpools.find((item) => item.id === spoolId)
        if (!matchedSpool || boundIds.has(spoolId) || (matchedSpool.usedWeight ?? 0) >= (matchedSpool.netWeight ?? 0)) {
            toast.error('该耗材当前不可绑定')
            return
        }
        setSelectedSpoolId(String(spoolId))
        setScanOpen(false)
        await bindWithSpoolId(spoolId)
    }, [allSpools, bindWithSpoolId, boundIds])

    const handleUnbind = async () => {
        if (!slot) return
        try {
            await bindSlotSpool({
                amsId: slot.amsId!,
                slotNo: slot.slotNo!,
                spoolId: 0,
                syncUpdateDevice: false,
            } as API.AmsBindRequest)
            toast.success('解绑成功')
            onOpenChange(false)
            await onReload()
        } catch (error) {
            showRequestError(error, '解绑失败')
        }
    }

    const handleDownloadQr = async () => {
        if (!qrRef.current || !slot?.amsId || slot.slotNo == null) {
            toast.error('二维码尚未准备完成')
            return
        }
        try {
            const { toPng } = await import('html-to-image')
            const dataUrl = await toPng(qrRef.current, { cacheBust: true, pixelRatio: 2, backgroundColor: '#ffffff' })
            const link = document.createElement('a')
            link.href = dataUrl
            link.download = `ams-${slot.amsId}-slot-${slot.slotNo}.png`
            link.click()
            toast.success('二维码已开始下载')
        } catch (error) {
            showRequestError(error, '下载二维码失败')
        }
    }

    return (
        <>
            <Dialog open={open} onOpenChange={(nextOpen) => {
                onOpenChange(nextOpen)
                if (!nextOpen) setQrOpen(false)
            }}>
                <DialogContent className="max-w-md">
                    <DialogHeader><DialogTitle>槽位详情</DialogTitle><DialogDescription className="sr-only">AMS slot info</DialogDescription></DialogHeader>
                    {slot && (
                        <div className="space-y-4">
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between"><span className="text-muted-foreground">AMS编号</span><span className="font-medium">{ams?.amsName}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">槽位编号</span><span className="font-medium">{getSlotDisplayName(ams?.amsNo, slot.slotNo)}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">槽位颜色</span><span className="inline-block rounded px-2 py-0.5 font-mono text-xs" style={{ backgroundColor: formatColor(slot.trayColor) || 'transparent', ...getHexTagStyle(slot.trayColor) }}>{formatColor(slot.trayColor) || '-'}</span></div>
                                <div className="flex justify-between"><span className="text-muted-foreground">绑定状态</span><span className={`rounded px-2 py-0.5 text-xs ${slot.spoolId ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>{slot.spoolId ? '已绑定' : '未绑定'}</span></div>
                                <div className="flex items-center justify-between"><span className="text-muted-foreground">二维码</span><Button type="button" variant="outline" size="sm" onClick={() => setQrOpen(true)} className="cursor-pointer"><QrCode size={14} className="mr-1" />二维码</Button></div>
                                {slot.spool && (
                                    <>
                                        <div className="border-t border-border/40 pt-2"><span className="text-xs font-semibold text-muted-foreground">绑定耗材信息</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">耗材ID</span><span>#{slot.spool.id}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">耗材名称</span><span className="font-medium">{slot.spool.name}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">耗材类型</span><span>{slot.spool.materialType}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">耗材品牌</span><span>{slot.spool.brand || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">耗材颜色</span><span className="inline-block rounded px-2 py-0.5 font-mono text-xs" style={{ backgroundColor: formatColor(slot.spool.color) || 'transparent', ...getHexTagStyle(slot.spool.color) }}>{formatColor(slot.spool.color) || '-'}</span></div>
                                        <div className="flex justify-between"><span className="text-muted-foreground">剩余重量</span><span className="font-semibold">{slot.spool.remainingWeight}g ({slot.spool.remainingPercentage}%)</span></div>
                                    </>
                                )}
                            </div>
                            <div className="flex flex-wrap justify-end gap-2">
                                {!slot.spoolId && <Button variant="outline" onClick={openBind} className="cursor-pointer"><Link2 size={14} className="mr-1" />绑定耗材</Button>}
                                {slot.spoolId && <Button variant="outline" onClick={() => {
                                    onOpenChange(false)
                                    navigate(`/spool/detail/${slot.spoolId}`)
                                }} className={cn('cursor-pointer', iconTextUniformWidthClass)}><Eye size={14} className="mr-1" />耗材详情</Button>}
                                {slot.spoolId && <Button variant="outline" onClick={openRebind} className={cn('cursor-pointer', iconTextUniformWidthClass)}><RefreshCw size={14} className="mr-1" />重新绑定</Button>}
                                {slot.spoolId && <Button variant="destructive" onClick={() => void handleUnbind()} className={cn('cursor-pointer', iconTextUniformWidthClass)}><Unlink size={14} className="mr-1" />解绑耗材</Button>}
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <Dialog open={bindOpen} onOpenChange={(nextOpen) => {
                setBindOpen(nextOpen)
                if (!nextOpen) setScanOpen(false)
            }}>
                <DialogContent className="max-w-lg">
                    <DialogHeader><DialogTitle>绑定耗材</DialogTitle><DialogDescription className="sr-only">选择要绑定到此槽位的耗材</DialogDescription></DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-1 text-sm">
                            <p><span className="text-muted-foreground">AMS:</span> <span className="font-medium">{ams?.amsName}</span></p>
                            <p><span className="text-muted-foreground">槽位:</span> <span className="font-medium">{getSlotDisplayName(ams?.amsNo, slot?.slotNo)}</span></p>
                        </div>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between gap-3"><Label>选择耗材</Label><Button type="button" variant="outline" size="sm" onClick={() => setScanOpen(true)} className="cursor-pointer"><ScanLine size={14} className="mr-1" />二维码</Button></div>
                            <Combobox options={allSpools.map((spool) => {
                                const disabled = boundIds.has(spool.id ?? -1) || (spool.usedWeight ?? 0) >= (spool.netWeight ?? 0)
                                return {
                                    value: String(spool.id),
                                    label: [String(spool.id), spool.name, spool.materialType, spool.brand].filter(Boolean).join(' '),
                                    disabled,
                                    renderOption: <div className={`flex min-w-0 w-full items-center justify-between pr-2 ${disabled ? 'opacity-40' : ''}`}><div className="flex min-w-0 items-center gap-2 overflow-hidden"><span className="h-3.5 w-3.5 flex-shrink-0 rounded-full border border-border" style={{ backgroundColor: spool.color || '#ccc' }} /><span className="truncate">#{spool.id} {spool.name || `耗材-${spool.id}`}</span></div><span className="ml-2 flex-shrink-0 text-xs text-muted-foreground">剩余 {spool.remainingWeight ?? '-'}g</span></div>,
                                    renderValue: spool.name ? `#${spool.id} ${spool.name}` : `耗材-${spool.id}`,
                                }
                            })} value={selectedSpoolId} onChange={(value) => setSelectedSpoolId(value || '')} placeholder="请选择耗材" searchPlaceholder="按名称/品牌/材料搜索" emptyText="未找到耗材" />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setBindOpen(false)} className="cursor-pointer">取消</Button>
                        <Button onClick={() => void bindWithSpoolId(Number(selectedSpoolId))} disabled={bindLoading || !selectedSpoolId} className="cursor-pointer">{bindLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}确定绑定</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <HomeScanDialog open={scanOpen} onOpenChange={setScanOpen} onScanResult={(text) => void handleScanResult(text)} title="扫码绑定耗材" description="扫描耗材详情二维码后，会将该耗材直接绑定到当前 AMS 槽位。" />

            <Dialog open={qrOpen} onOpenChange={setQrOpen}>
                <DialogContent className="max-w-sm">
                    <DialogHeader><DialogTitle>槽位二维码</DialogTitle><DialogDescription>扫描后可在耗材详情页中直接绑定到该 AMS 槽位。</DialogDescription></DialogHeader>
                    <div className="flex flex-col items-center gap-4">
                        <div ref={qrRef} className="rounded-2xl bg-white p-4 shadow-sm"><div className="mb-3 text-center"><p className="text-sm font-semibold text-slate-900">{ams?.amsName || 'AMS'} {getSlotDisplayName(ams?.amsNo, slot?.slotNo)}</p></div><QRCodeSVG value={qrValue || '/'} size={192} marginSize={3} includeMargin /></div>
                        <Button variant="outline" onClick={() => void handleDownloadQr()} className="w-full cursor-pointer"><Download size={14} className="mr-1" />下载二维码</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}
