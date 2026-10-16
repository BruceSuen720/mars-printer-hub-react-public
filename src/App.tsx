import { RouterProvider } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import {
  applyAppFontFamily,
  applyBackgroundImage,
  applyCornerStyle,
  applyTheme,
  normalizeAppFontFamily,
  normalizeBackgroundUrl,
  normalizeCornerStyle,
  normalizeThemeMode,
} from '@/utils/appearancePreferences'
import { isCustomBackgroundEnabled } from '@/config/featureFlags'
import router from '@/router'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import './index.css'

function App() {
  const init = useDeviceStore((s) => s.init)
  const cleanup = useDeviceStore((s) => s.cleanup)
  const isMobile = useDeviceStore((s) => s.isMobile)
  const desktopTheme = useUserConfigStore((s) => s.userConfig.desktopTheme)
  const mobileTheme = useUserConfigStore((s) => s.userConfig.mobileTheme)
  const cornerStyle = useUserConfigStore((s) => s.userConfig.cornerStyle)
  const font = useUserConfigStore((s) => s.userConfig.font)
  const webBackgroundUrl = useUserConfigStore((s) => s.userConfig.webBackgroundUrl)
  const mobileBackgroundUrl = useUserConfigStore((s) => s.userConfig.mobileBackgroundUrl)

  useEffect(() => {
    init()
    return () => cleanup()
  }, [init, cleanup])

  useEffect(() => {
    const syncTheme = () => applyTheme(normalizeThemeMode(isMobile ? mobileTheme : desktopTheme))
    syncTheme()

    if (typeof window === 'undefined') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    media.addEventListener('change', syncTheme)
    return () => media.removeEventListener('change', syncTheme)
  }, [desktopTheme, isMobile, mobileTheme])

  useEffect(() => {
    applyCornerStyle(normalizeCornerStyle(cornerStyle))
  }, [cornerStyle])

  useEffect(() => {
    applyAppFontFamily(normalizeAppFontFamily(font))
  }, [font])

  useEffect(() => {
    applyBackgroundImage(
      isCustomBackgroundEnabled
        ? normalizeBackgroundUrl(isMobile ? mobileBackgroundUrl : webBackgroundUrl)
        : '',
    )
  }, [isMobile, mobileBackgroundUrl, webBackgroundUrl])

  return (
    <TooltipProvider>
      <Suspense
        fallback={
          <div className="flex h-screen w-full items-center justify-center">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        }
      >
        <RouterProvider router={router} />
      </Suspense>
      <PwaInstallPrompt />
      <Toaster position="top-center" />
    </TooltipProvider>
  )
}

export default App
