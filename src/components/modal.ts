import type { InferProps, Props } from '../core/types'
import { modalSpec } from '../assets/css/specs'
import AeicoComponent from './aeico-component'

class Modal extends AeicoComponent {
  static props: Props = {
    label: { type: String },
    width: { type: String },
    height: { type: String },
    closeOnOverlayClick: { type: Boolean },
    showCloseButton: { type: Boolean },
  }

  declare label?: string
  declare width?: string
  declare height?: string
  declare closeOnOverlayClick?: boolean
  declare showCloseButton?: boolean

  protected static stylesheets = [modalSpec]

  connectedCallback() {
    super.connectedCallback()
    
    document.addEventListener('keydown', this._handleKeyDown)
  }

  disconnectedCallback() {
    super.disconnectedCallback()
  
    document.removeEventListener('keydown', this._handleKeyDown)
  }

  protected render() {
    this.build(() => {
      const { div, h3, button, slot } = this.builder

      div({ 
        className: 'modal-overlay',
        onclick: (e: Event) => this._handleOverlayClick(e)
      }, () => {
        div({ 
          className: 'modal-container',
          style: { width: this.width || '', height: this.height || '' }
        }, () => {
          div({ className: 'modal-header' }, () => {
           h3({
              className: 'modal-title',
              textContent: this.label || ''
            })
            
            if (this.showCloseButton) {
              button({
                className: 'modal-close-btn',
                textContent: '×',
                title: this.t('buttons.cancel', 'Cancel'),
                onclick: () => this.close()
              })
            }
          })

          div({ className: 'modal-content' }, () => {
            slot()
          })
        })
      })
    })
  }

  private _handleOverlayClick(e: Event) {
    if (e.target === e.currentTarget && this.closeOnOverlayClick !== false) {
      this.close()
    }
  }

  private _handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape' && this.isOpen()) {
      this.close()
    }
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
export type ModalProps = InferProps<typeof Modal>
