import getDisplayName from 'react-display-name'
import { OnEnter } from '../Resolver'

const onEnter = (onEnter: OnEnter) => (Component: any) => {
    Component.onEnter = onEnter
    Component.displayName = getDisplayName(Component)
    return Component
}

export default onEnter
