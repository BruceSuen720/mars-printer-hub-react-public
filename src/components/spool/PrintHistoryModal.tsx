import { useState, useEffect, useCallback, useMemo } from 'react'
import { toast } from 'sonner'
import { Printer, Save, Search, AlertCircle, Loader2 } from 'lucide-react'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select'
import { getTaskList, handleTask } from '@/api/bambuTask'
import { FormattedTime } from '@/components/ui/formatted-time'
import { showRequestError } from '@/request'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { getTablePageSizeOptions, normalizeTablePageSize } from '@/utils/tablePageSize'

interface PrintHistoryModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    onSuccess?: () => void
}

const statusColorMap: Record<number, string> = {
    2: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',    // Success
    3: 'bg-gray-500/15 text-gray-600 dark:text-gray-400',          // Canceled
    4: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',          // Processing
}
const getStatusText = (status?: number) => {
    switch (status) {
        case 2: return '已完成'
        case 3: return '已取消'
        case 4: return '打印中'
        default: return '未知'
    }
}

const formatDuration = (seconds?: number) => {
    if (!seconds) return '-'
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    if (hours > 0) {
        return `${hours}h ${minutes}m`
    }
    return `${minutes}m`
}

export default function PrintHistoryModal({ open, onOpenChange, onSuccess }: PrintHistoryModalProps) {
    const preferredPageSize = useUserConfigStore((s) => normalizeTablePageSize(s.userConfig.pageSize))
    const userConfigLoaded = useUserConfigStore((s) => s.loaded)
    const [loading, setLoading] = useState(false)
    const [taskList, setTaskList] = useState<API.BambuTaskDTO[]>([])
    const [total, setTotal] = useState(0)
    const [pagination, setPagination] = useState({ current: 1, pageSize: preferredPageSize })
    const [searchQuery, setSearchQuery] = useState('')
    const [handleTaskLoadingId, setHandleTaskLoadingId] = useState<number | null>(null)
    const [pageSizeChanged, setPageSizeChanged] = useState(false)
    const pageSizeOptions = useMemo(() => getTablePageSizeOptions(preferredPageSize), [preferredPageSize])

    const fetchTaskList = useCallback(async (current: number, query: string, pageSize: number) => {
        setLoading(true)
        try {
            const offset = (current - 1) * pageSize
            const res = await getTaskList({
                offset,
                limit: pageSize,
                query: query || undefined,
            })
            if (res.data?.data) {
                setTaskList(res.data.data.hits || [])
                setTotal(res.data.data.total || 0)
            }
        } catch (error) {
            showRequestError(error, '获取打印历史失败')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        if (open) {
            setPageSizeChanged(false)
            setPagination({ current: 1, pageSize: preferredPageSize })
            setSearchQuery('')
            fetchTaskList(1, '', preferredPageSize)
        }
    }, [open, fetchTaskList, preferredPageSize])

    useEffect(() => {
        if (!open || !userConfigLoaded || pageSizeChanged || pagination.pageSize === preferredPageSize) {
            return
        }

        setPagination({ current: 1, pageSize: preferredPageSize })
        fetchTaskList(1, searchQuery, preferredPageSize)
    }, [fetchTaskList, open, pageSizeChanged, pagination.pageSize, preferredPageSize, searchQuery, userConfigLoaded])

    const handleSearch = () => {
        setPagination(p => ({ ...p, current: 1 }))
        fetchTaskList(1, searchQuery, pagination.pageSize)
    }

    const handleRecordTask = async (task: API.BambuTaskDTO) => {
        if (!task.deviceId) {
            toast.warning('该任务没有关联设备')
            return
        }

        if (task.id === undefined) return
        setHandleTaskLoadingId(task.id)

        try {
            await handleTask({ deviceId: task.deviceId }, task)
            toast.success('任务记录成功')
            onOpenChange(false)
            onSuccess?.()
        } catch (error) {
            showRequestError(error, '记录任务失败')
        } finally {
            setHandleTaskLoadingId(null)
        }
    }

    const totalPages = Math.max(1, Math.ceil(total / pagination.pageSize))

    const handlePageChange = (newPage: number) => {
        setPagination(p => ({ ...p, current: newPage }))
        fetchTaskList(newPage, searchQuery, pagination.pageSize)
    }

    const handlePageSizeChange = (size: number) => {
        setPageSizeChanged(true)
        setPagination({ current: 1, pageSize: size })
        fetchTaskList(1, searchQuery, size)
    }

    const getTaskTitle = (task: API.BambuTaskDTO) => {
        return task.designTitle || task.title || '未命名任务'
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle>打印历史</DialogTitle>
                    <DialogDescription className="sr-only">从拓竹云获取的打印历史记录</DialogDescription>
                </DialogHeader>

                {/* Search Bar */}
                <div className="flex items-center gap-2 mb-2 w-full sm:w-[300px]">
                    <Input
                        placeholder="搜索任务名称..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch()}
                        className="h-9"
                    />
                    <Button size="sm" onClick={handleSearch} className="h-9 cursor-pointer">
                        <Search size={14} />
                    </Button>
                </div>

                {/* Task List */}
                <div className="themed-scrollbar flex-1 overflow-y-auto pr-2 space-y-3 min-h-[300px]">
                    {loading ? (
                        Array.from({ length: 3 }).map((_, i) => (
                            <div key={i} className="flex gap-4 p-4 rounded-xl border border-border bg-card">
                                <Skeleton className="h-20 w-20 rounded-lg flex-shrink-0" />
                                <div className="flex-1 space-y-3 py-1">
                                    <Skeleton className="h-5 w-3/4" />
                                    <Skeleton className="h-4 w-1/2" />
                                    <Skeleton className="h-4 w-full" />
                                </div>
                            </div>
                        ))
                    ) : taskList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full py-12 text-muted-foreground">
                            <AlertCircle size={32} className="mb-2 opacity-50" />
                            <p>暂无打印历史</p>
                        </div>
                    ) : (
                        taskList.map(task => (
                            <div key={task.id} className="flex flex-col sm:flex-row gap-4 p-4 rounded-xl border border-card-foreground/10 bg-card/50 hover:bg-card hover:border-border transition-colors">
                                {/* Cover */}
                                <div className="flex-shrink-0">
                                    {task.cover ? (
                                        <Dialog>
                                            <DialogTrigger asChild>
                                                <img
                                                    src={task.cover}
                                                    alt="Task Cover"
                                                    className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-lg object-cover border border-border cursor-pointer hover:opacity-80 transition-opacity"
                                                />
                                            </DialogTrigger>
                                            <DialogContent className="max-w-3xl border-none bg-transparent p-0 shadow-none">
                                                <DialogHeader className="sr-only">
                                                    <DialogTitle>View Image</DialogTitle>
                                                    <DialogDescription>Full size task cover image</DialogDescription>
                                                </DialogHeader>
                                                <img
                                                    src={task.cover}
                                                    alt="Task Cover Full"
                                                    className="w-full h-auto rounded-lg object-contain max-h-[85vh]"
                                                />
                                            </DialogContent>
                                        </Dialog>
                                    ) : (
                                        <div className="w-[60px] h-[60px] sm:w-[80px] sm:h-[80px] rounded-lg bg-muted flex items-center justify-center border border-border">
                                            <span className="text-xs text-muted-foreground">无封面</span>
                                        </div>
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between gap-3">
                                    <div>
                                        {/* Header */}
                                        <div className="flex items-start justify-between gap-2 mb-1.5">
                                            <h4 className="font-semibold text-foreground text-sm sm:text-base line-clamp-1 truncate" title={getTaskTitle(task)}>
                                                {getTaskTitle(task)}
                                            </h4>
                                            <span className="text-xs text-muted-foreground font-mono flex-shrink-0">#{task.id}</span>
                                        </div>

                                        {/* Meta Tags */}
                                        <div className="flex flex-wrap items-center gap-2 mb-2">
                                            <span className={`px-2 py-0.5 rounded text-xs leading-tight ${statusColorMap[task.status ?? -1] ?? 'bg-foreground/5 text-muted-foreground'}`}>
                                                {getStatusText(task.status)}
                                            </span>
                                            {task.deviceName && (
                                                <span className="flex items-center text-xs text-muted-foreground">
                                                    <Printer size={12} className="mr-1" />
                                                    {task.deviceName}
                                                </span>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                                            {task.weight != null && <span><span className="opacity-70">重量:</span> <span className="text-foreground">{task.weight}g</span></span>}
                                            {task.costTime != null && <span><span className="opacity-70">用时:</span> <span className="text-foreground">{formatDuration(task.costTime)}</span></span>}
                                            {task.startTime && <span><span className="text-blue-500 opacity-80">开始:</span> <span className="text-foreground"><FormattedTime time={task.startTime} /></span></span>}
                                            {task.status !== 4 && task.endTime && <span><span className="text-emerald-500 opacity-80">结束:</span> <span className="text-foreground"><FormattedTime time={task.endTime} /></span></span>}
                                        </div>

                                        {/* Color mapping */}
                                        {task.amsDetailMapping && task.amsDetailMapping.length > 0 && (
                                            <div className="flex flex-wrap gap-1.5 mt-3">
                                                {task.amsDetailMapping.map((ams, idx) => (
                                                    <div key={idx} className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-border bg-background/50 text-xs">
                                                        <div
                                                            className="w-2.5 h-2.5 rounded-full border border-black/10 dark:border-white/10"
                                                            style={{ backgroundColor: ams.targetColor || ams.sourceColor || '#ccc' }}
                                                        />
                                                        <span className="text-foreground/80">{ams.filamentType || ams.targetFilamentType || '-'}</span>
                                                        {ams.weight && <span className="text-muted-foreground">{ams.weight}g</span>}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>

                                    {/* Action button (Mobile bottom, Desktop right aligned) */}
                                    <div className="flex justify-end pt-2 border-t border-border/50 sm:border-0 sm:pt-0">
                                        <Button
                                            size="sm"
                                            onClick={() => handleRecordTask(task)}
                                            disabled={!task.deviceId || handleTaskLoadingId === task.id}
                                            className="h-8 cursor-pointer w-full sm:w-auto text-xs"
                                        >
                                            {handleTaskLoadingId === task.id ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : <Save size={14} className="mr-1.5" />}
                                            记录任务
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* Pagination */}
                {total > 0 && (
                    <div className="flex items-center justify-between border-t border-border pt-4 mt-2">
                        <span className="text-sm text-muted-foreground">共 {total} 条</span>
                        <div className="flex items-center gap-2">
                            <Select value={String(pagination.pageSize)} onValueChange={(value) => handlePageSizeChange(Number(value))}>
                                <SelectTrigger className="h-8 w-[108px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {pageSizeOptions.map((size) => (
                                        <SelectItem key={size} value={String(size)}>
                                            {size} / 页
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.current - 1)}
                                disabled={pagination.current <= 1 || loading}
                                className="h-8 cursor-pointer"
                            >
                                上一页
                            </Button>
                            <span className="text-sm text-foreground mx-2">{pagination.current} / {totalPages}</span>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handlePageChange(pagination.current + 1)}
                                disabled={pagination.current >= totalPages || loading}
                                className="h-8 cursor-pointer"
                            >
                                下一页
                            </Button>
                        </div>
                    </div>
                )}
            </DialogContent>
        </Dialog>
    )
}
