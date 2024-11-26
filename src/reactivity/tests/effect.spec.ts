import { effect, stop } from '../effect';
import { isReactive, isReadOnly, reactive, readonly } from '../reactive'

describe("effect", () => {
  it("happy path", () => {
    const user = reactive({
      age: 10
    })

    // 这一步，相当于第一次触发执行，从而进行依赖的收集
    let nextAge;
    effect(() => {
      nextAge = user.age + 1
    })
    expect(nextAge).toBe(11)

    // update(响应式数据更新，原先收集的依赖的订阅者都要触发执行)
    user.age++
    expect(nextAge).toBe(12)
  })

  it("should return runner when call effect", () => {
    // 希望effect(fn)的执行 -> return fn -> exe fn -> return val
    let foo = 10
    const runner = effect(() => {
      foo++
      return 'foo'
    })
    expect(foo).toBe(11)

    const r = runner()
    expect(foo).toBe(12)
    expect(r).toBe("foo")
  })

  // scheduler测试
  it("scheduler", () => {
    let dummy;
    let run: any;
    // scheduler此处只是一个伪函数，仅用来测试执行次数，和响应式数据更新并无关系
    const scheduler = jest.fn(() => {
      // run = runner;
      console.log('scheduler exe');

    });

    const obj = reactive({ foo: 1 });

    const runner = effect(
      () => {
        dummy = obj.foo;
      },
      { scheduler }
    );

    run = runner

    // 第一次执行传入的fn而非scheduler
    expect(scheduler).not.toHaveBeenCalled();
    expect(dummy).toBe(1);
    // 此后响应式数据更新应该执行scheduler
    obj.foo++;
    expect(scheduler).toHaveBeenCalledTimes(1);
    // 传入的fn此后不会执行，所以dummy还是1
    expect(dummy).toBe(1);
    // 执行run() -> 也就是执行runner()
    run();
    // 响应式数据更新
    expect(dummy).toBe(2);
  });

  it("stop", () => {
    let dummy, dummy2;
    const obj = reactive({ prop: 1 });
    const runner = effect(() => {
      dummy = obj.prop;
    });
    const runner2 = effect(() => {
      dummy2 = obj.prop
    })
    obj.prop = 2;
    expect(dummy).toBe(2);
    stop(runner);
    obj.prop = 3
    // obj.prop++;
    expect(dummy).toBe(2);
    // runner2并没有执行stop()，所以dummy2可以正常更新
    expect(dummy2).toBe(3)
    // stopped effect should still be manually callable
    runner();
    expect(dummy).toBe(3);
  });

  it("onstop", () => {
    const obj = reactive({
      foo: 1
    })
    const onStop = jest.fn()
    let dummy
    const runner = effect(
      () => {
        dummy = obj.foo
      },
      {
        onStop
      }
    )
     stop(runner)
     expect(onStop).toHaveBeenCalledTimes(1)
  })

  it("readonly", () => {
    console.warn = jest.fn()
    
    const obj = readonly({
      age: 20
    })

    obj.age = 21

    expect(console.warn).toHaveBeenCalledTimes(1)
  })

  it("isReactive", () => {
    const origin = { foo: 1 }
    const obj = reactive(origin)
    expect(origin).not.toBe(obj)
    expect(isReactive(obj)).toBe(true)
    expect(isReactive(origin)).toBe(false)
  })

  it("isReadonly", () => {
    const origin = { foo: 1 }
    const obj = readonly(origin)
    expect(origin).not.toBe(obj)
    expect(isReadOnly(obj)).toBe(true)
    expect(isReadOnly(origin)).toBe(false)
  })
})