import { h, ref } from '../../lib/mini-vue.es.js'

const prevChildren = 'oldChildren'
const nextChildren = 'newChildren'

export const TextToText = {
  name: 'TextToText',
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
