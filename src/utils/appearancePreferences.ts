export type ThemeMode = 'light' | 'dark' | 'system'
export type DesktopLayoutMode = 'centered' | 'fullwidth'
export type CornerStyle = 'rounded' | 'sharp'
export type AppFontFamily = 'system' | 'system-mono' | 'jetbrains-mono'

let backgroundApplyVersion = 0

const LEGACY_THEME_STORAGE_KEY = 'mars-theme-mode'
const LEGACY_LAYOUT_STORAGE_KEY = 'mars-layout-mode'
const DESKTOP_THEME_STORAGE_KEY = 'mars-desktop-theme-mode'
const MOBILE_THEME_STORAGE_KEY = 'mars-mobile-theme-mode'
const DESKTOP_LAYOUT_STORAGE_KEY = 'mars-desktop-layout-mode'
const CORNER_STYLE_STORAGE_KEY = 'mars-corner-style'
const WEB_BACKGROUND_URL_STORAGE_KEY = 'mars-web-background-url'
const MOBILE_BACKGROUND_URL_STORAGE_KEY = 'mars-mobile-background-url'
const APP_FONT_FAMILY_STORAGE_KEY = 'mars-app-font-family'

export const DEFAULT_DESKTOP_THEME: ThemeMode = 'system'
export const DEFAULT_MOBILE_THEME: ThemeMode = 'system'
export const DEFAULT_DESKTOP_LAYOUT: DesktopLayoutMode = 'centered'
export const DEFAULT_CORNER_STYLE: CornerStyle = 'rounded'
export const DEFAULT_APP_FONT_FAMILY: AppFontFamily = 'system'

export function normalizeThemeMode(value?: string | null): ThemeMode {
    return value === 'light' || value === 'dark' || value === 'system' ? value : DEFAULT_DESKTOP_THEME
}

export function normalizeDesktopLayoutMode(value?: string | null): DesktopLayoutMode {
    return value === 'centered' || value === 'fullwidth' ? value : DEFAULT_DESKTOP_LAYOUT
}

export function normalizeCornerStyle(value?: string | null): CornerStyle {
    return value === 'rounded' || value === 'sharp' ? value : DEFAULT_CORNER_STYLE
}

export function normalizeAppFontFamily(value?: string | null): AppFontFamily {
    return value === 'system' || value === 'system-mono' || value === 'jetbrains-mono'
        ? value
        : DEFAULT_APP_FONT_FAMILY
}

export function normalizeBackgroundUrl(value?: string | null): string {
    return value?.trim() ?? ''
}

function getStoredValue(key: string) {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(key)
}

export function getStoredDesktopTheme(): ThemeMode {
    const stored = getStoredValue(DESKTOP_THEME_STORAGE_KEY) ?? getStoredValue(LEGACY_THEME_STORAGE_KEY)
    return normalizeThemeMode(stored)
}

export function getStoredMobileTheme(): ThemeMode {
    return normalizeThemeMode(getStoredValue(MOBILE_THEME_STORAGE_KEY))
}

export function getStoredDesktopLayout(): DesktopLayoutMode {
    const stored = getStoredValue(DESKTOP_LAYOUT_STORAGE_KEY) ?? getStoredValue(LEGACY_LAYOUT_STORAGE_KEY)
    return normalizeDesktopLayoutMode(stored)
}

export function getStoredCornerStyle(): CornerStyle {
    return normalizeCornerStyle(getStoredValue(CORNER_STYLE_STORAGE_KEY))
}

export function getStoredAppFontFamily(): AppFontFamily {
    return normalizeAppFontFamily(getStoredValue(APP_FONT_FAMILY_STORAGE_KEY))
}

export function getStoredWebBackgroundUrl(): string {
    return normalizeBackgroundUrl(getStoredValue(WEB_BACKGROUND_URL_STORAGE_KEY))
}

export function getStoredMobileBackgroundUrl(): string {
    return normalizeBackgroundUrl(getStoredValue(MOBILE_BACKGROUND_URL_STORAGE_KEY))
}

export function persistAppearancePreferences(config: {
    desktopTheme?: string | null
    mobileTheme?: string | null
    desktopLayout?: string | null
    cornerStyle?: string | null
    font?: string | null
    webBackgroundUrl?: string | null
    mobileBackgroundUrl?: string | null
}) {
    if (typeof window === 'undefined') return

    localStorage.setItem(DESKTOP_THEME_STORAGE_KEY, normalizeThemeMode(config.desktopTheme))
    localStorage.setItem(MOBILE_THEME_STORAGE_KEY, normalizeThemeMode(config.mobileTheme))
    localStorage.setItem(DESKTOP_LAYOUT_STORAGE_KEY, normalizeDesktopLayoutMode(config.desktopLayout))
    localStorage.setItem(CORNER_STYLE_STORAGE_KEY, normalizeCornerStyle(config.cornerStyle))
    localStorage.setItem(APP_FONT_FAMILY_STORAGE_KEY, normalizeAppFontFamily(config.font))
    localStorage.setItem(WEB_BACKGROUND_URL_STORAGE_KEY, normalizeBackgroundUrl(config.webBackgroundUrl))
    localStorage.setItem(MOBILE_BACKGROUND_URL_STORAGE_KEY, normalizeBackgroundUrl(config.mobileBackgroundUrl))
}

function resolveSystemTheme() {
    if (typeof window === 'undefined') return 'light'
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export function resolveThemeMode(mode: ThemeMode) {
    return mode === 'system' ? resolveSystemTheme() : mode
}

export function applyTheme(mode: ThemeMode) {
    if (typeof document === 'undefined') return
    const resolvedMode = resolveThemeMode(mode)
    document.documentElement.classList.toggle('dark', resolvedMode === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute(
        'content',
        resolvedMode === 'dark' ? '#171717' : '#f8fafc',
    )
}

export function applyCornerStyle(style: CornerStyle) {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.cornerStyle = normalizeCornerStyle(style)
}

export function applyAppFontFamily(fontFamily: AppFontFamily) {
    if (typeof document === 'undefined') return
    document.documentElement.dataset.appFontFamily = normalizeAppFontFamily(fontFamily)
}

export function applyBackgroundImage(url?: string | null) {
    if (typeof document === 'undefined') return

    const normalizedUrl = normalizeBackgroundUrl(url)
    if (!normalizedUrl) {
        document.documentElement.removeAttribute('data-app-background')
        document.documentElement.style.removeProperty('--app-background-image')
        return
    }

    try {
        new URL(normalizedUrl)
    } catch {
        document.documentElement.removeAttribute('data-app-background')
        document.documentElement.style.removeProperty('--app-background-image')
        return
    }

    const currentVersion = ++backgroundApplyVersion
    const image = new Image()

    image.onload = () => {
        if (currentVersion !== backgroundApplyVersion) return
        document.documentElement.dataset.appBackground = 'custom'
        document.documentElement.style.setProperty(
            '--app-background-image',
            `url("${normalizedUrl.replace(/"/g, '\\"')}")`,
        )
    }

    image.onerror = () => {
        if (currentVersion !== backgroundApplyVersion) return
        document.documentElement.removeAttribute('data-app-background')
        document.documentElement.style.removeProperty('--app-background-image')
    }

    image.src = normalizedUrl
}
