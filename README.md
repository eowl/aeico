# Aeico

AEICO(Advanced Element Interface for Component Objects)
Lightweight Web Components library for building form fields and UI elements.

## Installation

```bash
# npm
npm install aeico

# yarn
yarn add aeico

# pnpm
pnpm add aeico
```

## Quick Start

```typescript
import { setComponentConfig, SelectField, TextInput } from 'aeico'

// Configure global settings
setComponentConfig({
  theme: 'dark',
  enableI18n: true,
  i18nService: {
    t: (key) => translations[key],
    subscribe: (callback) => { /* ... */ }
  }
})

// Use components
const select = document.createElement('select-field')
select.setAttribute('value', 'option1')
select.setAttribute('options', JSON.stringify(['option1', 'option2']))
document.body.appendChild(select)
```

## Components

### AeicoElement

Base class for all Aeico components. Provides:
- Props system with type inference
- Event system with custom prefixes
- Stylesheet management
- i18n integration

### AeicoField

Base class for form field components. Extends `AeicoElement` with:
- Value management
- Reset/Clear functionality
- Change event handling
- Field-specific styling

### Form Fields

- **SelectField**: Dropdown select with options
- **TextInput**: Text input with placeholder
- **RangeField**: Range slider with value display
- **CheckboxField**: Checkbox/toggle with variants

## API Documentation

### Configuration

```typescript
setComponentConfig({
  theme?: 'dark' | 'light',
  enableI18n?: boolean,
  i18nService?: {
    t: (key: string) => string,
    subscribe: (callback: () => void) => () => void
  }
})
```

### Component Props

All components support:
- `value`: Current value
- `defaultValue`: Initial value for reset
- `disabled`: Disable state
- `resettable`: Show reset button
- `clearable`: Show clear button
- `size`: Size variant ('sm' | 'md' | 'lg')
- `theme`: Theme override

### Events

All field components emit:
- `field-change`: Value changed
- `field-reset`: Reset to default
- `field-clear`: Cleared

## License

ISC
