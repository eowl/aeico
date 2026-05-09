import { expect } from '@esm-bundle/chai';
import { mount, unmountAll, updated } from '../helpers/mount.js';
import AeicoElement from '../../src/aeico-element.js';
import { css } from '../../src/styles.js';
import type { StyleEntry } from '../../src/styles.js';
import { html } from 'aeico-view';

afterEach(() => {
  unmountAll();
});

let _counter = 0;

describe('AeicoElement', () => {
  describe('static styles', () => {
    it('applies a CSS string as an adopted stylesheet', async () => {
      const tag = `test-ae-styles-str-${++_counter}`;

      class El extends AeicoElement {
        protected static styles = '.box { color: red; }';
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(1);
    });

    it('applies a StyleResult as an adopted stylesheet', async () => {
      const tag = `test-ae-styles-result-${++_counter}`;
      const sheet = css('.foo { color: blue; }');

      class El extends AeicoElement {
        protected static styles = sheet;
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(1);
    });

    it('applies multiple stylesheets from an array', async () => {
      const tag = `test-ae-styles-arr-${++_counter}`;

      class El extends AeicoElement {
        protected static styles = ['.a { color: red; }', '.b { color: blue; }'];
      }
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(2);
    });

    it('element with no static styles has no adopted stylesheets', async () => {
      const tag = `test-ae-no-styles-${++_counter}`;

      class El extends AeicoElement {}
      customElements.define(tag, El);

      const el = await mount<El>(`<${tag}></${tag}>`);
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(0);
    });

    it('subclass inherits and can extend parent styles', async () => {
      const tag = `test-ae-inherit-styles-${++_counter}`;
      const parentSheet = css('.parent { color: red; }');
      const childSheet = css('.child { color: blue; }');

      class Parent extends AeicoElement {
        protected static override styles: StyleEntry = parentSheet;
      }
      class Child extends Parent {
        protected static override styles: StyleEntry = [parentSheet, childSheet];
      }
      customElements.define(tag, Child);

      const el = await mount<Child>(`<${tag}></${tag}>`);
      expect(el.shadowRoot!.adoptedStyleSheets).to.have.lengthOf(2);
    });
  });

  describe('create()', () => {
    it('returns a new instance of the component', () => {
      const tag = `test-ae-create-basic-${++_counter}`;
      class MyEl extends AeicoElement {}
      customElements.define(tag, MyEl);
      const instance = MyEl.create();
      expect(instance).to.be.instanceOf(MyEl);
    });

    it('sets provided config properties on the instance', () => {
      const tag = `test-ae-create-props-${++_counter}`;
      class MyEl extends AeicoElement {
        static props = { label: { type: String } };
        declare label: string | undefined;
      }
      customElements.define(tag, MyEl);
      const instance = MyEl.create({ label: 'hello' }) as MyEl;
      expect(instance.label).to.equal('hello');
    });

    it('ignores config keys that are not properties on the instance', () => {
      const tag = `test-ae-create-ignore-${++_counter}`;
      class MyEl extends AeicoElement {}
      customElements.define(tag, MyEl);
      expect(() => MyEl.create({ nonExistent: 'value' })).to.not.throw();
    });

    it('applies cssVars to the host element style after connecting to the DOM', async () => {
      const tag = `test-ae-create-cssvars-${++_counter}`;
      class El extends AeicoElement {}
      customElements.define(tag, El);

      const el = El.create({ cssVars: { '--my-color': 'hotpink' } }) as El;
      document.body.appendChild(el);
      await updated();

      expect(el.style.getPropertyValue('--my-color')).to.equal('hotpink');
      document.body.removeChild(el);
    });

    describe('with children', () => {
      /**
       * Component used across all "with children" tests:
       * - prop: label (String)
       * - static styles: sets display:block and --card-color variable
       * - shadow DOM: a named slot "content"
       */
      function defineCard() {
        const tag = `test-ae-children-card-${++_counter}`;

        class CardEl extends AeicoElement {
          static props = { label: { type: String } };
          static styles = css(':host { display: block; color: var(--card-color, inherit); }');
          declare label: string | undefined;
        }

        customElements.define(tag, CardEl);
        return { tag, CardEl };
      }

      it('tag usage and create() produce the same label prop, stylesheet count, and slot content', async () => {
        const { tag, CardEl } = defineCard();

        // Via HTML tag
        const tagEl = await mount<InstanceType<typeof CardEl>>(
          `<${tag} label="hello"><span slot="content">world</span></${tag}>`,
        );
        await updated();

        // Via create()
        const createEl = CardEl.create(
          { label: 'hello' },
          html(({ span }) => {
            span({ slot: 'content', textContent: 'world' });
          }),
        );
        document.body.appendChild(createEl);
        await updated();

        // Props
        expect(createEl.label).to.equal(tagEl.label);

        // Adopted stylesheets count
        expect(createEl.shadowRoot!.adoptedStyleSheets.length).to.equal(
          tagEl.shadowRoot!.adoptedStyleSheets.length,
        );

        // Light DOM slot content
        const tagSpan = tagEl.querySelector('span[slot="content"]')!;
        const createSpan = createEl.querySelector('span[slot="content"]')!;
        expect(createSpan).to.exist;
        expect(createSpan.textContent).to.equal(tagSpan.textContent);
        expect(createSpan.getAttribute('slot')).to.equal(tagSpan.getAttribute('slot'));

        document.body.removeChild(createEl);
      });

      it('create(html()) with no config appends children to light DOM', async () => {
        const { CardEl } = defineCard();

        const el = CardEl.create(
          html(({ span }) => {
            span({ slot: 'content', textContent: 'Hello' });
          }),
        );
        document.body.appendChild(el);
        await updated();

        const span = el.querySelector('span[slot="content"]');
        expect(span).to.exist;
        expect(span!.textContent).to.equal('Hello');

        document.body.removeChild(el);
      });

      it('create() renders multiple children from a list', async () => {
        const { CardEl } = defineCard();

        const labels = ['Home', 'Docs', 'Blog'];
        const el = CardEl.create(
          html(({ a }) => {
            labels.forEach((label) =>
              a({ slot: 'nav', href: `#${label.toLowerCase()}`, textContent: label }),
            );
          }),
        );
        document.body.appendChild(el);
        await updated();

        const anchors = el.querySelectorAll('a[slot="nav"]');
        expect(anchors).to.have.lengthOf(3);
        expect(anchors[0].textContent).to.equal('Home');
        expect(anchors[2].textContent).to.equal('Blog');

        document.body.removeChild(el);
      });

      it('create() with cssVars sets CSS custom properties on the host', async () => {
        const { CardEl } = defineCard();

        const el = CardEl.create({ cssVars: { '--card-color': 'hotpink' } });
        document.body.appendChild(el);
        await updated();

        expect(el.style.getPropertyValue('--card-color')).to.equal('hotpink');

        document.body.removeChild(el);
      });

      it('create() with styles option appends extra adopted stylesheets', async () => {
        const { tag, CardEl } = defineCard();

        const baseEl = await mount<AeicoElement>(`<${tag}></${tag}>`);
        await updated();
        const baseCount = baseEl.shadowRoot!.adoptedStyleSheets.length;

        const el = CardEl.create({ styles: ['.override { font-size: 20px; }'] });
        document.body.appendChild(el);
        await updated();

        expect(el.shadowRoot!.adoptedStyleSheets.length).to.be.greaterThan(baseCount);

        document.body.removeChild(el);
      });

      it('create() with style as string sets inline cssText on the host', async () => {
        const { CardEl } = defineCard();

        const el = CardEl.create({ style: 'color: red; font-size: 20px;' });
        document.body.appendChild(el);
        await updated();

        expect(el.style.color).to.equal('red');
        expect(el.style.fontSize).to.equal('20px');

        document.body.removeChild(el);
      });

      it('create() with style as object sets individual style properties on the host', async () => {
        const { CardEl } = defineCard();

        const el = CardEl.create({ style: { color: 'blue', fontSize: '18px' } });
        document.body.appendChild(el);
        await updated();

        expect(el.style.color).to.equal('blue');
        expect(el.style.fontSize).to.equal('18px');

        document.body.removeChild(el);
      });

      it('create() with style object supports CSS custom properties', async () => {
        const { CardEl } = defineCard();

        const el = CardEl.create({ style: { '--card-color': 'purple' } });
        document.body.appendChild(el);
        await updated();

        expect(el.style.getPropertyValue('--card-color')).to.equal('purple');

        document.body.removeChild(el);
      });

      it('tag style attribute and create() style option produce same inline styles', async () => {
        const { tag, CardEl } = defineCard();

        const tagEl = await mount<AeicoElement>(`<${tag} style="color: green; font-size: 16px;"></${tag}>`);
        await updated();

        const createEl = CardEl.create({ style: 'color: green; font-size: 16px;' });
        document.body.appendChild(createEl);
        await updated();

        expect(createEl.style.color).to.equal(tagEl.style.color);
        expect(createEl.style.fontSize).to.equal(tagEl.style.fontSize);

        document.body.removeChild(createEl);
      });
    });
  });
});
