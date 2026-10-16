export const PWA_INSTALL_DISMISSED_STORAGE_KEY = 'mars-printer-hub:pwa-install-dismissed'

export function isStandaloneDisplay(displayModeStandalone: boolean, navigatorStandalone = false) {
  return displayModeStandalone || navigatorStandalone
}

export function isIosSafari(userAgent: string, platform = '', maxTouchPoints = 0) {
  const isIosDevice = /iphone|ipad|ipod/i.test(userAgent)
    || (platform === 'MacIntel' && maxTouchPoints > 1)
  const isSafari = /safari/i.test(userAgent) && !/crios|fxios|edgios|opios/i.test(userAgent)

  return isIosDevice && isSafari
}
