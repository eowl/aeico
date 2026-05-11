import { AeicoBase } from 'aeico'
import { html } from 'aeico-view'

// ---------------------------------------------------------------------------
// Data helpers — same word lists as js-framework-benchmark
// ---------------------------------------------------------------------------

const ADJECTIVES = ['pretty','large','big','small','tall','short','long','handsome',
  'plain','quaint','clean','elegant','easy','angry','crazy','helpful','mushy','odd',
  'unsightly','adorable','important','inexpensive','cheap','expensive','fancy']
const COLOURS = ['red','yellow','blue','green','pink','brown','white','black','orange']
const NOUNS = ['table','chair','house','bbq','desk','car','pony','cookie',
  'sandwich','burger','pizza','mouse','keyboard']

let _nextId = 1

interface RowData { id: number; label: string }

function rnd(max: number) { return Math.round(Math.random() * 1000) % max }
function buildData(count: number): RowData[] {
  return Array.from({ length: count }, () => ({
    id: _nextId++,
    label: `${ADJECTIVES[rnd(ADJECTIVES.length)]} ${COLOURS[rnd(COLOURS.length)]} ${NOUNS[rnd(NOUNS.length)]}`,
  }))
}

// ---------------------------------------------------------------------------
// Component — mirrors benchmark row: id + label + delete button
// AeicoBase (no adoptedStyleSheets) for fairness with other WC impls
// ---------------------------------------------------------------------------

class BenchRow extends AeicoBase {
  static override props = {
    ...AeicoBase.props,
    rowId:    { type: Number, reflect: false, observe: false },
    label:    { type: String, reflect: false },
    selected: { type: Boolean, reflect: false },
  }
  declare rowId?:    number
  declare label?:    string
  declare selected?: boolean

  override render() {
    return html(({ span, button }) => {
      span({ text: String(this.rowId ?? '') })
      span({ className: this.selected ? 'lbl selected' : 'lbl', text: this.label ?? '' })
      button({ text: '✕' })
    })
  }
}
customElements.define('bench-row', BenchRow)

// ---------------------------------------------------------------------------
// Native-DOM baseline — same structure (div > span + span + button)
// ---------------------------------------------------------------------------

function createNativeRow(d: RowData): HTMLElement {
  const el  = document.createElement('div')
  const id  = document.createElement('span')
  const lbl = document.createElement('span')
  const btn = document.createElement('button')
  id.textContent  = String(d.id)
  lbl.textContent = d.label
  lbl.className   = 'lbl'
  btn.textContent = '✕'
  el.append(id, lbl, btn)
  return el
}

// ---------------------------------------------------------------------------
// Measurement utilities
// ---------------------------------------------------------------------------

const flushMicrotasks = (): Promise<void> => new Promise(r => setTimeout(r, 0))

interface Result {
  name: string; mean: number; min: number; max: number; stddev: number
}

async function bench(
  name: string,
  fn: () => Promise<void> | void,
  opts: { warmup?: number; runs?: number; setup?: () => Promise<void> | void } = {}
): Promise<Result> {
  const { warmup = 3, runs = 8, setup } = opts
  const samples: number[] = []
  for (let i = 0; i < warmup + runs; i++) {
    if (setup) await setup()
    const t0 = performance.now()
    await fn()
    samples.push(performance.now() - t0)
  }
  const measured = samples.slice(warmup)
  const mean = measured.reduce((a, b) => a + b, 0) / measured.length
  const min  = Math.min(...measured)
  const max  = Math.max(...measured)
  const sd   = Math.sqrt(measured.reduce((a, b) => a + (b - mean) ** 2, 0) / measured.length)
  return { name, mean, min, max, stddev: sd }
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

const COUNT = 1000
const container = document.getElementById('container')!

let nativeRows: HTMLElement[] = []
let nativeData: RowData[] = []
let aeicoRows: BenchRow[] = []
let aeicoData: RowData[] = []

function nativeClear() {
  container.innerHTML = ''
  nativeRows = []; nativeData = []
}

function nativeCreate(data: RowData[]) {
  const frag = document.createDocumentFragment()
  nativeRows = data.map(d => { const el = createNativeRow(d); frag.appendChild(el); return el })
  nativeData = data
  container.appendChild(frag)
}

function aeicoClear() {
  container.innerHTML = ''
  aeicoRows = []; aeicoData = []
}

async function aeicoCreate(data: RowData[]) {
  const frag = document.createDocumentFragment()
  aeicoRows = data.map(d => {
    const el = document.createElement('bench-row') as BenchRow
    el.rowId = d.id; el.label = d.label
    frag.appendChild(el); return el
  })
  aeicoData = data
  container.appendChild(frag)
  await flushMicrotasks()
}

// ---------------------------------------------------------------------------
// Suites — matching js-framework-benchmark scenarios
// ---------------------------------------------------------------------------

type SuiteFn = () => Promise<Result[]>

const suites: Record<string, SuiteFn> = {

  'create rows': async () => [
    await bench('Native ×1000', async () => {
      nativeCreate(buildData(COUNT))
    }, { setup: nativeClear }),
    await bench('AeicoBase ×1000', async () => {
      await aeicoCreate(buildData(COUNT))
    }, { setup: aeicoClear }),
  ],

  'replace all rows': async () => {
    const seed = buildData(COUNT)
    return [
      await bench('Native replace ×1000', async () => {
        nativeClear(); nativeCreate(buildData(COUNT))
      }, { setup: async () => { nativeClear(); nativeCreate(seed.map(d => ({ ...d }))) } }),
      await bench('AeicoBase replace ×1000', async () => {
        aeicoClear(); await aeicoCreate(buildData(COUNT))
      }, { setup: async () => { aeicoClear(); await aeicoCreate(seed.map(d => ({ ...d }))) } }),
    ]
  },

  'partial update': async () => {
    const seed = buildData(COUNT)
    return [
      await bench('Native partial (every 10th)', async () => {
        for (let i = 0; i < nativeRows.length; i += 10) {
          nativeData[i].label += ' !!!'
          nativeRows[i].querySelector<HTMLSpanElement>('.lbl')!.textContent = nativeData[i].label
        }
      }, { setup: async () => { nativeClear(); nativeCreate(seed.map(d => ({ ...d }))) } }),
      await bench('AeicoBase partial (every 10th)', async () => {
        for (let i = 0; i < aeicoRows.length; i += 10) {
          aeicoData[i].label += ' !!!'
          aeicoRows[i].label = aeicoData[i].label
        }
        await flushMicrotasks()
      }, { setup: async () => { aeicoClear(); await aeicoCreate(seed.map(d => ({ ...d }))) } }),
    ]
  },

  'select row': async () => {
    const seed = buildData(COUNT)
    let nSel = -1, aSel = -1
    return [
      await bench('Native select row', () => {
        if (nSel >= 0) nativeRows[nSel].querySelector<HTMLSpanElement>('.lbl')!.className = 'lbl'
        nSel = 499
        nativeRows[nSel].querySelector<HTMLSpanElement>('.lbl')!.className = 'lbl selected'
      }, { setup: async () => { nativeClear(); nativeCreate(seed.slice()); nSel = -1 } }),
      await bench('AeicoBase select row', async () => {
        if (aSel >= 0) aeicoRows[aSel].selected = false
        aSel = 499; aeicoRows[aSel].selected = true
        await flushMicrotasks()
      }, { setup: async () => { aeicoClear(); await aeicoCreate(seed.slice()); aSel = -1 } }),
    ]
  },

  'swap rows': async () => {
    const seed = buildData(COUNT)
    return [
      await bench('Native swap rows', () => {
        const r1 = nativeRows[1], r998 = nativeRows[998]
        const next = r998.nextSibling
        container.insertBefore(r998, r1)
        container.insertBefore(r1, next)
        ;[nativeRows[1], nativeRows[998]] = [nativeRows[998], nativeRows[1]]
      }, { setup: async () => { nativeClear(); nativeCreate(seed.slice()) } }),
      await bench('AeicoBase swap rows', async () => {
        const r1 = aeicoRows[1], r998 = aeicoRows[998]
        const next = r998.nextSibling
        container.insertBefore(r998, r1)
        container.insertBefore(r1, next)
        ;[aeicoRows[1], aeicoRows[998]] = [aeicoRows[998], aeicoRows[1]]
        await flushMicrotasks()
      }, { setup: async () => { aeicoClear(); await aeicoCreate(seed.slice()) } }),
    ]
  },

  'remove row': async () => {
    const seed = buildData(COUNT)
    return [
      await bench('Native remove row', () => {
        nativeRows[499].remove(); nativeRows.splice(499, 1); nativeData.splice(499, 1)
      }, { setup: async () => { nativeClear(); nativeCreate(seed.slice()) } }),
      await bench('AeicoBase remove row', async () => {
        aeicoRows[499].remove(); aeicoRows.splice(499, 1); aeicoData.splice(499, 1)
        await flushMicrotasks()
      }, { setup: async () => { aeicoClear(); await aeicoCreate(seed.slice()) } }),
    ]
  },

  'create many rows': async () => [
    await bench('Native ×10000', async () => {
      nativeCreate(buildData(10000))
    }, { setup: nativeClear, warmup: 2, runs: 5 }),
    await bench('AeicoBase ×10000', async () => {
      await aeicoCreate(buildData(10000))
    }, { setup: aeicoClear, warmup: 2, runs: 5 }),
  ],

  'append rows': async () => {
    const seed = buildData(COUNT)
    return [
      await bench('Native append 1000→2000', async () => {
        const frag = document.createDocumentFragment()
        const extra = buildData(COUNT)
        extra.forEach(d => { const el = createNativeRow(d); frag.appendChild(el); nativeRows.push(el) })
        nativeData.push(...extra)
        container.appendChild(frag)
      }, { setup: async () => { nativeClear(); nativeCreate(seed.slice()) } }),
      await bench('AeicoBase append 1000→2000', async () => {
        const frag = document.createDocumentFragment()
        const extra = buildData(COUNT)
        for (const d of extra) {
          const el = document.createElement('bench-row') as BenchRow
          el.rowId = d.id; el.label = d.label
          frag.appendChild(el); aeicoRows.push(el)
        }
        aeicoData.push(...extra)
        container.appendChild(frag)
        await flushMicrotasks()
      }, { setup: async () => { aeicoClear(); await aeicoCreate(seed.slice()) } }),
    ]
  },

  'clear rows': async () => {
    const seed = buildData(COUNT)
    return [
      await bench('Native clear ×1000', () => { nativeClear() },
        { setup: async () => { nativeClear(); nativeCreate(seed.slice()) } }),
      await bench('AeicoBase clear ×1000', async () => { aeicoClear(); await flushMicrotasks() },
        { setup: async () => { aeicoClear(); await aeicoCreate(seed.slice()) } }),
    ]
  },
}

// ---------------------------------------------------------------------------
// UI
// ---------------------------------------------------------------------------

const output   = document.getElementById('output')!
const progress = document.getElementById('progress')!

function fmt(r: Result): string {
  return `  ${r.name}\n    mean ${r.mean.toFixed(2)}ms  min ${r.min.toFixed(2)}ms  max ${r.max.toFixed(2)}ms  ±${r.stddev.toFixed(2)}ms\n`
}

async function runSuite(name: string) {
  progress.textContent = `Running "${name}"…`
  output.textContent += `\n── ${name} ──\n`
  try {
    const results = await suites[name]()
    for (const r of results) output.textContent += fmt(r)
  } catch (e) {
    output.textContent += `  ERROR: ${e}\n`
  }
  progress.textContent = 'Done.'
}

async function runAll() {
  output.textContent = ''
  progress.textContent = 'Starting…'
  for (const name of Object.keys(suites)) await runSuite(name)
  progress.textContent = 'All suites done.'
}

document.getElementById('btn-run-all')!.addEventListener('click', runAll)
for (const name of Object.keys(suites)) {
  document.getElementById(`btn-suite-${name}`)?.addEventListener('click', () => runSuite(name))
}
