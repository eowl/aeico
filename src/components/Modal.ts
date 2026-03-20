import type { InferProperties, Props, Watchers } from '../core/types'
import { modalSpec } from '../assets/css/specs'
import AeicoComponent from './AeicoComponent'

class Modal extends AeicoComponent {
  private overlay: HTMLElement | null = null
  private modalContainer: HTMLElement | null = null
  private titleElement: HTMLElement | null = null
  private closeBtn: HTMLElement | null = null

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

  connectedCallback() {
    super.connectedCallback()
    this.render()
    this.setupEventListeners()
  }

  protected render() {
    if (this.overlay) return

    this.draw(() => {
      const { div, h3, button, slot } = this.tags

      this.overlay = div({ 
        className: 'modal-overlay',
        onclick: (e: Event) => {
          if (e.target === this.overlay && this.closeOnOverlayClick !== false) {
            this.close()
          }
        }
      }, () => {
        this.modalContainer = div({ className: 'modal-container' }, () => {
          div({ className: 'modal-header' }, () => {
            this.titleElement = h3({ className: 'modal-title' })
            
            this.closeBtn = button({
              className: 'modal-close-btn',
              textContent: '×',
              onclick: () => this.close()
            })
          })

          div({ className: 'modal-content' }, () => {
            slot()
          })
        })
      })
    })

    if (this.label) this.onLabelChanged(this.label)
    if (this.width) this.onWidthChanged(this.width)
    if (this.height) this.onHeightChanged(this.height)
    if (this.showCloseButton !== undefined) this.onShowCloseButtonChanged(this.showCloseButton)

    this.updateCloseButtonTitle()
  }

  setupEventListeners() {
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

  public onLanguageChange() {
    super.onLanguageChange()
    this.updateCloseButtonTitle()
  }

  open() {
    this.style.display = 'block'
    this.emit('open', { target: this })
  }

  close() {
    this.style.display = 'none'
    this.emit('close', { target: this })
  }

  isOpen(): boolean {
    return this.style.display === 'block'
  }
}

Modal.register()

export default Modal
export type ModalProps = InferProperties<typeof Modal>
