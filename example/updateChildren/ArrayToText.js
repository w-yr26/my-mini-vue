import { h, ref } from '../../lib/mini-vue.es.js'

const prevChildren = [h('div', {}, 'A'), h('div', {}, 'B')]
const nextChildren = 'new Children'

export const ArrayToText = {
  name: 'ArrayToText',
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
