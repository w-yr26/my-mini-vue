import { getCurrentInstance } from './component'

export function provide(key, value) {
  // 存 -> 在组件实例身上存一个provides
  const currentInstance: any = getCurrentInstance()
  if (currentInstance) {
    let { provides } = currentInstance

    const parentProvides = currentInstance.parent
      ? currentInstance.parent.provides
      : {}
    if (provides === parentProvides) {
      provides = currentInstance.provides = Object.create(parentProvides)
    }
    provides[key] = value
  }
}

export function inject(key, defaultVal?) {
  // 取 -> 组件实例身上的parent字段存着它的父组件实例，应该从它的父组件实例身上的provides取值
  const currentInstance: any = getCurrentInstance()

  if (currentInstance) {
    const parentProvides = currentInstance.parent.provides
    if (key in parentProvides) {
      return parentProvides[key]
    } else if (defaultVal) {
      if (typeof defaultVal === 'function') return defaultVal()
      return defaultVal
    }
  }
}
