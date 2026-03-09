import AeicoElement from '../AeicoElement'
import modalStyles from '../assets/css/modal.css?inline'

export type ModalConfig = {
  title?: string
  width?: string
  height?: string
  closeOnOverlayClick?: boolean
  showCloseButton?: boolean
}

export type ModalProps = ModalConfig

class Modal extends AeicoElement {
  private overlay: HTMLElement | null = null
  private modalContainer: HTMLElement | null = null
  private titleElement: HTMLElement | null = null
  private closeBtn: HTMLElement | null = null
  private config: ModalConfig = {}

  protected static stylesheet: string = modalStyles

  constructor() {
    super()
    
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
  }

  connectedCallback() {
    super.connectedCallback()
    this.applyConfig()
    this.setupEventListeners()
    this.updateCloseButtonTitle()
  }

  /**
   * Handle language change from base class
   */
  protected onLanguageChange() {
    super.onLanguageChange()
    this.updateCloseButtonTitle()
  }

  static get observedAttributes() {
    return ['config']
  }

  attributeChangedCallback(name: string, _: string, newValue: string) {
    if (name === 'config' && newValue) {
      try {
        this.config = JSON.parse(newValue)
        this.applyConfig()
      } catch (error) {
        console.error('Failed to parse modal config:', error)
      }
    }
  }

  protected setProps(config: ModalConfig) {
    this.config = { ...this.config, ...config }
    this.applyConfig()
    
    return this
  }

  /**
   * Public method to apply props configuration
   * Called by AeicoElement.create()
   */
  applyProps(config: ModalConfig) {
    this.setProps(config)
  }

  applyConfig() {
    if (this.titleElement && this.config.title) {
      this.titleElement.textContent = this.config.title
    }
    
    if (this.modalContainer) {
      if (this.config.width) {
        this.modalContainer.style.width = this.config.width
      }
      if (this.config.height) {
        this.modalContainer.style.height = this.config.height
      }
    }
    
    if (this.closeBtn) {
      this.closeBtn.style.display = this.config.showCloseButton === false ? 'none' : 'flex'
    }
  }

  setupEventListeners() {
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target === this.overlay && this.config.closeOnOverlayClick !== false) {
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

  setTitle(title: string) {
    if (this.titleElement) {
      this.titleElement.textContent = title
    }
  }
}

Modal.register('app-modal')

export default Modal
