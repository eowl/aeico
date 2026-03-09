# eolic

> A simple web components kit

[![npm version](https://img.shields.io/npm/v/eolic.svg)](https://www.npmjs.com/package/eolic)
[![license](https://img.shields.io/npm/l/eolic.svg)](https://github.com/eowl/eolic/blob/main/LICENSE)

## ⚠️ Work in Progress

This is an early placeholder version for package name reservation. Full functionality will be implemented in future releases.

## Installation

```bash
npm install eolic
```

## Usage

```javascript
const { createComponent, define } = require('eolic');

// Create a custom component
const MyComponent = createComponent('my-component', {
  render() {
    this.innerHTML = '<p>Hello from eolic!</p>';
  }
});

// Register the component
define('my-component', MyComponent);
```

## API

### `createComponent(name, options)`

Create a custom web component.

- **name**: Component name
- **options**: Component options
  - **render**: Render function called when component is connected

Returns a custom element constructor.

### `define(name, constructor)`

Register a custom element.

- **name**: Element name (must contain a hyphen)
- **constructor**: Custom element constructor

### `version`

Current version string.

## Roadmap

- [ ] Enhanced component lifecycle hooks
- [ ] Built-in state management
- [ ] Component composition utilities
- [ ] TypeScript support
- [ ] Comprehensive documentation

## License

ISC © [eowl](https://github.com/eowl)

## Contributing

This project is in early development. Contributions are welcome once the core API is established.

## Repository

[https://github.com/eowl/eolic](https://github.com/eowl/eolic)
