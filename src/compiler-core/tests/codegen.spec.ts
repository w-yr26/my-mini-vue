import { generate } from '../src/codegen'
import { baseParse } from '../src/parse'
import { transform } from '../src/transform'
import { transformElement } from '../src/transforms/transformElement'
import { transformExpression } from '../src/transforms/transformExpression'
import { transformText } from '../src/transforms/transformText'

describe('codegen', () => {
  test('string', () => {
    const ast = baseParse('hi')
    transform(ast)
    const { code } = generate(ast)
    // 快照测试
    // 用于对比快照前后是否一致
    // 如果前后不一致，说明出现了bug；当然，有时候是有意的更新
    expect(code).toMatchSnapshot()
  })

  test('interpolation', () => {
    const ast = baseParse('{{message}}')
    transform(ast, {
      nodeTransforms: [transformExpression],
    })
    const { code } = generate(ast)
    expect(code).toMatchSnapshot()
  })

  test('element', () => {
    const ast = baseParse('<div></div>')
    transform(ast, {
      nodeTransforms: [transformElement],
    })
    const { code } = generate(ast)
    expect(code).toMatchSnapshot()
  })

  test('more type', () => {
    const ast: any = baseParse('<div>hi,{{message}}</div>')
    transform(ast, {
      nodeTransforms: [transformElement, transformText],
    })
    const { code } = generate(ast)
    expect(code).toMatchSnapshot()
  })
})
