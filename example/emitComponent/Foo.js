import { h } from '../../lib/mini-vue.es.js'

export const Foo = {
  render() {
    const btn = h('button', { onClick: this.emitAdd }, 'click Btn')
    const foo = h('p', { class: 'foo-p' }, 'this is foo')
    return h('div', {}, [foo, btn])
  },
  setup(props, { emit }) {
    function emitAdd() {
      console.log('Foo click event exe')
      // emit('add', 1, 2)
      emit('add-foo', 1, 2)
    }

    return {
      emitAdd,
    }
  },
}
