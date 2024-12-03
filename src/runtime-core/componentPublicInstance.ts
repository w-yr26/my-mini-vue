const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
}

export const componentPublicInstance = {
  get({ _: instance }, key) {
    const { setupState, props } = instance
    if (key in setupState) {
      return setupState[key]
    }

    // 判断对象身上是否存在某个属性
    const hasOwn = (val, key) => Object.prototype.hasOwnProperty.call(val, key)

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
