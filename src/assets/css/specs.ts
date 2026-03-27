/**
 * Preset StyleSpec definitions for all built-in aeico components.
 *
 * Each spec declares:
 *  - id:    unique identifier for deduplication
 *  - code:  raw CSS text (via ?inline import)
 *  - scope: 'document' (CSS custom properties) or 'shadow' (selector rules)
 *  - deps:  other specs that must be resolved first
 *
 * Components reference these instead of raw CSS strings so that the
 * StyleAdapter can automatically push document-scoped deps (e.g. variables)
 * to document.adoptedStyleSheets without any external configuration.
 */

import variablesCss from './common/variables.css?inline'
import rangeFieldCss from './range-field.css?inline'
import radioFieldCss from './radio-field.css?inline'
import selectFieldCss from './select-field.css?inline'
import inputFieldCss from './input-field.css?inline'
import checkboxFieldCss from './checkbox-field.css?inline'
import checkboxCss from './components/checkbox.css?inline'
import modalCss from './modal.css?inline'

import type { StyleSpec } from '../../core/types'

export const variablesSpec: StyleSpec = {
  id: 'aeico:variables',
  code: variablesCss,
  scope: 'document',
  deps: []
}

export const rangeFieldSpec: StyleSpec = {
  id: 'aeico:range-field',
  code: rangeFieldCss,
  scope: 'shadow',
  deps: [variablesSpec]
}

export const radioFieldSpec: StyleSpec = {
  id: 'aeico:radio-field',
  code: radioFieldCss,
  scope: 'shadow',
  deps: [variablesSpec]
}

export const selectFieldSpec: StyleSpec = {
  id: 'aeico:select-field',
  code: selectFieldCss,
  scope: 'shadow',
  deps: [variablesSpec]
}

export const inputFieldSpec: StyleSpec = {
  id: 'aeico:input-field',
  code: inputFieldCss,
  scope: 'shadow',
  deps: [variablesSpec]
}

export const checkboxFieldSpec: StyleSpec = {
  id: 'aeico:checkbox-field',
  code: checkboxFieldCss,
  scope: 'shadow',
  deps: [variablesSpec]
}

export const checkboxSpec: StyleSpec = {
  id: 'aeico:checkbox',
  code: checkboxCss,
  scope: 'shadow',
  deps: [variablesSpec]
}

export const modalSpec: StyleSpec = {
  id: 'aeico:modal',
  code: modalCss,
  scope: 'shadow',
  deps: [variablesSpec]
}
