import type { InferProperties, Props, Watchers } from '../core/types'
import { modalSpec } from '../assets/css/specs'
import AeicoComponent from './AeicoComponent'

/**
 * Base class with theme and i18n support
 */

class Modal extends AeicoComponent {
  private overlay: HTMLElement | null = null
  private modalContainer: HTMLElement | null = null
  private titleElement: HTMLElement | null = null
  private closeBtn: HTMLElement | null = null

  static tagName = 'modal'

  static properties: Props = {
    label: { type: String },
    width: { type: String },
    height: { type: String },
    closeOnOverlayClick: { type: Boolean },
    showCloseButton: { type: Boolean },
  }

  static watchers: Watchers = {
    label: 'onLabelChanged',
    width: 'onWidthChanged',
    height: 'onHeightChanged',
    showCloseButton: 'onShowCloseButtonChanged',
  }

  declare label?: string
  declare width?: string
  declare height?: string
  declare closeOnOverlayClick?: boolean
  declare showCloseButton?: boolean

  protected static stylesheets = [modalSpec]

  protected onLabelChanged(label: string): void {
    if (this.titleElement) {
      this.titleElement.textContent = label || ''
    }
  }

  protected onWidthChanged(width: string): void {
    if (this.modalContainer) {
      this.modalContainer.style.width = width || ''
    }
  }

  protected onHeightChanged(height: string): void {
    if (this.modalContainer) {
      this.modalContainer.style.height = height || ''
    }
  }

  protected onShowCloseButtonChanged(show: boolean): void {
    if (this.closeBtn) {
      this.closeBtn.style.display = show === false ? 'none' : 'flex'
    }
  }

  render() {
    if (this.overlay) return

    this.shadowRoot!.innerHTML = ''

    const template = document.createElement('template')
    template.innerHTML = `
      <div class="modal-overlay">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title"></h3>
            <button class="modal-close-btn" title="">×</button>
          </div>
          <div class="modal-content">
            <slot></slot>
          </div>
        </div>
      </div>
    `

    this.shadowRoot!.appendChild(template.content.cloneNode(true))
    
    this.overlay = this.shadowRoot!.querySelector('.modal-overlay')
    this.modalContainer = this.shadowRoot!.querySelector('.modal-container')
    this.titleElement = this.shadowRoot!.querySelector('.modal-title')
    this.closeBtn = this.shadowRoot!.querySelector('.modal-close-btn')

    // Apply initial property values
    if (this.label) this.onLabelChanged(this.label)
    if (this.width) this.onWidthChanged(this.width)
    if (this.height) this.onHeightChanged(this.height)
    if (this.showCloseButton !== undefined) this.onShowCloseButtonChanged(this.showCloseButton)

    this.setupEventListeners()
    this.updateCloseButtonTitle()
  }

  connectedCallback() {
    super.connectedCallback()
    this.render()
  }

  /**
   * Handle language change from base class
   */
  public onLanguageChange() {
    super.onLanguageChange()
    this.updateCloseButtonTitle()
  }

  setupEventListeners() {
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay && this.closeOnOverlayClick !== false) {
          this.close()
        }
      })
    }
    
    if (this.closeBtn) {
      this.closeBtn.addEventListener('click', () => {
        this.close()
      })
    }
    
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close()
      }
    })
  }

  updateCloseButtonTitle() {
    if (this.closeBtn) {
      this.closeBtn.title = this.t('buttons.cancel', 'Cancel')
    }
  }

  open() {
    this.style.display = 'block'
    this.dispatchEvent(new CustomEvent('modal-open', { bubbles: true, composed: true }))
  }

  close() {
    this.style.display = 'none'
    this.dispatchEvent(new CustomEvent('modal-close', { bubbles: true, composed: true }))
  }

  isOpen(): boolean {
    return this.style.display === 'block'
  }

  setLabel(label: string) {
    this.label = label
  }
}

Modal.register()

export default Modal
export type ModalProps = InferProperties<typeof Modal>
