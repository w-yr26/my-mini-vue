import { h, ref } from '../../lib/mini-vue.es.js'

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
const prevChildren = [
  h('div', { key: 'A' }, 'A'),
  h('div', { key: 'B' }, 'B'),
  h('div', { key: 'C' }, 'C'),
  h('div', { key: 'D' }, 'D'),
]
const nextChildren = [h('div', { key: 'A' }, 'A'), h('div', { key: 'B' }, 'B')]

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
