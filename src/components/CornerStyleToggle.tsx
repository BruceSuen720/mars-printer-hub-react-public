import { Circle, Square } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useUserConfigStore } from '@/stores/useUserConfigStore'
import { normalizeCornerStyle } from '@/utils/appearancePreferences'

export default function CornerStyleToggle() {
    const style = useUserConfigStore((s) => normalizeCornerStyle(s.userConfig.cornerStyle))
    const saveUserConfig = useUserConfigStore((s) => s.saveUserConfig)
    const isSharp = style === 'sharp'
    const Icon = isSharp ? Circle : Square

    const handleToggle = () => {
        void saveUserConfig({ cornerStyle: isSharp ? 'rounded' : 'sharp' })
    }

    return (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 cursor-pointer"
            aria-label={isSharp ? '切换为圆角' : '切换为直角'}
            title={isSharp ? '切换为圆角' : '切换为直角'}
            onClick={handleToggle}
        >
            <Icon size={18} className="text-muted-foreground" />
        </Button>
    )
}
