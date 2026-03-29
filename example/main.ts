import { setComponentConfig } from '../src/core/config-provider'
import {
  InputField,
  CheckboxField,
  RadioField,
  RangeField,
  SelectField,
  Select,
  Slider,
  Checkbox,
  RadioGroup,
  Button,
  ButtonGroup,
  Alert,
  Modal,
  Icon,
  IconRegistry,
  IconButton,
} from '../src/components/index'
import { locale } from '../src/localize'

// --- Localization setup ---

type LocaleData = { [key: string]: string | LocaleData }

const LOCALES: Record<string, LocaleData> = {
  en: {
    buttons: {
      reset: 'Reset',
      clear: 'Clear',
      cancel: 'Cancel',
    },
    alert: {
      close: 'Close alert',
    },
  },
  zh: {
    buttons: {
      reset: '重置',
      clear: '清除',
      cancel: '取消',
    },
    alert: {
      close: '关闭提示',
    },
  },
}

const SUPPORTED_LANGS = ['en', 'zh'] as const
type SupportedLang = typeof SUPPORTED_LANGS[number]

function detectLang(): SupportedLang {
  const sysLang = navigator.language || ''
  if (sysLang.startsWith('zh')) return 'zh'
  return 'en'
}

let currentLang = detectLang()
locale.update(currentLang, LOCALES[currentLang])

// Global config
setComponentConfig({
  enableComponentStylesheets: true,
  preloadStyles: ['variables', 'base', 'form-controls', 'button', 'dialog', 'alert'],
})

// Register icons
IconRegistry.add({
  'home':    'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
  'check':   'M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z',
  'close':   'M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z',
  'info':    'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z',
  'warning': 'M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z',
  'star':    'M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z',
  'settings':'M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z',
  'heart':   'M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z',
})

Icon.register('ae-icon')
IconButton.register('ae-icon-button')

// Register all components
InputField.register()
CheckboxField.register()
RadioField.register()
RangeField.register()
SelectField.register()
Select.register()
Slider.register('ae-slider')
Checkbox.register('ae-cb')
RadioGroup.register('ae-radio-group')
// Button, Alert, Modal auto-register on import

// --- Set up dynamic data ---

// Radio options
const radioOptions = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]

document.querySelectorAll<any>('ae-radio').forEach(el => {
  el.options = radioOptions
  el.value = 'a'
})

// SelectField

// Slot Mode (HTML)

const selectSlotEl = document.querySelector<any>('#select-slot')
if (selectSlotEl) {
  selectSlotEl.value = 'banana' // 仍可通过 JS 设置 value
}

// Attribute Mode（JS Method）
const selectEl = document.querySelector<any>('#select-default')
if (selectEl) {
  selectEl.options = [
    { label: 'Apple', value: 'apple' },
    { label: 'Banana', value: 'banana' },
    { label: 'Cherry', value: 'cherry' },
    { label: 'Grape', value: 'grape' },
  ]
  selectEl.value = 'banana'
}

// Slider — options mode demos

// RadioGroup demos
const rgDemoOptions = [
  { label: 'Option A', value: 'a' },
  { label: 'Option B', value: 'b' },
  { label: 'Option C', value: 'c' },
]
document.querySelectorAll<any>('.rg-opts-demo').forEach(el => {
  el.options = rgDemoOptions
})
const rgDefaultOpts = document.querySelector<any>('#rg-default-opts')
if (rgDefaultOpts) rgDefaultOpts.options = rgDemoOptions
const rgButtonOpts = document.querySelector<any>('#rg-button-opts')
if (rgButtonOpts) rgButtonOpts.options = rgDemoOptions
const rgButtonGroupOpts = document.querySelector<any>('#rg-button-group-opts')
if (rgButtonGroupOpts) rgButtonGroupOpts.options = rgDemoOptions
const rgSegmentedOpts = document.querySelector<any>('#rg-segmented-opts')
if (rgSegmentedOpts) rgSegmentedOpts.options = rgDemoOptions

// Slider — options mode demos
const sliderOptsNumeric = document.querySelector<any>('#slider-opts-numeric')
if (sliderOptsNumeric) {
  sliderOptsNumeric.options = [0, 25, 50, 75, 100]
  sliderOptsNumeric.value = '50'
}

const sliderOptsLabeled = document.querySelector<any>('#slider-opts-labeled')
if (sliderOptsLabeled) {
  sliderOptsLabeled.options = [
    { label: 'XS', value: 'xs' },
    { label: 'SM', value: 'sm' },
    { label: 'MD', value: 'md' },
    { label: 'LG', value: 'lg' },
    { label: 'XL', value: 'xl' },
  ]
  sliderOptsLabeled.value = 'md'
}

const sliderOptsInput = document.querySelector<any>('#slider-opts-input')
if (sliderOptsInput) {
  sliderOptsInput.options = [10, 20, 30, 40, 50]
  sliderOptsInput.value = '20'
}

const sliderMarksLabeled = document.querySelector<any>('#slider-marks-labeled')
if (sliderMarksLabeled) {
  sliderMarksLabeled.options = [
    { label: 'XS', value: 'xs' },
    { label: 'SM', value: 'sm' },
    { label: 'MD', value: 'md' },
    { label: 'LG', value: 'lg' },
    { label: 'XL', value: 'xl' },
  ]
  sliderMarksLabeled.value = 'md'
}

const sliderMarksNumeric = document.querySelector<any>('#slider-marks-numeric')
if (sliderMarksNumeric) {
  sliderMarksNumeric.options = [0, 25, 50, 75, 100]
  sliderMarksNumeric.value = '50'
}

// Modal interaction
const openBtn = document.getElementById('open-modal-btn')
const modal = document.querySelector<any>('#demo-modal')
openBtn?.addEventListener('click', () => modal?.open())

// --- Event logging ---
const log = document.getElementById('event-log')!
const clearBtn = document.getElementById('clear-log')!

function appendLog(msg: string) {
  const line = document.createElement('div')
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`
  log.prepend(line)
  // Keep max 50 lines
  while (log.children.length > 50) log.lastChild?.remove()
}

clearBtn.addEventListener('click', () => { log.innerHTML = '' })

// Listen for component events on body (they bubble)
const events = ['field-change', 'field-reset', 'field-clear', 'button-click', 'alert-close', 'modal-open', 'modal-close']
events.forEach(eventName => {
  document.body.addEventListener(eventName, ((e: CustomEvent) => {
    const tag = (e.target as HTMLElement).tagName.toLowerCase()
    let detail = ''
    try {
      if (e.detail) {
        // Filter out DOM element references before stringifying
        const safe = Object.fromEntries(
          Object.entries(e.detail).filter(([, v]) => !(v instanceof HTMLElement))
        )
        detail = Object.keys(safe).length ? JSON.stringify(safe) : ''
      }
    } catch { /* ignore */ }
    appendLog(`${tag} → ${eventName}${detail ? ' ' + detail : ''}`)
  }) as EventListener)
})

// --- Language switching ---

function syncLangButtons() {
  const enBtn = document.getElementById('lang-en')
  const zhBtn = document.getElementById('lang-zh')
  if (enBtn) enBtn.setAttribute('color', currentLang === 'en' ? 'primary' : 'default')
  if (zhBtn) zhBtn.setAttribute('color', currentLang === 'zh' ? 'primary' : 'default')
}

function switchLang(lang: SupportedLang) {
  if (lang === currentLang) return
  currentLang = lang
  locale.update(lang, LOCALES[lang])
  syncLangButtons()
  appendLog(`language switched → ${lang}`)
}

document.getElementById('lang-en')?.addEventListener('click', () => switchLang('en'))
document.getElementById('lang-zh')?.addEventListener('click', () => switchLang('zh'))

// Init button states after DOM is ready
syncLangButtons()
