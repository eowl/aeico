/**
 * eolic - simple web components kit
 * 
 * A lightweight library for building web components.
 * This is a placeholder version for package name reservation.
 */

/**
 * Create a custom web component
 * @param {string} name - Component name
 * @param {Object} options - Component options
 * @returns {Function} Component constructor
 */
function createComponent(name, options = {}) {
  return class extends HTMLElement {
    constructor() {
      super();
      this.options = options;
    }

    connectedCallback() {
      if (options.render) {
        options.render.call(this);
      }
    }
  };
}

/**
 * Register a custom element
 * @param {string} name - Element name (must contain a hyphen)
 * @param {Function} constructor - Custom element constructor
 */
function define(name, constructor) {
  if (customElements && !customElements.get(name)) {
    customElements.define(name, constructor);
  }
}

/**
 * Version info
 */
const version = '0.1.0';

// CommonJS exports
module.exports = {
  createComponent,
  define,
  version
};

// ES Module exports (for compatibility)
module.exports.default = module.exports;
