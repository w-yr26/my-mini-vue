import { h, ref } from '../../dist/mini-vue.es.js'

// 1. 左边对比
// (a b) c
// (a b) c d
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
// ]

// 2. 右边对比
// a (b c)
// d e (b c)
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
// ]
// const nextChildren = [
//   h('div', { key: 'D' }, 'D'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
// ]

// 3. 新的比老的长 -> 创建新的
// 右侧创建
// (a b)
// (a b) c
// const prevChildren = [h('div', { key: 'A' }, 'A'), h('div', { key: 'B' }, 'B')]
// const nextChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
// ]

// 左侧创建
// (a b)
// c (a b)
// const prevChildren = [h('div', { key: 'A' }, 'A'), h('div', { key: 'B' }, 'B')]
// const nextChildren = [
//   h('div', { key: 'D' }, '<D></D>'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
// ]

// 4. 老的比新的长 -> 删除
// (a b c d)
// (a b)
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
// ]
// const nextChildren = [h('div', { key: 'A' }, 'A'), h('div', { key: 'B' }, 'B')]

// 5. 中间部分乱序比较
//    5.1 移除不存在于新的children中的旧的vnode
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C', id: 'c-msg' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]
// const nextChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'C', id: 'c-new-msg' }, 'C'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]

//    5.1.1 中间部分，老的比新的多，且老的还出现在新的vnodes都在新的中被找到，多出来的部分直接干掉(优化删除逻辑)
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C', id: 'c-msg' }, 'C'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'D' }, 'D'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]
// const nextChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'C', id: 'c-new-msg' }, 'C'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]

//    5.2 中间部分 新的老的里面都存在 -> 更新渲染位置
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]
// const nextChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]

//    5.3 中间部分 节点在老的里面不存在，在新的里面存在 -> 创建新的
// const prevChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]
// const nextChildren = [
//   h('div', { key: 'A' }, 'A'),
//   h('div', { key: 'B' }, 'B'),
//   h('div', { key: 'E' }, 'E'),
//   h('div', { key: 'C' }, 'C'),
//   h('div', { key: 'D' }, 'D'),
//   h('div', { key: 'F' }, 'F'),
//   h('div', { key: 'G' }, 'G'),
// ]

// 综合例子
const prevChildren = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'D' }, 'D'),
  h('div', { key: 'E' }, 'E'),
  h('div', { key: 'Z' }, 'Z'),
  h('div', { key: 'F' }, 'F'),
  h('div', { key: 'G' }, 'G'),
]
const nextChildren = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'D' }, 'D'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'Y' }, 'Y'),
  h('div', { key: 'E' }, 'E'),
  h('div', { key: 'F' }, 'F'),
  h('div', { key: 'G' }, 'G'),
]

export const ArrayToArray = {
  name: 'ArrayToArray',
  setup() {
    const change = ref(false)
    window.change = change
    return {
      change,
    }
  },
  render() {
    return this.change ? h('div', {}, nextChildren) : h('div', {}, prevChildren)
  },
}
