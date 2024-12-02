const publicPropertiesMap = {
  $el: (i) => i.vnode.el,
}

export const componentPublicInstance = {
  get({ _: instance }, key) {
    const { setupState } = instance
    if (key in setupState) {
      return setupState[key]
    }
    // if (key === '$el') {
    //   return instance.vnode.el
    // }

    // 使用Map的结构映射 $el、$data、 $props...
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
  },
}
