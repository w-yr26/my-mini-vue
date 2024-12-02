import { h } from '../../lib/mini-vue.es.js'

window.self = null
export const App = {
  render() {
    window.self = this
    // ui
    return h(
      'div',
      {
        class: 'container',
        id: 'app',
        onClick() {
          console.log('click')
        },
      },
      // children -> string
      // 'hi mini-vue'
      // children -> Array
      // [
      //   h('p', { class: 'red' }, 'hello'),
      //   h('p', { class: 'green' }, 'mini-vue'),
      // ]
      'hi ' + this.msg
    )
  },
  setup() {
    return {
      msg: 'mini-vue-hahaha',
    }
  },
}
