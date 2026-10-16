export const formatColor = (color?: string) => {
    if (!color) return undefined
    if (color.length === 8 && /^[0-9A-Fa-f]{8}$/.test(color)) return `#${color.substring(0, 6)}`
    if (color.length === 6 && /^[0-9A-Fa-f]{6}$/.test(color)) return `#${color}`
    if (color.startsWith('#')) return color
    return color
}

export const getSlotDisplayName = (amsNo?: number, slotNo?: number) => {
    if (slotNo === undefined) return '-'
    if (amsNo === 254 || amsNo === 255) return '外挂'
    if (amsNo !== undefined && amsNo >= 0 && amsNo <= 3) return `${String.fromCharCode(65 + amsNo)}${slotNo + 1}`
    if (amsNo !== undefined && amsNo >= 128 && amsNo <= 136) return `${String.fromCharCode(65 + amsNo - 128)}${slotNo + 1}`
    return `S${slotNo + 1}`
}

export const getHexTagStyle = (color?: string) => {
    if (!color) return {}
    const hex = formatColor(color)
    if (!hex || !/^#[0-9A-Fa-f]{6}$/.test(hex)) return {}
    const rgb = parseInt(hex.slice(1), 16)
    const red = (rgb >> 16) & 255
    const green = (rgb >> 8) & 255
    const blue = rgb & 255
    const isLight = (red * 299 + green * 587 + blue * 114) / 1000 > 128
    return isLight ? { color: '#000', border: '1px solid #d9d9d9' } : { color: '#fff' }
}
