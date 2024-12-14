import { NodeTypes } from './ast'

const enum TagType {
  Start,
  End,
}

export function baseParse(content) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context))
}

function parseChildren(context) {
  const nodes: any[] = []
  let node
  const s = context.source
  if (s.startsWith('{{')) {
    // 解析插值表达式
    node = parseInterpolation(context)
  } else if (s[0] === '<') {
    // 解析tag
    if (/[a-z]/i.test(s[1])) {
      node = parseElement(context)
    }
  }

  if (!node) {
    node = parseText(context)
  }
  nodes.push(node)
  return nodes
}

// 解析文本
function parseText(context) {
  const content = context.source.slice(0, context.source.length)
  console.log('content', content)

  // 推进
  advanceBy(context, context.source.length)
  console.log('content', context.source)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}

// 解析element
function parseElement(context) {
  const element = parseTag(context, TagType.Start)
  parseTag(context, TagType.End)
  return element
}

// 解析出tag标签
function parseTag(context, type) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)

  const tag = match[1]
  advanceBy(context, match[0].length)
  advanceBy(context, 1)

  if (type === TagType.End) return
  return {
    type: NodeTypes.ELEMENT,
    tag,
  }
}

// 解析插值表达式
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
