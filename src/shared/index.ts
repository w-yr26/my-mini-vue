/**
 * 判断某个值是否为对象
 * @param value
 * @returns
 */
export const isObject = (value) => {
  return value !== null && typeof value === 'object'
}

export const isString = (value) => typeof value === 'string'

/**
 * 判断某个值是否发生改变
 * @param oldValue 旧值
 * @param newValue 新值
 * @returns true -> 发生改变；false -> 没有改变
 */
export const isChanged = (oldValue, newValue) => {
  return !Object.is(oldValue, newValue)
}

/**
 * 判断某个键是否在对象身上
 * @param val 对象
 * @param key 键值
 * @returns true/false
 */
export const hasOwn = (val, key) =>
  Object.prototype.hasOwnProperty.call(val, key)

/**
 * 处理形如add-foo的事件
 * @param str add-foo
 * @returns addFoo
 */
export const camelize = (str: string) => {
  return str.replace(/-(\w)/g, (_, c) => {
    return c ? c.toUpperCase() : ''
  })
}

/**
 * 事件首字母大写
 * @param str 事件名 event
 * @returns Event
 */
const capitalize = (str: string) => {
  return str[0].toUpperCase() + str.slice(1)
}

/**
 * on Event
 * @param str Eventname
 * @returns 返回 on + Eventname
 */
export const toHandlerKey = (str: string) => {
  return 'on' + capitalize(str)
}
