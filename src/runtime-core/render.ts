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
    patch(null, vnode, container, parentComponent, null)
  }

  // n1 -> 老的vnode
  // n2 -> 新的vnode
  function patch(n1, n2, container, parentComponent, anchor) {
    // 通过type判断是去处理 Component 类型 or element 类型
    // 如果是组件，n2.type是组件对象
    const { shapeFlag, type } = n2

    switch (type) {
      case Fragment:
        processFragment(n1, n2, container, parentComponent, anchor)
        break
      case Text:
        processText(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          // 渲染element类型
          processElement(n1, n2, container, parentComponent, anchor)
        } else if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) {
          // 渲染组件类型
          processComponent(n1, n2, container, parentComponent, anchor)
        }
        break
    }
  }

  // 创建Fragment
  function processFragment(n1, n2, container, parentComponent, anchor) {
    mountChildren(n2.children, container, parentComponent, anchor)
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
  function processElement(n1, n2, container, parentComponent, anchor) {
    if (!n1) {
      // 初始化element
      mountElement(n2, container, parentComponent, anchor)
    } else {
      // 更新element
      patchElement(n1, n2, container, parentComponent, anchor)
    }
  }

  function patchElement(n1, n2, container, parentComponent, anchor) {
    // 更新props
    const oldProps = n1.props || {}
    const newProps = n2.props || {}
    // 第一次是初始化，走mountElement(里面会将创建的元素挂载到vnode.el身上)
    // 第二次是更新，走的是patchElement(此时n2身上的el就不再会进行赋值)，所以此处要把上一个(也就是n1)的el先给n2
    // 再接着走一次，第二次的n2已经变成第一次的n1了，所以此时就不会没有值
    // 而且这个el是引用型数据，做出修改时n1、n2的el都会同步做出修改
    const el = (n2.el = n1.el)

    // 处理新旧children
    patchChildren(n1, n2, el, parentComponent, anchor)
    // 处理新旧props
    patchProps(el, oldProps, newProps)
  }

  function patchChildren(n1, n2, container, parentComponent, anchor) {
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
        mountChildren(c2, container, parentComponent, anchor)
      } else {
        // 新的为array、旧的为array -> diff
        patchKeyedChildren(c1, c2, container, parentComponent, anchor)
      }
    }
  }

  function patchKeyedChildren(
    c1,
    c2,
    container,
    parentComponent,
    parentAnchor
  ) {
    let i = 0
    let e1 = c1.length - 1
    let e2 = c2.length - 1

    // 判断两个vnode是否一致
    function isSomeVNodeType(n1, n2) {
      return n1.type === n2.type && n1.key === n2.key
    }

    // 1. 左侧比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[i]
      const n2 = c2[i]

      // 有关为什么要设置key的思考：
      // 在左侧比较中
      // 首先是根据vnode的type和key来进行判断新旧是否相同的。但由于一般开发中很少去修改type，所以此处就仅讨论key
      // 现在假设新旧的vnode的type都是相同的
      // 如果都不设置key，那么oldVnode.key === undefined === newVnode.key，也就意味这判断会认定他俩是相同的
      //  那么就会一直进入这个分支，递归调用patch -> 进而执行 patchElement
      // 但是存在一种情况就是当乱序的时候：
      // A B C D E
      // A B D C E
      // 前面两个(A B)递归调用patch()没毛病，但是到了 C -> D 进行比对的时候，会认为是同个类型(前面已经假定type一致)
      // 此时就会调用patch -> 进而把 C 换成 D；到了 D -> C 比对的时候，同样的逻辑，把 D 换成 C
      // 但其实 C D -> D C 是可以复用的，把 C 换成 D，再把 D 换成 C 其实是没必要的，所以说要加个 key
      // 在右侧比较中，key的作用同上
      if (isSomeVNodeType(n1, n2)) {
        // 调用patch()递归执行 -> 因为拿到的n1 n2可能是element、也可能是component
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      i++
    }

    // 2. 右侧比较
    while (i <= e1 && i <= e2) {
      const n1 = c1[e1]
      const n2 = c2[e2]

      if (isSomeVNodeType(n1, n2)) {
        patch(n1, n2, container, parentComponent, parentAnchor)
      } else {
        break
      }
      e1--
      e2--
    }

    // 3. 创建
    if (i > e1) {
      if (i <= e2) {
        const nextPos = e2 + 1
        const anchor = e2 + 1 < c2.length ? c2[nextPos].el : null
        while (i <= e2) {
          patch(null, c2[i], container, parentComponent, anchor)
          i++
        }
      }
    } else if (i > e2) {
      // 4. 删除
      while (i <= e1) {
        hostRemove(c1[i].el)
        i++
      }
    } else {
      // 乱序比较
      let s1 = i
      let s2 = i

      let toBePatched = e2 - s2 + 1 // 乱序部分待被处理的新结点个数
      let patched = 0 // 乱序部分已经处理的新结点个数
      const keyToNewIndexMap = new Map()

      // 再来说说乱序比较中，key的作用：帮助快速定位老的vnode在新的children中是否存在
      // 老的children: A B (C D) F G
      // 新的children: A B (E C) F G
      // 如果没有key，在前面左侧对比的时候，就已经被挨个替换了
      // 如果没有设置 key，那么最初在建立映射hash表的时候，得到的结果就是
      // { undefined -> index }
      // 等到老的children乱序部分来进行遍历的时候(也就是C D节点)，由于prevChild.key !== null始终不满足，
      // 所以对于老的乱序部分的每一个节点都会走else分支，也就是遍历新的乱序部分，看看老的vnode是否存在于新的children( C/D 是否存在于(E C))
      // 但是在比较的过程中，始终都认为它们是一致的(因为前面说type一致，而他们的key又都是undefined)
      // 就会拿到newIndex
      // 一拿到newIndex，就会走patch的逻辑。也就是 C 会被换成 E，D 会被换成 C
      // 但你发现 C 是没必要被换掉之后再换回来的，所以说要key

      // 先建立映射表，存放新的children有哪些节点
      for (let t = s2; t <= e2; t++) {
        const nextChild = c2[t]
        keyToNewIndexMap.set(nextChild.key, t)
      }

      for (let t = s1; t <= e1; t++) {
        const prevChild = c1[t]

        // 所有的新vnode都被处理完了 -> 多出来的旧的vnode直接移除
        if (patched >= toBePatched) {
          hostRemove(prevChild.el)
          continue
        }

        let newIndex
        // 对应 key 为null/undefined的情况
        if (prevChild.key !== null) {
          // 有key，直接根据key进行比较
          newIndex = keyToNewIndexMap.get(prevChild.key)
        } else {
          // 没有key，遍历新的children，看看老的节点是否还在新的里面
          for (let j = s2; j <= e2; j++) {
            // isSomeVNodeType是根据key和type进行比较的，但由于此时都已经是老的vnode没有key的情况了，所以这个分支一定不会走
            if (isSomeVNodeType(prevChild, c2[j])) {
              newIndex = j
              break
            }
          }
        }

        if (!newIndex) {
          // 旧的节点在新的children中找不到 -> 移除
          hostRemove(prevChild.el)
        } else {
          // 旧的节点在新的children中找得到 -> 深度对比
          patch(prevChild, c2[newIndex], container, parentComponent, null)
          patched++
        }
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

  function mountElement(vnode, container, parentComponent, anchor) {
    //  创建节点
    const el = (vnode.el = hostCreateElement(vnode.type))
    // children -> string or Array
    const { children, shapeFlag } = vnode
    if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // string类型，直接设置内容
      el.textContent = children
    } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // Array类型，递归调用patch -> 进入patch后，再度判断是渲染Component or element
      mountChildren(vnode.children, el, parentComponent, anchor)
    }
    // props
    const { props } = vnode
    for (const key in props) {
      const val = props[key]
      hostPatchProp(el, key, null, val)
    }

    hostInsert(el, container, anchor)
  }

  function mountChildren(children, container, parentComponent, anchor) {
    children.forEach((v) => {
      patch(null, v, container, parentComponent, anchor)
    })
  }

  function processComponent(n1, n2, container, parentComponent, anchor) {
    mountComponent(n2, container, parentComponent, anchor)
  }

  // 组件挂载
  function mountComponent(vnode, container, parentComponent, anchor) {
    const instance = createComponentInstance(vnode, parentComponent)
    // 处理setup部分
    setupComponent(instance)
    // 处理render
    setupRenderEffect(instance, vnode, container, anchor)
  }

  function setupRenderEffect(instance, vnode, container, anchor) {
    effect(() => {
      if (!instance.isMounted) {
        // init
        const { proxy } = instance
        const subTree = (instance.subTree = instance.render.call(proxy))
        patch(null, subTree, container, instance, anchor)

        vnode.el = subTree.el

        instance.isMounted = true
      } else {
        // update
        const { proxy } = instance
        const subTree = instance.render.call(proxy)
        const preSubTree = instance.subTree
        // 更新组件实例身上的subTree -> 应该放当前的
        instance.subTree = subTree

        patch(preSubTree, subTree, container, instance, anchor)
      }
    })
  }

  return {
    createApp: createAppAPI(render),
  }
}
