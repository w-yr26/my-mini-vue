import { createVNode, Fragment } from '../src/vnode'

export function renderSlots(slots, name, props?) {
  const slot = slots[name]
  if (slot && typeof slot === 'function') {
    return createVNode(Fragment, {}, slot(props))
  }
}
