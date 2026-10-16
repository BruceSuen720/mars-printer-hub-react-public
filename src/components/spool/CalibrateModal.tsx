import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { DecimalInput } from '@/components/ui/decimal-input'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { CalibrateFormData } from '@/hooks/useSpoolCalibration'

interface CalibrateModalProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    loading: boolean
    readingWeight: boolean
    scaleWeight: number | null
    currentSpool: API.SpoolVO | null
    calibrateForm: CalibrateFormData
    onTotalWeightChange: (value: number | undefined) => void
    onSubmit: () => void
    onUseScaleWeight: () => void
}

export default function CalibrateModal({
    open,
    onOpenChange,
    loading,
    readingWeight,
    scaleWeight,
    currentSpool,
    calibrateForm,
    onTotalWeightChange,
    onSubmit,
    onUseScaleWeight,
}: CalibrateModalProps) {
    if (!currentSpool) return null

    const minWeight = currentSpool.spoolWeight ?? 0
    const maxWeight = (currentSpool.netWeight ?? 0) + (currentSpool.spoolWeight ?? 0)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="max-w-md"
                onOpenAutoFocus={(event) => {
                    event.preventDefault()
                }}
            >
                <DialogHeader>
                    <DialogTitle>校准耗材</DialogTitle>
                    <DialogDescription className="sr-only">
                        通过输入含料盘重量来校准耗材的已使用重量
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-4 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">名称</span>
                        <span className="font-medium text-foreground">{currentSpool.name}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">材料</span>
                        <span className="font-medium text-foreground">{currentSpool.materialType}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">剩余重量</span>
                        <span className="font-medium text-foreground">
                            {currentSpool.remainingWeight ?? currentSpool.netWeight}g
                        </span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">料盘重量</span>
                        <span className="font-medium text-foreground">
                            {currentSpool.spoolWeight ?? 0}g
                        </span>
                    </div>
                </div>

                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label>已使用重量(克)</Label>
                        <Input
                            type="number"
                            value={calibrateForm.usedWeight ?? ''}
                            disabled
                            className="bg-muted"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>含料盘重量(克) <span className="text-destructive">*</span></Label>
                        <DecimalInput
                            value={calibrateForm.totalWeightWithSpool ?? ''}
                            onValueChange={onTotalWeightChange}
                            onBlur={(e) => {
                                const val = e.target.value ? Number(e.target.value) : undefined
                                if (val !== undefined) {
                                    const clamped = Math.max(minWeight, Math.min(val, maxWeight))
                                    if (clamped !== val) {
                                        onTotalWeightChange(clamped)
                                    }
                                }
                            }}
                            placeholder="请输入含料盘重量"
                        />
                        <p className="text-xs text-muted-foreground">
                            范围: {minWeight}g ~ {maxWeight}g
                        </p>
                        {readingWeight && (
                            <p className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Loader2 className="h-3 w-3 animate-spin" />
                                正在读取电子秤重量
                            </p>
                        )}
                        {!readingWeight && scaleWeight != null && (
                            <div className="flex items-center justify-between rounded-md border border-border bg-muted/30 px-3 py-2">
                                <div className="text-xs">
                                    <div className="text-muted-foreground">电子秤当前读数</div>
                                    <div className="font-medium text-foreground">{scaleWeight}g</div>
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    className="cursor-pointer"
                                    disabled={loading}
                                    onClick={onUseScaleWeight}
                                >
                                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    使用并校准
                                </Button>
                            </div>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} className="cursor-pointer">
                        取消
                    </Button>
                    <Button onClick={onSubmit} disabled={loading} className="cursor-pointer">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        确定
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
