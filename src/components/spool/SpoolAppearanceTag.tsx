import React, { memo, useEffect } from 'react'
import { useRemoteSpoolConfig } from '@/hooks/useRemoteConfig'

interface SpoolAppearanceTagProps {
    appearanceId?: number | string | null
    className?: string
}

export const SpoolAppearanceTag = memo(({ appearanceId, className = '' }: SpoolAppearanceTagProps) => {
    const { spoolConfig, ensureSpoolConfigLoaded } = useRemoteSpoolConfig()

    useEffect(() => {
        if (!spoolConfig) {
            ensureSpoolConfigLoaded()
        }
    }, [spoolConfig, ensureSpoolConfigLoaded])

    const tagData = spoolConfig?.appearances?.find((a) =>
        appearanceId != null && String(a.id) === String(appearanceId)
    )

    if (tagData) {
        return (
            <span
                className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-xs transition-all ${className}`}
                style={tagData.style as React.CSSProperties}
            >
                {tagData.label}
            </span>
        )
    }

    return <span className="text-muted-foreground">-</span>
})

SpoolAppearanceTag.displayName = 'SpoolAppearanceTag'
