import { NodeTypes } from './ast'

const enum TagType {
  Start,
  End,
}

export function baseParse(content) {
  const context = createParserContext(content)
  return createRoot(parseChildren(context, []))
}

function parseChildren(context, ancestors) {
  const nodes: any[] = []
  while (!isEnd(context, ancestors)) {
    let node
    const s = context.source
    if (s.startsWith('{{')) {
      // 解析插值表达式
      node = parseInterpolation(context)
    } else if (s[0] === '<') {
      // 解析tag
      if (/[a-z]/i.test(s[1])) {
        node = parseElement(context, ancestors)
      }
    }

    if (!node) {
      node = parseText(context)
    }
    nodes.push(node)
  }
  return nodes
}

// 解析是否结束(结束条件：source有值，且标签闭合)
function isEnd(context, ancestors) {
  const s = context.source
  if (s.startsWith('</')) {
    for (let i = ancestors.length - 1; i >= 0; i--) {
      const tag = ancestors[i].tag

      if (startsWithEndTagOpen(s, tag)) {
        return true
      }
    }
    return true
  }
  return !s
}

// 解析文本
// 1. 纯文本
// 2. <p>text</p>
// 3. <div>text, {{message}}</div>
function parseText(context) {
  // 截取文本内容的时候，可能会遇到和{{}}或者tag混用的情况，此时就不能直接截取到底
  let endIndex = context.source.length
  const endTokens = ['{{', '<']
  for (let i = 0; i < endTokens.length; i++) {
    const token = endTokens[i]
    const index = context.source.indexOf(token)
    if (index !== -1 && endIndex > index) endIndex = index
  }
  const content = context.source.slice(0, endIndex)

  // 推进
  advanceBy(context, endIndex)

  return {
    type: NodeTypes.TEXT,
    content,
  }
}

// 解析element
function parseElement(context, ancestors) {
  const element: any = parseTag(context, TagType.Start)
  ancestors.push(element)
  // tag内的内容放置在childrnen属性身上
  element.children = parseChildren(context, ancestors)
  ancestors.pop()

  if (startsWithEndTagOpen(context.source, element.tag)) {
    parseTag(context, TagType.End)
  } else {
    throw new Error(`缺少结束标签:${element.tag}`)
  }

  return element
}

function startsWithEndTagOpen(source, tag) {
  return (
    source.startsWith('</') &&
    source.slice(2, 2 + tag.length).toLowerCase() === tag.toLowerCase()
  )
}

// 解析出tag标签
function parseTag(context, type) {
  const match: any = /^<\/?([a-z]*)/i.exec(context.source)

  const tag = match[1]
  // 移动之后的结果，返回<div></div>中的第一个div,返回除去第一个<div>之后的内容
  // <div></div> -> ></div>
  advanceBy(context, match[0].length)
  // </div>
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
 * @param context 上下文内容
 * @param length 推进的长度
 */
function advanceBy(context, length) {
  context.source = context.source.slice(length)
}

function createRoot(children) {
  return {
    children,
    type: NodeTypes.ROOT,
  }
}

function createParserContext(content) {
  return {
    source: content,
  }
}
