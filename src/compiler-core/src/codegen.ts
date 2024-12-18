import { isString } from '../../shared/index'
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
  genNode(ast.codegenNode, context)
  context.push('}')
  return {
    code: context.code,
  }
}

function genFunctionPreamble(context, ast) {
  const { push } = context
  const VueBinging = 'Vue'
  const aliasHelper = (s) => `${s}: _${s}`
  if (ast.helpers.length > 0) {
    push(`const { ${ast.helpers.map(aliasHelper).join(', ')} } = ${VueBinging}`)
  }
  push('\n')
}

function genNode(node, context) {
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
    case NodeTypes.ELEMENT:
      getELement(node, context)
      break
    case NodeTypes.COMPOUND_EXPRESSION:
      getCompoundExpression(node, context)
      break
    case NodeTypes.TEXT:
      genText(node, context)
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
  genNode(node.content, context)
  push(')')
}

// 获取插值
function getExpression(node, context) {
  const { push } = context
  push(`${node.content}`)
}

// 获取Element
function getELement(node, context) {
  const { push } = context
  const { tag, children } = node
  // element内如果包裹着值，就在children字段中
  push(`(createElementVNode("${tag}"), null,`)

  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    genNode(child, context)
  }
  push(')')
}

// 获取复合类型
function getCompoundExpression(node, context) {
  const { push } = context
  const children = node.children
  for (let i = 0; i < children.length; i++) {
    const child = children[i]
    if (isString(child)) {
      push(child)
    } else {
      genNode(child, context)
    }
  }
}

function genText(node: any, context: any) {
  // Implement
  const { push } = context

  push(`'${node.content}'`)
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
