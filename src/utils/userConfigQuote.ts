import { getCurrentUserConfig } from '@/api/userConfig'
import { loadQuoteSettings, type QuoteSettings } from '@/utils/quoteSettings'

export const resolveQuoteSettings = async (): Promise<QuoteSettings> => {
    const cached = loadQuoteSettings()
    try {
        const res = await getCurrentUserConfig()
        const data = res.data?.data
        return {
            power: data?.powerWatt ?? cached.power,
            electricityPrice: data?.electricityPricePerKwh ?? cached.electricityPrice,
            laborHourlyRate: data?.laborCostPerHour ?? cached.laborHourlyRate,
        }
    } catch {
        return cached
    }
}
