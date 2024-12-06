import { createVNode } from './vnode'

export function createAppAPI(render) {
  return function createApp(rootComponent) {
    return {
      mount(rootContainer) {
        // 传进来的组件都会先处理成虚拟节点，后续都是对vnode进行操作
        const vnode = createVNode(rootComponent)
        // 基于vnode进行渲染
        render(vnode, rootContainer, null)
      },
    }
  }
}
