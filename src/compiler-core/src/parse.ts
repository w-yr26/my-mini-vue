import { NodeTypes } from './ast'

export function baseParse(content) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any[] = []
  let node
  // 以'{{'才有必要进行解析
  if (context.source.startsWith('{{')) {
    node = parseInterpolation(context)
  }
  nodes.push(node)
  return nodes
}

function parseInterpolation(context) {
  const openDelimiter = '{{'
  const closeDelimiter = '}}'
  // 插值表达式'}}'的下标
  const closeIndex = context.source.indexOf(
    closeDelimiter,
    openDelimiter.length
  )
  // 往前推进两个位置(也就是'{{'的位置)
  advanceBy(context, openDelimiter.length)

  // closeIndex是在还没往前推进的时候获取的下标，往前推进之后，closeIndex也要减去对应的值
  const rowContentLength = closeIndex - openDelimiter.length

  const rawContent = context.source.slice(0, rowContentLength)
  const content = rawContent.trim()
  // 存在 {{message}} xxx 的情况，所以要接着往后截取
  // context.source = context.source.slice(
  //   rowContentLength + closeDelimiter.length
  // )
  advanceBy(context, rowContentLength + closeDelimiter.length)

  // {{message}}
  return {
    type: NodeTypes.INTERPOLATION,
    content: {
      type: NodeTypes.SIMPLE_EXPRESSION,
      content: content,
    },
  }
}

/**
 *
 * @param context 插值表达式的内容
 * @param length 推进的长度
 */
function advanceBy(context, length) {
  context.source = context.source.slice(length)
}

function createRoot(children) {
  return {
    children,
  }
}

function createParserContext(content) {
  return {
    source: content,
  }
}
