// 判断是否为宽字符（中日韩 + emoji）
const isWideChar = (ch: string) =>
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Extended_Pictographic}]/u.test(
    ch,
  )

/**
 * 获取字符串的显示宽度（中日韩和 emoji 计 2，其他计 1）
 */
export const getDisplayWidth = (str = ''): number =>
  [...str].reduce((sum, ch) => sum + (isWideChar(ch) ? 2 : 1), 0)

/**
 * 按显示宽度截断字符串，超过则加 "..."
 */
export const truncateByDisplayWidth = (title?: string, maxWidth = 16): string => {
  if (!title) return '-'
  const chars = [...title]
  let width = 0
  let i = 0
  for (; i < chars.length; i++) {
    width += isWideChar(chars[i]) ? 2 : 1
    if (width > maxWidth) break
  }
  return i < chars.length ? chars.slice(0, i).join('') + '...' : title
}

/**
 * 判断是否需要截断
 */
export const shouldTruncate = (title?: string, maxWidth = 16): boolean => {
  return title ? getDisplayWidth(title) > maxWidth : false
}
