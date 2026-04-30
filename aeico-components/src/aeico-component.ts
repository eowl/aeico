import AeicoElement from '../core/aeico-element'
import { Themeable, type ThemeableProps } from '../mixins/themeable'
import { compose, Constructor } from '../mixins/compose'
import { toKebab } from '../core/utils'

const BaseComponent = compose(Themeable)(AeicoElement) as typeof AeicoElement & Constructor<ThemeableProps>

const TAG_NAME_PREFIX = 'ae'

/**
 * AeicoComponent is a base class that combines theme and internationalization capabilities.
 * This class serves as a convenient starting point for creating new components that require both features.
 * 
 * Only use for internal of Aeico components. For user-defined components, it's recommended to compose only the mixins you need using the `compose` utility function.
 */
class AeicoComponent extends BaseComponent {

  static register(name?: string) {
    const tagName = name || `${TAG_NAME_PREFIX}-${this.tagName || toKebab(this.name)}`

    super.register(tagName)
  }
}

export default AeicoComponent
