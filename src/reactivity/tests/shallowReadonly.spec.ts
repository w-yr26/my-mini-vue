import { isReactive, isReadOnly, readonly, shallowReadonly } from "../reactive";

describe("shallow readonly", () => {
  test("should not make non-reactive properties reactive", () => {
    const props = shallowReadonly({ n: { foo: 1 } });
    expect(isReactive(props.n)).toBe(false);
    expect(isReadOnly(props.n)).toBe(false);
  });
  test("should differentiate from normal readonly calls", async () => {
    const original = { foo: {} };
    const shallowProxy = shallowReadonly(original);
    const reactiveProxy = readonly(original);
    expect(shallowProxy).not.toBe(reactiveProxy);
    expect(isReadOnly(shallowProxy.foo)).toBe(false);
    expect(isReadOnly(reactiveProxy.foo)).toBe(true);
  });
});