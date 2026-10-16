import { useCallback, useEffect, useMemo, useState } from 'react'
import { RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { listLogFiles, readLogContent } from '@/api/health'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Combobox } from '@/components/ui/combobox'
import { showRequestError } from '@/request'

type LogFile = {
    name: string
    size: number
    lastModified: number
}

type LogContentResp = {
    content?: string
    fileSize?: number
    totalLines?: number
    error?: string
}

const lineOptions = [
    { value: '100', label: '最近 100 行' },
    { value: '300', label: '最近 300 行' },
    { value: '500', label: '最近 500 行' },
    { value: '1000', label: '最近 1000 行' },
    { value: '-1', label: '显示所有' },
]

const levelOptions = [
    { value: 'ERROR', label: 'ERROR' },
    { value: 'WARN', label: 'WARN' },
    { value: 'INFO', label: 'INFO' },
    { value: 'DEBUG', label: 'DEBUG' },
]

export default function LogViewerPanel() {
    const [files, setFiles] = useState<LogFile[]>([])
    const [selectedFile, setSelectedFile] = useState('')
    const [logLevel, setLogLevel] = useState('')
    const [keyword, setKeyword] = useState('')
    const [lines, setLines] = useState('500')
    const [loadingFiles, setLoadingFiles] = useState(false)
    const [loadingContent, setLoadingContent] = useState(false)
    const [content, setContent] = useState('')
    const [fileSize, setFileSize] = useState(0)
    const [totalLines, setTotalLines] = useState(0)

    const formatSize = (bytes: number): string => {
        if (!bytes) return '0 B'
        const sizes = ['B', 'KB', 'MB', 'GB']
        const idx = Math.floor(Math.log(bytes) / Math.log(1024))
        return `${(bytes / (1024 ** idx)).toFixed(2)} ${sizes[idx]}`
    }

    const fetchLogFiles = useCallback(async () => {
        setLoadingFiles(true)
        try {
            const res = await listLogFiles()
            if (res.data?.data) {
                const data = (res.data.data as Record<string, unknown>[])
                    .filter((x): x is { name: string; size: number; lastModified: number } =>
                        typeof x.name === 'string' && typeof x.size === 'number' && typeof x.lastModified === 'number')
                setFiles(data)
                if (data[0]?.name) setSelectedFile((p) => p || data[0].name)
            }
        } catch (error) {
            showRequestError(error, '获取日志文件列表失败')
        } finally {
            setLoadingFiles(false)
        }
    }, [])

    const fetchLogContent = useCallback(async () => {
        if (!selectedFile) return
        setLoadingContent(true)
        try {
            const lineCount = lines === '-1' ? 100000 : Number(lines)
            const res = await readLogContent({
                filename: selectedFile,
                lines: lineCount,
                keyword: keyword || undefined,
                level: logLevel || undefined,
            })
            if (res.data?.data) {
                const data = res.data.data as LogContentResp
                if (data.error) {
                    toast.error(data.error)
                    setContent('')
                } else {
                    setContent(data.content || '')
                    setFileSize(data.fileSize || 0)
                    setTotalLines(data.totalLines || 0)
                }
            }
        } catch (error) {
            showRequestError(error, '读取日志内容失败')
        } finally {
            setLoadingContent(false)
        }
    }, [keyword, lines, logLevel, selectedFile])

    useEffect(() => { fetchLogFiles() }, [fetchLogFiles])
    useEffect(() => { if (selectedFile) fetchLogContent() }, [selectedFile, fetchLogContent])

    const parsedLines = useMemo(
        () => (content ? content.split('\n').filter((line) => line.trim()) : []),
        [content],
    )

    return (
        <div className="space-y-4 p-5">
            <div className="flex flex-wrap items-end gap-2 rounded-lg border border-border/60 bg-muted/20 p-3">
                <div className="min-w-[260px] flex-1">
                    <Label className="mb-1 block text-xs text-muted-foreground">日志文件</Label>
                    <Combobox
                        options={files.map((file) => ({
                            value: file.name,
                            label: `${file.name} (${formatSize(file.size)})`,
                        }))}
                        value={selectedFile}
                        onChange={(value) => setSelectedFile(value)}
                        placeholder={loadingFiles ? '加载中...' : '选择日志文件'}
                        searchPlaceholder="搜索文件名..."
                        emptyText="暂无日志文件"
                    />
                </div>

                <div className="w-[130px]">
                    <Label className="mb-1 block text-xs text-muted-foreground">级别</Label>
                    <Combobox
                        options={levelOptions}
                        value={logLevel}
                        onChange={(value) => setLogLevel(value)}
                        placeholder="全部"
                        searchPlaceholder="选择级别"
                        emptyText="无匹配项"
                    />
                </div>

                <div className="w-[220px]">
                    <Label className="mb-1 block text-xs text-muted-foreground">关键字</Label>
                    <Input value={keyword} onChange={(e) => setKeyword(e.target.value)} placeholder="搜索关键字" />
                </div>

                <div className="w-[150px]">
                    <Label className="mb-1 block text-xs text-muted-foreground">行数</Label>
                    <Combobox
                        options={lineOptions}
                        value={lines}
                        onChange={(value) => setLines(value || '500')}
                        placeholder="最近 500 行"
                        searchPlaceholder="选择行数"
                        emptyText="无匹配项"
                    />
                </div>

                <Button size="sm" className="cursor-pointer" onClick={fetchLogContent} disabled={loadingContent || !selectedFile}>
                    <RefreshCw size={14} /> {loadingContent ? '刷新中' : '刷新'}
                </Button>
            </div>

            <div className="h-[520px] overflow-auto rounded-lg border border-border/70 bg-[#1f2329] p-3 font-mono text-[13px] leading-6 text-slate-100">
                {loadingContent && <div className="text-slate-400">加载日志中...</div>}
                {!loadingContent && !selectedFile && <div className="text-slate-400">请选择日志文件</div>}
                {!loadingContent && selectedFile && parsedLines.length === 0 && <div className="text-slate-400">暂无日志内容</div>}
                {!loadingContent && parsedLines.length > 0 && parsedLines.map((line, index) => {
                    const cls = line.includes(' ERROR ')
                        ? 'text-red-300 bg-red-500/10'
                        : line.includes(' WARN ')
                            ? 'text-amber-300 bg-amber-500/10'
                            : line.includes(' DEBUG ')
                                ? 'text-slate-400'
                                : ''
                    return (
                        <div key={`${index}-${line.slice(0, 16)}`} className={`group flex px-1 ${cls}`}>
                            <span className="mr-3 w-12 shrink-0 select-none text-right text-slate-500">{index + 1}</span>
                            <span className="whitespace-pre-wrap break-all">{line}</span>
                        </div>
                    )
                })}
            </div>

            {!!selectedFile && (
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>文件: <span className="font-medium text-foreground/80">{selectedFile}</span></span>
                    <span>大小: <span className="font-medium text-foreground/80 tabular-nums">{formatSize(fileSize)}</span></span>
                    <span>显示行数: <span className="font-medium text-foreground/80 tabular-nums">{totalLines}</span></span>
                </div>
            )}
        </div>
    )
}
