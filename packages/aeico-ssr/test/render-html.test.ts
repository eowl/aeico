import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { html } from 'aeico-view';
import { renderHtml } from 'aeico-ssr';

describe('renderHtml', () => {
  test('produces expected HTML', () => {
    const result = html(({ div, span }: any) => {
      div({ className: 'wrap' }, () => {
        span({ text: 'SSR' });
      });
    });
    assert.equal(renderHtml(result), '<div class="wrap"><span>SSR</span></div>');
  });

  test('strips events', () => {
    const result = html(({ button }: any) => {
      button({ '@click': () => {}, text: 'go' });
    });
    assert.equal(renderHtml(result), '<button>go</button>');
  });
});
