import { h, renderSlots } from '../../lib/mini-vue.es.js'

export const Foo = {
  render() {
    console.log('slots', this.$slots)
    const foo = h('p', { class: 'foo-p' }, 'this is foo')
    return h('div', {}, [
      renderSlots(this.$slots, 'first'),
      foo,
      renderSlots(this.$slots, 'last'),
    ])
  },
  setup(props) {
    return {}
  },
}
