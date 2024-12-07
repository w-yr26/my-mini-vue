import { h, ref } from '../../lib/mini-vue.es.js'

window.self = null
export const App = {
  name: 'App',
  setup() {
    const count = ref(0)
    const onClick = () => {
      count.value++
    }

    const props = ref({
      foo: 'foo',
      bar: 'bar',
    })

    const onChangePropsDemo1 = () => {
      props.value.foo = 'new foo'
    }

    const onChangePropsDemo2 = () => {
      props.value.foo = undefined
    }

    const onChangePropsDemo3 = () => {
      props.value = {
        foo: 'foo',
      }
    }

    return {
      count,
      onClick,
      onChangePropsDemo1,
      onChangePropsDemo2,
      onChangePropsDemo3,
      props,
    }
  },
  render() {
    return h(
      'div',
      {
        id: 'root',
        ...this.props,
      },
      [
        h('p', {}, 'count:' + this.count),
        h(
          'button',
          {
            onClick: this.onClick,
          },
          'click me'
        ),
        h(
          'button',
          {
            onClick: this.onChangePropsDemo1,
          },
          'change props'
        ),
        h(
          'button',
          {
            onClick: this.onChangePropsDemo2,
          },
          'set prop undefined or null'
        ),
        h(
          'button',
          {
            onClick: this.onChangePropsDemo3,
          },
          'delete prop'
        ),
      ]
    )
  },
}
