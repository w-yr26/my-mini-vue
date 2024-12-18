import { NodeTypes } from '../ast'

export function transformElement(node, context) {
  if (node.type === NodeTypes.ELEMENT) {
    context.helper('createElementVNode')
  }
}
