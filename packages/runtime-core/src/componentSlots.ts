import { ShapeFlags } from '@my-mini-vue/shared'

export function initSlots(instance, children) {
  const { vnode } = instance
  // shapeFlag对应slot类型时才进行slot的处理
  if (vnode.shapeFlag & ShapeFlags.SLOT_CHILDREN) {
    // 传递的时instance的slots的引用值
    normalizeObjectSlots(children, instance.slots)
  }
}

function normalizeObjectSlots(children, slots) {
  for (const key in children) {
    const value = children[key]
    slots[key] = (props) => normalizeSlotValue(value(props))
  }
}

function normalizeSlotValue(value) {
  return Array.isArray(value) ? value : [value]
}
