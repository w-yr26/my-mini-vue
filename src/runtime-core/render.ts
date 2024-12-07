import { effect } from '../reactivity/effect'
import { ShapeFlags } from '../shared/shapeFlags'
import { createComponentInstance, setupComponent } from './component'
import { createAppAPI } from './createApp'
import { Fragment, Text } from './vnode'

export function createRenderer(options) {
  const { createElement, patchProp, insert } = options

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
    mountChildren(n2, container, parentComponent)
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
      patchElement(n1, n2, container)
    }
  }

  function patchElement(n1, n2, contain) {
    console.log('patchElement')
    console.log('n1', n1)
    console.log('n2', n2)
  }

  function mountElement(vnode, container, parentComponent) {
    //  创建节点
    const el = (vnode.el = createElement(vnode.type))
    // children -> string or Array
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // string类型，直接设置内容
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
      mountChildren(vnode, el, parentComponent)
    }
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      patchProp(el, key, val)
    }

    insert(el, container)
  }

  function mountChildren(vnode, container, parentComponent) {
    vnode.children.forEach((v) => {
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
