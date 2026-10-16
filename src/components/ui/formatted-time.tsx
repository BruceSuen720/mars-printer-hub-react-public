import React from 'react'
import { formatDate } from '@/utils/dateUtils'
import { cn } from '@/lib/utils'

export interface FormattedTimeProps extends React.HTMLAttributes<HTMLSpanElement> {
    time?: Date | string | number | null
    fallback?: React.ReactNode
}

export function FormattedTime({
    time,
    fallback = '-',
    className,
    ...props
}: FormattedTimeProps) {
    if (!time) {
        return <span className={cn('text-muted-foreground', className)} {...props}>{fallback}</span>
    }

    return (
        <span
            className={cn('font-mono tabular-nums tracking-tight', className)}
            {...props}
        >
            {formatDate(time as any)}
        </span>
    )
}
