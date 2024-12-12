import { h } from "../../lib/mini-vue.es.js"

export const Child = {
  name: 'Child',
  setup() {},
  render() {
    return h('div', {}, 'child msg:' + this.$props.msg)
  },
}
