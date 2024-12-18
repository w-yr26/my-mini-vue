import { NodeTypes } from './ast'

// ast:传入的初始ast树
export function transform(root, options = {}) {
  // 创建上下文
  const context = createTransformContext(root, options)
  // 遍历 - 深搜
  traverseNode(root, context)

  createCodegenNode(root)

  root.helpers = [...context.helpers.keys()]
}

function createCodegenNode(root) {
  root.codegenNode = root.children[0]
}

function createTransformContext(root, options) {
  const context = {
    root,
    nodeTransforms: options.nodeTransforms || [],
    helpers: new Map(),
    helper(key) {
      context.helpers.set(key, 1)
    },
  }
  return context
}

function traverseNode(node, context) {
  const children = node.children

  // 处理text
  const nodeTransforms = context.nodeTransforms
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node, context)
  }

  switch (node.type) {
    case NodeTypes.INTERPOLATION:
      context.helper('toDisplayString')
      break
    case NodeTypes.ROOT:
    case NodeTypes.ELEMENT:
      traverseChildren(node, context)
      break
    default:
      break
  }
}

function traverseChildren(node, context) {
  const children = node.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      traverseNode(child, context)
    }
  }
}
