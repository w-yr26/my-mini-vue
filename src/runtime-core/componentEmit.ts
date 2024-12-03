import { camelize, toHandlerKey } from "../shared/index"

export const emit = (instance, event, ...args) => {
  console.log('emit exe', event)
  // 拿到的是形如add、click、add-foo的事件，需要将其处理成 on + Event 的形式
  const { props } = instance
  // 处理事件名
  const handlerName = toHandlerKey(camelize(event))
  const handler = props[handlerName]
  handler && handler(...args)
}
