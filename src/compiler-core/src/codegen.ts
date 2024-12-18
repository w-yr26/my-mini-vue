import { NodeTypes } from './ast'

export function generate(ast) {
  const context = createCodegenContext()

  // 处理导入逻辑
  genFunctionPreamble(context, ast)

  context.push('return ')
  const functionName = 'render'
  const args = ['_ctx', '_cache']
  const signature = args.join(', ')

  context.push(`function ${functionName}(${signature}){`)
  context.push('return ')
  getNode(ast.codegenNode, context)
  context.push('}')
  return {
    code: context.code,
  }
}

function genFunctionPreamble(context, ast) {
  const { push } = context
  if (context.type === NodeTypes.INTERPOLATION) {
    const VueBinging = 'Vue'
    const aliasHelper = (s) => `${s}: _${s}`
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
  }
  push('\n')
}

function getNode(node, context) {
  switch (node.type) {
    case NodeTypes.TEXT:
      getText(node, context)
      break
    case NodeTypes.INTERPOLATION:
      getInterpolation(node, context)
      break
    case NodeTypes.SIMPLE_EXPRESSION:
      getExpression(node, context)
      break
    default:
      break
  }
}

// 获取文本内容
function getText(node, context) {
  const { push } = context
  push(`'${node.content}'`)
}

// 获取插值表达式
function getInterpolation(node, context) {
  const { push } = context
  push('_toDisplayString(')
  getNode(node.content, context)
  push(')')
}

// 获取插值
function getExpression(node, context) {
  const { push } = context
  push(`${node.content}`)
}

function createCodegenContext() {
  const context = {
    code: '',
    push(source) {
      context.code += source
    },
  }

  return context
}
