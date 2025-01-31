import { h, ref } from '../../dist/mini-vue.es.js'

const prevChildren = 'oldChildren'
const nextChildren = [h('div', {}, 'A'), h('div', {}, 'B')]

export const TextToArray = {
  name: 'TextToArray',
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
