export function generate(ast) {
  const context = createCodegenContext()

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

function getNode(node, context) {
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
