import { h } from '../../lib/mini-vue.es.js'
export const App = {
  render() {
    // ui
    return h(
      'div',
      {
        class: 'container',
        id: 'app',
      },
      // children -> string
      // 'hi mini-vue'
      // children -> Array
      [
        h('p', { class: 'red' }, 'hello'),
        h('p', { class: 'green' }, 'mini-vue'),
      ]
    )
  },
  setup() {
    return {
      msg: 'mini-vue',
    }
  },
}
