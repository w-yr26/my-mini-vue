import { h } from '../../lib/mini-vue.es.js'
export const App = {
  render() {
    // ui
    return h('div', 'hi' + this.msg)
  },
  setup() {
    return {
      msg: 'mini-vue',
    }
  },
}
