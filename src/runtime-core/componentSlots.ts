export function initSlots(instance, children) {
  // 将组件实例的vnode的children挂载到instance.slots身上，方便后续访问
  instance.slots = Array.isArray(children) ? children : [children]
}