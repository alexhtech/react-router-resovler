import getDisplayName from 'react-display-name'
import { Preload, PreloadOptions } from '../Resolver'

const preload = (preload: Preload, options: PreloadOptions) => (Component: any) => {
    Component.preload = preload
    Component.preloadOptions = options
    Component.displayName = getDisplayName(Component)
    return Component
}

export default preload
