import AeicoElement from '../core/AeicoElement'
import { Themeable, type ThemeableProps } from '../mixins/Themeable'
import { Localizable, type LocalizableProps } from '../mixins/Localizable'
import { compose, Constructor } from '../mixins/compose'

/**
 * AeicoComponent is a base class that combines theme and internationalization capabilities.
 * This class serves as a convenient starting point for creating new components that require both features.
 * 
 * Only use for internal of Aeico components. For user-defined components, it's recommended to compose only the mixins you need using the `compose` utility function.
 */
export const AeicoComponent = compose(Themeable, Localizable)(AeicoElement) as typeof AeicoElement & Constructor<ThemeableProps & LocalizableProps>

export default AeicoComponent
