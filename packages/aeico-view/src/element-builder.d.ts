type _Style = Partial<CSSStyleDeclaration> & Record<string, string>;
type _Props = {
  className?: string | Record<string, boolean>;
  text?: string;
  textContent?: string;
  id?: string;
  part?: string;
  role?: string;
  style?: _Style;
  key?: string;
};
type BuilderProps = _Props & Record<string, unknown>;
type TagFunction<K extends keyof HTMLElementTagNameMap> = {
  (props?: BuilderProps, cb?: () => void): HTMLElementTagNameMap[K];
  (cb: () => void): HTMLElementTagNameMap[K];
};
type HTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap]: TagFunction<K>;
};
type SVGTagFunction<K extends keyof SVGElementTagNameMap> = {
  (props?: BuilderProps, cb?: () => void): SVGElementTagNameMap[K];
  (cb: () => void): SVGElementTagNameMap[K];
};
type SVGOnlyTags = {
  readonly [K in Exclude<
    keyof SVGElementTagNameMap,
    keyof HTMLElementTagNameMap | 'text'
  >]: SVGTagFunction<K>;
};
type KebabToCamel<S extends string> = S extends `${infer Head}-${infer Tail}`
  ? `${Head}${Capitalize<KebabToCamel<Tail>>}`
  : S;
type CustomHTMLTags = {
  readonly [K in keyof HTMLElementTagNameMap as K extends `${string}-${string}`
    ? KebabToCamel<K>
    : never]: {
    (props?: BuilderProps, cb?: () => void): HTMLElementTagNameMap[K];
    (cb: () => void): HTMLElementTagNameMap[K];
  };
};
interface ElementBuilder extends HTMLTags, SVGOnlyTags, CustomHTMLTags {}
declare class ElementBuilder {
  private _stack;
  private _cursorStack;
  private _propsCache;
  constructor();
  private get _parent();
  private get _cursor();
  private set _cursor(value);
  private get _inBuildContext();
  private _create;
  private _createElement;
  private _resolveElement;
  private _mountChildren;
  private _findChildByKey;
  private _isBareFragment;
  build(root: Node, block: () => void): void;
  private _cleanup;
  private _applyProps;
  private _removeProp;
  detached<T>(fn: () => T): T;
  el: <T extends keyof HTMLElementTagNameMap | keyof SVGElementTagNameMap>(
    tagName: T,
    propsOrCb?: BuilderProps | (() => void),
    cb?: () => void,
  ) => T extends keyof HTMLElementTagNameMap
    ? HTMLElementTagNameMap[T]
    : T extends keyof SVGElementTagNameMap
      ? SVGElementTagNameMap[T]
      : Element;
  text: (content: string) => Text;
  node: (existingNode: Node) => Node;
  fragment: (cb: () => void) => DocumentFragment;
}
export default ElementBuilder;
export type { BuilderProps, HTMLTags, SVGOnlyTags };
