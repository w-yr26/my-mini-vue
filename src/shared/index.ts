/**
 * 判断某个值是否为对象
 * @param value 
 * @returns 
 */
export const isObject = (value) => {
  return value !== null && typeof value === 'object'
}

/**
 * 判断某个值是否发生改变
 * @param oldValue 旧值
 * @param newValue 新值
 * @returns true -> 发生改变；false -> 没有改变
 */
export const isChanged = (oldValue, newValue) => {
  return !Object.is(oldValue, newValue)
}