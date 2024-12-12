import { hasOwn } from '../shared/index'

const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
  $slots: (i) => i.slots,
  $props: (i) => i.props,
}

export const componentPublicInstance = {
  get({ _: instance }, key) {
    const { setupState, props } = instance
    if (key in setupState) {
      return setupState[key]
    }

    // 判断键值在setup return的对象身上还是props对象身上
    if (hasOwn(setupState, key)) {
      return setupState[key]
    } else if (hasOwn(props, key)) {
      return props[key]
    }

    // 使用Map的结构映射 $el、$data、 $props...
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
}
