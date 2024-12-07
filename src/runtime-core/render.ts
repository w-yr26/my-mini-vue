import { effect } from '../reactivity/effect'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { createAppAPI } from './createApp'
import { Fragment, Text } from './vnode'

export function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    patchProp: hostPatchProp,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
  } = options

  function render(vnode, container, parentComponent) {
    patch(null, vnode, container, parentComponent)
  }

  // n1 -> 老的vnode
  // n2 -> 新的vnode
  function patch(n1, n2, container, parentComponent) {
    // 通过type判断是去处理 Component 类型 or element 类型
    // 如果是组件，n2.type是组件对象
    const { shapeFlag, type } = n2

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 渲染element类型
          processElement(n1, n2, container, parentComponent)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 渲染组件类型
          processComponent(n1, n2, container, parentComponent)
        }
        break
    }
  }

  // 创建Fragment
  function processFragment(n1, n2, container, parentComponent) {
    mountChildren(n2.children, container, parentComponent)
  }

  // 创建文本节点
  function processText(n1, n2, container) {
    // 此时的children就是纯文本
    const { children } = n2
    const textNode = (n2.el = document.createTextNode(children))
    container.append(textNode)
  }

  /**
   * 此时的vnode结构类似于：
   * vnode = {
   *  type: 'div',
   *  props: {
   *    class: '',
   *    id: ''
   *  },
   *  children: 'string' or [ h(), h(), 'string' ]
   * }
   *
   */
  function processElement(n1, n2, container, parentComponent) {
    if (!n1) {
      // 初始化element
      mountElement(n2, container, parentComponent)
    } else {
      // 更新element
      patchElement(n1, n2, container, parentComponent)
    }
  }

  function patchElement(n1, n2, container, parentComponent) {
    // 更新props
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    // 第一次是初始化，走mountElement(里面会将创建的元素挂载到vnode.el身上)
    // 第二次是更新，走的是patchElement(此时n2身上的el就不再会进行赋值)，所以此处要把上一个(也就是n1)的el先给n2
    // 再接着走一次，第二次的n2已经变成第一次的n1了，所以此时就不会没有值
    // 而且这个el是引用型数据，做出修改时n1、n2的el都会同步做出修改
    const el = (n2.el = n1.el)

    // 处理新旧children
    patchChildren(n1, n2, el, parentComponent)
    // 处理新旧props
    patchProps(el, oldProps, newProps)
  }

  function patchChildren(n1, n2, container, parentComponent) {
    const prevShapeFlag = n1.shapeFlag
    const c1 = n1.children
    const shapeFlag = n2.shapeFlag
    const c2 = n2.children
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 新的为text、旧的为array
      if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 旧的为array、新的为text
        // 清空老的children
        unmountChildren(n1.children)
      }
      // 如果新旧children不同(不管是旧的为array、新的为text；还是新旧都是text)
      if (c1 !== c2) {
        hostSetElementText(container, c2)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        // 新的为array、旧的为text
        // 把老的内容置空
        hostSetElementText(container, '')
        // 把新的children挂上
        mountChildren(c2, container, parentComponent)
      } else {
        // 新的为array、旧的为array -> diff
      }
    }
  }

  function unmountChildren(children) {
    for (let index = 0; index < children.length; index++) {
      const el = children[index]
      hostRemove(el)
    }
  }

  function patchProps(el, oldProps, newProps) {
    // 新旧props的key-value都一样时，不需要再执行。但这里是错误写法，因为比较的是地址
    // if (oldProps === newProps) return console.log('无需执行')

    for (const key in newProps) {
      const prevProp = oldProps[key]
      const nextProp = newProps[key]
      hostPatchProp(el, key, prevProp, nextProp)
    }

    for (const key in oldProps) {
      if (!(key in newProps)) hostPatchProp(el, key, oldProps[key], null)
    }
  }

  function mountElement(vnode, container, parentComponent) {
    //  创建节点
    const el = (vnode.el = hostCreateElement(vnode.type))
    // children -> string or Array
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // string类型，直接设置内容
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
      mountChildren(vnode.children, el, parentComponent)
    }
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    hostInsert(el, container)
  }

  function mountChildren(children, container, parentComponent) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent)
    })
  }

  function processComponent(n1, n2, container, parentComponent) {
    mountComponent(n2, container, parentComponent)
  }

  // 组件挂载
  function mountComponent(vnode, container, parentComponent) {
    const instance = createComponentInstance(vnode, parentComponent)
    // 处理setup部分
    setupComponent(instance)
    // 处理render
    setupRenderEffect(instance, vnode, container)
  }

  function setupRenderEffect(instance, vnode, container) {
    effect(() => {
      if (!instance.isMounted) {
        // init
        const { proxy } = instance
        const subTree = (instance.subTree = instance.render.call(proxy))
        patch(null, subTree, container, instance)

        vnode.el = subTree.el

        instance.isMounted = true
      } else {
        // update
        const { proxy } = instance
        const subTree = instance.render.call(proxy)
        const preSubTree = instance.subTree
        // 更新组件实例身上的subTree -> 应该放当前的
        instance.subTree = subTree

        patch(preSubTree, subTree, container, instance)
      }
    })
  }

  return {
    createApp: createAppAPI(render),
  }
}
