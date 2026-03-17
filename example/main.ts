import { setComponentConfig } from '../src/core/configProvider'
import {
  InputField,
  CheckboxField,
  RadioField,
  RangeField,
  SelectField,
  Button,
  Alert,
  Modal,
} from '../src/components/index'

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

// Select options
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
