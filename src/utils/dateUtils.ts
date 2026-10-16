/**
 * 日期格式化工具函数
 */

/**
 * 格式化日期为 yyyy-MM-dd HH:mm:ss 格式
 * @param dateString 日期字符串或日期对象
 * @returns 格式化后的日期字符串，如果输入为空则返回 '-'
 */
export const formatDate = (dateString?: string | Date): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) return '-'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

/**
 * 格式化日期为 yyyy-MM-dd 格式
 * @param dateString 日期字符串或日期对象
 * @returns 格式化后的日期字符串，如果输入为空则返回 '-'
 */
export const formatDateOnly = (dateString?: string | Date): string => {
  if (!dateString) return '-'
  
  const date = new Date(dateString)
  
  // 检查日期是否有效
  if (isNaN(date.getTime())) return '-'
  
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  
  return `${year}-${month}-${day}`
}