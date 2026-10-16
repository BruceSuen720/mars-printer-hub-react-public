type HmsSeverityType = 'fatal' | 'serious' | 'common' | 'info' | 'unknown'

const HMS_SEVERITY_META: Record<HmsSeverityType, {
    label: string
    badgeClassName: string
    panelClassName: string
    iconClassName: string
}> = {
    fatal: {
        label: '致命错误',
        badgeClassName: 'border-rose-600/35 bg-rose-600/12 text-rose-700 dark:text-rose-300',
        panelClassName: 'border-rose-600/35 bg-rose-600/10',
        iconClassName: 'text-rose-600 dark:text-rose-400',
    },
    serious: {
        label: '严重错误',
        badgeClassName: 'border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300',
        panelClassName: 'border-red-500/30 bg-red-500/10',
        iconClassName: 'text-red-600 dark:text-red-400',
    },
    common: {
        label: '普通错误',
        badgeClassName: 'border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300',
        panelClassName: 'border-orange-500/30 bg-orange-500/10',
        iconClassName: 'text-orange-600 dark:text-orange-400',
    },
    info: {
        label: '提示信息',
        badgeClassName: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
        panelClassName: 'border-sky-500/30 bg-sky-500/10',
        iconClassName: 'text-sky-600 dark:text-sky-400',
    },
    unknown: {
        label: '未知',
        badgeClassName: 'border-border bg-muted text-muted-foreground',
        panelClassName: 'border-border bg-muted/50',
        iconClassName: 'text-muted-foreground',
    },
}

const HMS_SEVERITY_RANK: Record<HmsSeverityType, number> = {
    fatal: 0,
    serious: 1,
    common: 2,
    info: 3,
    unknown: 4,
}

const getHmsSeverityType = (severity?: string): HmsSeverityType => {
    const normalized = severity?.trim().toLowerCase()
    if (normalized === 'fatal') return 'fatal'
    if (normalized === 'serious') return 'serious'
    if (normalized === 'common') return 'common'
    if (normalized === 'info' || normalized === 'notice') return 'info'
    return 'unknown'
}

export const getHmsDisplayMessage = (error: API.HmsErrorVO) => (
    error.message?.trim() || error.code?.trim() || '未知 HMS 异常'
)

export const sortHmsErrors = (errors: API.HmsErrorVO[]) => (
    [...errors].sort((left, right) => {
        const rankDiff = HMS_SEVERITY_RANK[getHmsSeverityType(left.severity)]
            - HMS_SEVERITY_RANK[getHmsSeverityType(right.severity)]
        if (rankDiff !== 0) return rankDiff
        return getHmsDisplayMessage(left).localeCompare(getHmsDisplayMessage(right), 'zh-CN')
    })
)

export const getHmsSeverityMeta = (severity?: string) => HMS_SEVERITY_META[getHmsSeverityType(severity)]
