import { AlertTriangle, CheckCircle, CircleAlert } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import { getHmsDisplayMessage, getHmsSeverityMeta } from '../hms'

interface HmsErrorDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    printerName?: string
    errors: API.HmsErrorVO[]
}

export function HmsErrorDialog({ open, onOpenChange, printerName, errors }: HmsErrorDialogProps) {
    const topMeta = getHmsSeverityMeta(errors[0]?.severity)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[85vh] max-w-2xl gap-0 overflow-hidden p-0">
                <DialogHeader className="border-b border-border/60 p-5 pb-4">
                    <DialogTitle className="flex items-center gap-2">
                        <AlertTriangle className={cn('h-5 w-5', topMeta.iconClassName)} />
                        HMS 异常
                    </DialogTitle>
                    <DialogDescription>
                        {printerName || '当前设备'} 共检测到 {errors.length} 条 HMS 信息
                    </DialogDescription>
                </DialogHeader>
                <div className="max-h-[calc(85vh-112px)] overflow-y-auto p-5">
                    {errors.length === 0 ? (
                        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center text-muted-foreground">
                            <CheckCircle size={24} className="text-emerald-500" />
                            <p className="text-sm">暂无 HMS 异常</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {errors.map((error, index) => {
                                const meta = getHmsSeverityMeta(error.severity)
                                const detailRows = [
                                    { label: '模块', value: error.module },
                                    { label: '代码', value: error.code },
                                ].filter((item) => item.value !== undefined && item.value !== null && String(item.value).trim() !== '')

                                return (
                                    <div
                                        key={`${error.code ?? error.message ?? 'hms'}-${index}`}
                                        className={cn('rounded-lg border p-4', meta.panelClassName)}
                                    >
                                        <div className="flex min-w-0 items-start justify-between gap-3">
                                            <div className="flex min-w-0 gap-2">
                                                <CircleAlert size={16} className={cn('mt-0.5 shrink-0', meta.iconClassName)} />
                                                <div className="min-w-0">
                                                    <p className="break-words text-sm font-medium leading-6 text-foreground">
                                                        {getHmsDisplayMessage(error)}
                                                    </p>
                                                    {error.severity && (
                                                        <p className="mt-1 text-xs text-muted-foreground">原始级别: {error.severity}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <Badge variant="outline" className={cn('shrink-0 rounded-full', meta.badgeClassName)}>
                                                {meta.label}
                                            </Badge>
                                        </div>
                                        {detailRows.length > 0 && (
                                            <div className="mt-3 grid gap-2 rounded-md border border-border/50 bg-background/60 p-3 text-xs sm:grid-cols-2">
                                                {detailRows.map((row) => (
                                                    <div key={row.label} className="min-w-0">
                                                        <span className="text-muted-foreground">{row.label}</span>
                                                        <span className="ml-2 break-all font-mono text-foreground">{String(row.value)}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    )
}
