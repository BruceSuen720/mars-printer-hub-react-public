import { Maximize2, Minimize2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserConfigStore } from '@/stores/useUserConfigStore'

export default function LayoutToggle() {
    const desktopLayout = useUserConfigStore((s) => s.userConfig.desktopLayout)
    const saveUserConfig = useUserConfigStore((s) => s.saveUserConfig)
    const isFullWidth = desktopLayout === 'fullwidth'

    const handleToggle = () => {
        void saveUserConfig({ desktopLayout: isFullWidth ? 'centered' : 'fullwidth' })
    }

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            aria-label="切换布局"
            onClick={handleToggle}
        >
            {isFullWidth ? (
                <Minimize2 size={18} className="text-muted-foreground" />
            ) : (
                <Maximize2 size={18} className="text-muted-foreground" />
            )}
        </Button>
    )
}
