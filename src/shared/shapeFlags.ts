export const enum ShapeFlags {
  ELEMENT = 1, // 0001 -> type为element
  STATEFUL_COMPONENT = 1 << 1, // 0010 -> type为component
  TEXT_CHILDREN = 1 << 2, // 0100 -> children为string
  ARRAY_CHILDREN = 1 << 3, // 1000 -> children为Array
}

// 设置当前vnode的类型
// 0001 | 0100 = 0101 -> type为element且children为string
// 0001 | 1000 = 1001 -> type为element且children为array
// 0010 | 0100 = 0110 -> type为component且children为string
// 0010 | 1000 = 1010 -> type为component且children为array

// 获取当前vnode的类型
// 0101 & 0001 = 0001 -> 可得当前vnode的type为element
// 0101 & 0100 = 0100 -> 可得当前vnode的children为string、
// ...
