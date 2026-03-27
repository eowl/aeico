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
  Button,
  ButtonGroup,
  Alert,
  Modal,
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

// Register all components
InputField.register()
CheckboxField.register()
RadioField.register()
RangeField.register()
SelectField.register()
Select.register()
Slider.register('ae-slider')
Checkbox.register('ae-cb')
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
