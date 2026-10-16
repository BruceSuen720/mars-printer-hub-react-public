import { useState, useEffect, useCallback } from 'react'
import { toast } from 'sonner'
import { GripVertical, Info, Loader2 } from 'lucide-react'
import { listPrinters } from '@/api/device'
import { updatePrinterSort } from '@/api/printer'
import { Button } from '@/components/ui/button'
import { showRequestError } from '@/request'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'

interface PrinterSortModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess: () => void
}

export default function PrinterSortModal({
    open,
    onOpenChange,
    onSuccess,
}: PrinterSortModalProps) {
    const [localPrinters, setLocalPrinters] = useState<API.DeviceSimpleVO[]>([])
    const [dragIndex, setDragIndex] = useState<number | null>(null)
    const [loading, setLoading] = useState(false)
    const [fetching, setFetching] = useState(false)

    useEffect(() => {
        if (!open) {
            return
        }

        const fetchPrinters = async () => {
            setFetching(true)
            try {
                const res = await listPrinters()
                setLocalPrinters(res.data?.data ?? [])
            } catch (error) {
                showRequestError(error, '获取打印机排序列表失败')
            } finally {
                setFetching(false)
            }
        }

        fetchPrinters()
    }, [open])

    const onDragStart = useCallback((index: number) => {
        setDragIndex(index)
    }, [])

    const onDragEnter = useCallback(
        (index: number) => {
            if (dragIndex !== null && dragIndex !== index) {
                setLocalPrinters((prev) => {
                    const next = [...prev]
                    const [item] = next.splice(dragIndex, 1)
                    next.splice(index, 0, item)
                    return next
                })
                setDragIndex(index)
            }
        },
        [dragIndex],
    )

    const onDragEnd = useCallback(() => {
        setDragIndex(null)
    }, [])

    const handleSave = async () => {
        setLoading(true)
        try {
            const sortData = localPrinters.map((item, index) => ({
                id: item.id!,
                sort: index,
            }))
            await updatePrinterSort(sortData)
            toast.success('排序保存成功')
            onSuccess()
            onOpenChange(false)
        } catch (error) {
            showRequestError(error, '保存排序失败')
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>打印机排序</DialogTitle>
                    <DialogDescription className="sr-only">
                        拖拽列表项来调整打印机的显示顺序
                    </DialogDescription>
                </DialogHeader>

                {/* Tip */}
                <div className="flex items-center gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900/50 dark:bg-sky-950/30 dark:text-sky-300">
                    <Info size={15} className="shrink-0" />
                    <span>拖拽列表项进行排序</span>
                </div>

                {/* Sort list */}
                <div
                    className="max-h-[400px] overflow-y-auto rounded-lg border border-border bg-muted/30 p-1"
                    onDragOver={(e) => e.preventDefault()}
                >
                    {fetching ? (
                        <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin" />
                            加载中
                        </div>
                    ) : localPrinters.length === 0 ? (
                        <div className="px-4 py-10 text-center text-sm text-muted-foreground">
                            暂无打印机数据
                        </div>
                    ) : (
                        localPrinters.map((item, index) => (
                            <div
                                key={item.id}
                                className={`mb-1 flex cursor-move select-none items-center gap-3 rounded-lg border bg-card px-4 py-2.5 transition-all last:mb-0 ${dragIndex === index
                                        ? 'border-dashed border-primary/50 opacity-50'
                                        : 'border-border hover:border-primary/30 hover:bg-accent/50'
                                    }`}
                                draggable
                                onDragStart={() => onDragStart(index)}
                                onDragEnter={() => onDragEnter(index)}
                                onDragEnd={onDragEnd}
                                onDragOver={(e) => e.preventDefault()}
                            >
                                <GripVertical size={16} className="shrink-0 text-muted-foreground" />
                                <div className="flex flex-1 items-center gap-2">
                                    <span className="font-medium text-foreground">
                                        {item.name || '未命名打印机'}
                                    </span>
                                    {item.model && (
                                        <span className="rounded bg-foreground/[0.05] px-1.5 py-0.5 text-xs text-muted-foreground">
                                            {item.model}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs text-muted-foreground/60">
                                    ID: {item.id}
                                </span>
                            </div>
                        ))
                    )}
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="cursor-pointer"
                    >
                        取消
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={loading || fetching || localPrinters.length === 0}
                        className="cursor-pointer"
                    >
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        保存
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
