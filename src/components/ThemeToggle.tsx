import { useEffect, useMemo, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useDeviceStore } from '@/stores/useDeviceStore'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { type ThemeMode } from '@/utils/appearancePreferences'

const themeOptions: { value: ThemeMode; label: string; desc: string; icon: typeof Sun }[] = [
    { value: 'light', label: '浅色模式', desc: '始终使用浅色主题', icon: Sun },
    { value: 'dark', label: '深色模式', desc: '始终使用深色主题', icon: Moon },
    { value: 'system', label: '自动模式', desc: '跟随系统主题设置', icon: Monitor },
]

export default function ThemeToggle() {
    const isMobile = useDeviceStore((s) => s.isMobile)
    const desktopTheme = useUserConfigStore((s) => s.userConfig.desktopTheme)
    const mobileTheme = useUserConfigStore((s) => s.userConfig.mobileTheme)
    const saveUserConfig = useUserConfigStore((s) => s.saveUserConfig)
    const [systemDark, setSystemDark] = useState<boolean>(() => {
        if (typeof window === 'undefined') return false
        return window.matchMedia('(prefers-color-scheme: dark)').matches
    })

    const currentMode = (isMobile ? mobileTheme : desktopTheme) ?? 'system'
    const currentOption = themeOptions.find((o) => o.value === currentMode) || themeOptions[0]
    const CurrentIcon = currentOption.icon
    const systemLabel = useMemo(() => (systemDark ? '深色' : '浅色'), [systemDark])

    useEffect(() => {
        if (typeof window === 'undefined') return
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const handler = (event: MediaQueryListEvent) => setSystemDark(event.matches)
        media.addEventListener('change', handler)
        return () => media.removeEventListener('change', handler)
    }, [])

    const handleModeChange = (mode: ThemeMode) => {
        void saveUserConfig(isMobile ? { mobileTheme: mode } : { desktopTheme: mode })
    }

    return (
        <DropdownMenu modal={false}>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 cursor-pointer"
                    aria-label={isMobile ? '移动端主题切换' : '桌面端主题切换'}
                >
                    <CurrentIcon size={18} className="text-muted-foreground" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[196px] rounded-2xl p-2">
                {themeOptions.map((option) => {
                    const Icon = option.icon
                    const active = currentMode === option.value
                    return (
                        <DropdownMenuItem
                            key={option.value}
                            onSelect={() => handleModeChange(option.value)}
                            className={`cursor-pointer rounded-xl px-3 py-2 focus:bg-muted/70 ${
                                active ? 'bg-sky-50 text-foreground dark:bg-sky-950/30' : ''
                            }`}
                        >
                            <div className="mr-2 flex h-6 w-6 items-center justify-center">
                                <Icon size={16} className="text-muted-foreground" />
                            </div>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-semibold">{option.label}</p>
                                <p className="truncate text-xs text-muted-foreground">{option.desc}</p>
                            </div>
                        </DropdownMenuItem>
                    )
                })}
                {currentMode === 'system' && (
                    <div className="mt-2 rounded-xl bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                        当前跟随系统：{systemLabel}
                    </div>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
