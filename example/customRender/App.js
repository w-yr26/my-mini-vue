import { h } from '../../lib/mini-vue.es.js'

export const App = {
  setup() {
    return {
      id: '999',
    }
  },
  render() {
    return h('rect', {
      id: this.id,
    })
  },
}
