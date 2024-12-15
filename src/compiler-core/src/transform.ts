export function transform(root, options) {
  // 创建上下文
  const context = createTransformContext(root, options)
  // 遍历 - 深搜
  traverseNode(root, context)
}

function createTransformContext(root, options) {
  return {
    root,
    nodeTransforms: options.nodeTransforms || [],
  }
}

function traverseNode(node, context) {
  const children = node.children

  // 处理text
  const nodeTransforms = context.nodeTransforms
  for (let i = 0; i < nodeTransforms.length; i++) {
    const transform = nodeTransforms[i]
    transform(node)
  }

  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      traverseNode(child, context)
    }
  }
}
