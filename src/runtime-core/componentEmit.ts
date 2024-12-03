export const emit = (instance, event, ...args) => {
  console.log('emit exe', event)
  // 拿到的是形如add、click、add-foo的事件，需要将其处理成 on + Event 的形式
  const { props } = instance

  // 处理形如add-foo的事件
  const camelize = (str: string) => {
    return str.replace(/-(\w)/g, (_, c) => {
      return c ? c.toUpperCase() : ''
    })
  }

  // 事件首字母大写
  const capitalize = (str: string) => {
    return str[0].toUpperCase() + str.slice(1)
  }

  // 返回 on + Eventname
  const toHandlerKey = (str: string) => {
    return 'on' + capitalize(str)
  }

  const handlerName = toHandlerKey(camelize(event))
  const handler = props[handlerName]
  handler && handler(...args)
}
