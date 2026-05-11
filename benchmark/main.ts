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
// Compare: OLD implementation — per-instance Object.defineProperty
// Mirrors the pre-optimization _defineReactiveProp path. All 3 props have
// reflect:false so the setter only writes the backing store (no setAttribute).
// ---------------------------------------------------------------------------

class OldBenchRow extends HTMLElement {
  _reflecting = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })
    for (const propName of ['rowId', 'label', 'selected']) {
      const internalKey = `_${propName}`
      const self = this as unknown as Record<string, unknown>
      self[internalKey] = undefined
      // ← This is the OLD per-instance defineProperty path (3× per constructor call)
      Object.defineProperty(this, propName, {
        get: () => self[internalKey],
        set: (value: unknown) => { self[internalKey] = value },
        enumerable: true,
        configurable: true,
      })
    }
  }

  declare rowId?: number
  declare label?: string
  declare selected?: boolean
}
customElements.define('compare-row-old', OldBenchRow)

// ---------------------------------------------------------------------------
// Compare: NEW implementation — prototype-level accessor (one-time per class)
// Structurally identical to OldBenchRow; only difference is WHERE defineProperty
// is called: once on the prototype vs once per instance.
// ---------------------------------------------------------------------------

const COMPARE_PROPS = ['rowId', 'label', 'selected'] as const

class NewBenchRowCompare extends HTMLElement {
  private static _ready = false

  constructor() {
    super()
    this.attachShadow({ mode: 'open' })

    // Install accessors on the prototype exactly once across all instances
    if (!NewBenchRowCompare._ready) {
      NewBenchRowCompare._ready = true
      for (const propName of COMPARE_PROPS) {
        const internalKey = `_${propName}`
        Object.defineProperty(NewBenchRowCompare.prototype, propName, {
          get(this: NewBenchRowCompare) {
            return (this as unknown as Record<string, unknown>)[internalKey]
          },
          set(this: NewBenchRowCompare, value: unknown) {
            ;(this as unknown as Record<string, unknown>)[internalKey] = value
          },
          enumerable: true,
          configurable: true,
        })
      }
    }

    // Per-instance: only initialize backing stores (no defineProperty)
    const self = this as unknown as Record<string, unknown>
    self['_rowId'] = undefined
    self['_label'] = undefined
    self['_selected'] = undefined
  }

  declare rowId?: number
  declare label?: string
  declare selected?: boolean
}
customElements.define('compare-row-new', NewBenchRowCompare)

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

  // Measures the cost of constructing + writing initial props WITHOUT mounting to DOM or rendering.
  // This directly isolates the _initializeProps / accessor-definition path.
  'instantiation only (no mount)': async () => {
    const data = buildData(COUNT)
    return [
      await bench('Native createElement ×1000', () => {
        for (const d of data) {
          const el = document.createElement('div')
          el.dataset['rowId'] = String(d.id)
          el.dataset['label'] = d.label
        }
      }),
      await bench('AeicoBase createElement ×1000', () => {
        for (const d of data) {
          const el = document.createElement('bench-row') as BenchRow
          el.rowId = d.id
          el.label = d.label
        }
      }),
    ]
  },

  // Measures accessor read speed: 1000 elements × 100 reads each = 100 000 property reads.
  'prop read tight loop': async () => {
    const seed = buildData(COUNT)
    const nativeEls: HTMLElement[] = []
    const aeicoEls: BenchRow[] = []
    for (const d of seed) {
      const n = document.createElement('div')
      n.dataset['label'] = d.label
      nativeEls.push(n)
      const a = document.createElement('bench-row') as BenchRow
      a.label = d.label
      aeicoEls.push(a)
    }
    const READS = 100
    return [
      await bench(`Native dataset read ×${COUNT * READS}`, () => {
        let s = ''
        for (let r = 0; r < READS; r++)
          for (const el of nativeEls) s = el.dataset['label']!
        void s
      }),
      await bench(`AeicoBase prop read ×${COUNT * READS}`, () => {
        let s = ''
        for (let r = 0; r < READS; r++)
          for (const el of aeicoEls) s = el.label!
        void s
      }),
    ]
  },
}

// ---------------------------------------------------------------------------
// Compare runner
// ---------------------------------------------------------------------------

const COMPARE_COUNT = 1000

async function runCompare() {
  const compareProgress = document.getElementById('compare-progress')!
  const compareOutput   = document.getElementById('compare-output')!

  compareProgress.textContent = 'Warming up…'
  compareOutput.textContent   = ''

  const oldResult = await bench(`OLD  per-instance defineProperty ×${COMPARE_COUNT}`, () => {
    for (let i = 0; i < COMPARE_COUNT; i++) {
      const el = document.createElement('compare-row-old') as OldBenchRow
      el.rowId = i
      el.label = 'bench'
    }
  }, { warmup: 5, runs: 30 })

  compareProgress.textContent = 'Running NEW…'

  const newResult = await bench(`NEW  prototype accessor ×${COMPARE_COUNT}`, () => {
    for (let i = 0; i < COMPARE_COUNT; i++) {
      const el = document.createElement('compare-row-new') as NewBenchRowCompare
      el.rowId = i
      el.label = 'bench'
    }
  }, { warmup: 5, runs: 30 })

  const fmtMs  = (n: number) => `${n.toFixed(3)}ms`
  const fmtRow = (r: Result) =>
    `  ${r.name.padEnd(48)}  mean ${fmtMs(r.mean).padStart(9)}  min ${fmtMs(r.min).padStart(9)}  ±${fmtMs(r.stddev)}\n`

  const speedup = (oldResult.mean / newResult.mean).toFixed(2)
  const pct     = ((1 - newResult.mean / oldResult.mean) * 100).toFixed(1)

  compareOutput.textContent =
    `── Construction cost (×${COMPARE_COUNT} elements, 30 runs, no DOM mount) ──────────\n\n` +
    fmtRow(oldResult) +
    fmtRow(newResult) +
    `\n  Speedup: ${speedup}×  —  prototype accessor is ${pct}% faster\n`

  compareProgress.textContent = 'Done.'
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

document.getElementById('btn-run-compare')!.addEventListener('click', runCompare)
