export const QUOTE_SETTINGS_STORAGE_KEY = 'MARS_QUOTE_SETTINGS'

export type QuoteSettings = {
    power: number
    electricityPrice: number
    laborHourlyRate: number
}

export const defaultQuoteSettings: QuoteSettings = {
    power: 300,
    electricityPrice: 0.5,
    laborHourlyRate: 0,
}

const isFiniteNumber = (value: unknown): value is number =>
    typeof value === 'number' && Number.isFinite(value)

export const loadQuoteSettings = (): QuoteSettings => {
    if (typeof window === 'undefined') return defaultQuoteSettings
    const raw = window.localStorage.getItem(QUOTE_SETTINGS_STORAGE_KEY)
    if (!raw) return defaultQuoteSettings

    try {
        const parsed = JSON.parse(raw) as Record<string, unknown>
        const power = isFiniteNumber(parsed.power)
            ? parsed.power
            : (isFiniteNumber(parsed.powerConsumption) ? parsed.powerConsumption : defaultQuoteSettings.power)
        const electricityPrice = isFiniteNumber(parsed.electricityPrice)
            ? parsed.electricityPrice
            : (isFiniteNumber(parsed.electricityFee) ? parsed.electricityFee : defaultQuoteSettings.electricityPrice)
        const laborHourlyRate = isFiniteNumber(parsed.laborHourlyRate)
            ? parsed.laborHourlyRate
            : defaultQuoteSettings.laborHourlyRate

        return { power, electricityPrice, laborHourlyRate }
    } catch {
        return defaultQuoteSettings
    }
}

export const saveQuoteSettings = (settings: QuoteSettings) => {
    if (typeof window === 'undefined') return
    window.localStorage.setItem(QUOTE_SETTINGS_STORAGE_KEY, JSON.stringify(settings))
}

