import { h, renderSlots } from '../../lib/mini-vue.es.js'

export const Foo = {
  render() {
    console.log('slots', this.$slots)
    const foo = h('p', { class: 'foo-p' }, 'this is foo')

    const age = 10

    return h('div', {}, [
      renderSlots(this.$slots, 'first', {
        age,
      }),
      foo,
      renderSlots(this.$slots, 'last', {
        age,
      }),
    ])
  },
  setup(props) {
    return {}
  },
}
