const toBoolean = (value: unknown) => {
    if (typeof value === 'boolean') return value
    if (typeof value !== 'string') return false
    const normalized = value.trim().toLowerCase()
    return normalized === '1' || normalized === 'true' || normalized === 'yes' || normalized === 'on'
}

const getRuntimeConfigValue = (key: string): unknown => {
    if (typeof window === 'undefined') return undefined
    return window.__APP_CONFIG__?.[key]
}

const getBuildtimeEnvValue = (key: string): unknown => {
    return import.meta.env[`VITE_${key}`]
}

export const getFeatureFlag = (key: string, defaultValue = false) => {
    const runtimeValue = getRuntimeConfigValue(key)
    if (runtimeValue !== undefined && runtimeValue !== null) return toBoolean(runtimeValue)

    const buildtimeValue = getBuildtimeEnvValue(key)
    if (buildtimeValue !== undefined && buildtimeValue !== null) return toBoolean(buildtimeValue)

    return defaultValue
}

export const isDeviceOverviewEnabled = getFeatureFlag('ENABLE_DEVICE_OVERVIEW', false)
export const isUserManageEnabled = getFeatureFlag('ENABLE_USER_MANAGE', false)
export const isDepreciationEnabled = getFeatureFlag('ENABLE_DEPRECIATION', false)
export const isCustomBackgroundEnabled = getFeatureFlag('ENABLE_CUSTOM_BACKGROUND', true)
export const isHomeAssistantEnabled = getFeatureFlag('ENABLE_HOME_ASSISTANT', false)
export const isPasskeyLoginEnabled = getFeatureFlag('ENABLE_PASSKEY_LOGIN', false)
export const isOrderQuantityAdjustEnabled = getFeatureFlag('ENABLE_ORDER_QUANTITY_ADJUST', false)
