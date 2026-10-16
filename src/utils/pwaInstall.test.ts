import { describe, expect, it } from 'vitest'
import { isIosSafari, isStandaloneDisplay } from '@/utils/pwaInstall'

describe('PWA install helpers', () => {
  it('detects standalone display from either supported browser signal', () => {
    expect(isStandaloneDisplay(true, false)).toBe(true)
    expect(isStandaloneDisplay(false, true)).toBe(true)
    expect(isStandaloneDisplay(false, false)).toBe(false)
  })

  it('detects iOS Safari and excludes other iOS browsers', () => {
    const safariUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1'
    const chromeUa = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1'

    expect(isIosSafari(safariUa)).toBe(true)
    expect(isIosSafari(chromeUa)).toBe(false)
  })

  it('detects iPadOS when it reports a desktop platform', () => {
    const desktopSafariUa = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/18.0 Safari/605.1.15'

    expect(isIosSafari(desktopSafariUa, 'MacIntel', 5)).toBe(true)
    expect(isIosSafari(desktopSafariUa, 'MacIntel', 0)).toBe(false)
  })
})
