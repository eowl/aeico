import AeicoElement from '../core/AeicoElement'
import { Themeable, type ThemeableProps } from '../mixins/Themeable'
import { Localizable, type LocalizableProps } from '../mixins/Localizable'
import { compose, Constructor } from '../mixins/compose'

const BaseComponent = compose(Themeable, Localizable)(AeicoElement) as typeof AeicoElement & Constructor<ThemeableProps & LocalizableProps>

const TAG_NAME_PREFIX = 'ae'

/**
 * AeicoComponent is a base class that combines theme and internationalization capabilities.
 * This class serves as a convenient starting point for creating new components that require both features.
 * 
 * Only use for internal of Aeico components. For user-defined components, it's recommended to compose only the mixins you need using the `compose` utility function.
 */
class AeicoComponent extends BaseComponent {

  static tagName: string = ''

  static register(name?: string) {
    const tagName = name || `${TAG_NAME_PREFIX}-${this.tagName || this.toKebab(this.name)}`

    super.register(tagName)
  }
}

export default AeicoComponent
