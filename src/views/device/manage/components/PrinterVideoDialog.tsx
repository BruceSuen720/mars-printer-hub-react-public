import { Video } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import { PrinterVideo } from '@/components/printer/PrinterVideo'

interface PrinterVideoDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    printerName?: string
    deviceId: string
}

export function PrinterVideoDialog({ open, onOpenChange, printerName, deviceId }: PrinterVideoDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className="h-9 w-9 rounded-full shadow-lg bg-background/80 backdrop-blur-md text-foreground hover:text-primary hover:border-primary/50 transition-all"
                >
                    <Video size={16} />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[700px] bg-card border-border/50 shadow-2xl overflow-hidden p-0 rounded-xl">
                <DialogHeader className="p-4 pb-0">
                    <DialogTitle className="flex items-center gap-2">
                        <Video className="h-5 w-5 text-primary" />
                        {printerName || '打印机'} 实时画面
                    </DialogTitle>
                    <DialogDescription>实时监控设备舱内情况</DialogDescription>
                </DialogHeader>
                <div className="p-4 pt-2 h-[450px]">
                    <PrinterVideo deviceId={deviceId} autoPlay active={open} />
                </div>
            </DialogContent>
        </Dialog>
    )
}
