import { useEffect, useState } from 'react'
import { Download, Plus, Share } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  isIosSafari,
  isStandaloneDisplay,
  PWA_INSTALL_DISMISSED_STORAGE_KEY,
} from '@/utils/pwaInstall'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

type InstallMethod = 'native' | 'ios' | null

function hasDismissedInstallPrompt() {
  if (typeof window === 'undefined') return false

  try {
    return localStorage.getItem(PWA_INSTALL_DISMISSED_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

function getInitialInstallMethod(): InstallMethod {
  if (typeof window === 'undefined' || hasDismissedInstallPrompt()) return null

  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
  const isInstalled = isStandaloneDisplay(
    window.matchMedia('(display-mode: standalone)').matches,
    navigatorWithStandalone.standalone,
  )

  if (isInstalled) return null

  return isIosSafari(navigator.userAgent, navigator.platform, navigator.maxTouchPoints)
    ? 'ios'
    : null
}

function PwaInstallPrompt() {
  const [installEvent, setInstallEvent] = useState<BeforeInstallPromptEvent | null>(null)
  const [installMethod, setInstallMethod] = useState<InstallMethod>(getInitialInstallMethod)
  const [isIosGuideOpen, setIsIosGuideOpen] = useState(false)
  const [isPrompting, setIsPrompting] = useState(false)

  useEffect(() => {
    const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean }
    const isInstalled = isStandaloneDisplay(
      window.matchMedia('(display-mode: standalone)').matches,
      navigatorWithStandalone.standalone,
    )

    if (isInstalled || hasDismissedInstallPrompt()) return

    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault()
      setInstallEvent(event as BeforeInstallPromptEvent)
      setInstallMethod('native')
    }

    const handleAppInstalled = () => {
      setInstallEvent(null)
      setInstallMethod(null)
      setIsIosGuideOpen(false)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  const handleInstall = async () => {
    if (installMethod === 'ios') {
      setIsIosGuideOpen(true)
      return
    }

    if (!installEvent) return

    setIsPrompting(true)
    try {
      await installEvent.prompt()
      await installEvent.userChoice
    } finally {
      setIsPrompting(false)
      setInstallEvent(null)
      setInstallMethod(null)
    }
  }

  const handleNeverShowAgain = () => {
    try {
      localStorage.setItem(PWA_INSTALL_DISMISSED_STORAGE_KEY, 'true')
    } catch {
      // The prompt still stays hidden for this page load when storage is unavailable.
    }
    setInstallEvent(null)
    setInstallMethod(null)
    setIsIosGuideOpen(false)
  }

  if (!installMethod) return null

  return (
    <>
      <aside
        aria-label="安装 Mars Printer Hub"
        className="fixed bottom-[calc(6.75rem+env(safe-area-inset-bottom))] left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-2xl -translate-x-1/2 animate-in flex-col gap-3 rounded-lg border bg-background p-3 shadow-md duration-200 fade-in slide-in-from-bottom-2 motion-reduce:animate-none sm:flex-row sm:items-center sm:p-4 md:bottom-auto md:top-20 md:slide-in-from-top-2"
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Download aria-hidden="true" className="size-4" />
          </span>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground">安装 Mars Printer Hub</p>
            <p className="mt-0.5 text-xs leading-5 text-muted-foreground sm:text-sm">
              添加到桌面，像应用一样快速打开
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center justify-end gap-1.5">
          <Button type="button" variant="ghost" size="sm" onClick={handleNeverShowAgain}>
            不再提示
          </Button>
          <Button type="button" size="sm" onClick={() => void handleInstall()} disabled={isPrompting}>
            {isPrompting ? '正在打开...' : installMethod === 'ios' ? '查看安装方法' : '安装应用'}
          </Button>
        </div>
      </aside>

      <Dialog open={isIosGuideOpen} onOpenChange={setIsIosGuideOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加到主屏幕</DialogTitle>
            <DialogDescription>
              Safari 暂不支持直接唤起安装，请按下面两步操作。
            </DialogDescription>
          </DialogHeader>
          <ol className="space-y-3 text-sm text-foreground">
            <li className="flex items-center gap-3 rounded-md bg-muted p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background shadow-xs">
                <Share aria-hidden="true" className="size-4" />
              </span>
              点击 Safari 工具栏中的“分享”按钮
            </li>
            <li className="flex items-center gap-3 rounded-md bg-muted p-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-background shadow-xs">
                <Plus aria-hidden="true" className="size-4" />
              </span>
              选择“添加到主屏幕”，然后确认添加
            </li>
          </ol>
        </DialogContent>
      </Dialog>
    </>
  )
}

export default PwaInstallPrompt
