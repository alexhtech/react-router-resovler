import { matchRoutes, RouteConfig as $RouteConfig, MatchedRoute as $MatchedRoute } from 'react-router-config'
import * as shallowEqual from 'shallowequal'
import { Action, History, Location } from 'history'
import { LocationListener } from 'history'
import { parse, makeLocation } from './helpers'

const isBrowser: boolean = require('is-browser')

export interface MatchedRoute<T = {}> extends $MatchedRoute<T> {
    route: RouteConfig
}

export type PreloadProps = {
    params?: {
        [key: string]: any
    }
    redirect(location: Location): void
    [key: string]: any
}

export type Preload = (props: PreloadProps) => Promise<void>

export type OnEnter = (props: PreloadProps) => Promise<void> | OnEnter

export type PreloadOptions = {
    alwaysReload?: boolean
    reloadOnQueryChange?: boolean
    reloadOnParamsChange?: boolean
}

export interface RouteConfig extends $RouteConfig {
    preload?: Preload
    preloadOptions?: PreloadOptions
    onEnter?: OnEnter
    routes?: RouteConfig[]
    getComponent?: () => Promise<any>
}

export type OnStart = (location?: Location) => void
export type OnSuccess = (location?: Location) => void
export type OnFail = () => void
export type Helpers = {
    [key: string]: any
}

export interface ResolverConstructor {
    helpers: Helpers
    routes: RouteConfig[]
    resolved?: Resolved[]
    history: History
    actions: {
        onStart?: OnStart
        onSuccess?: OnSuccess
        onFail?: OnFail
    }
}

export type Resolved = {
    params?: any
    path?: string
    search: string
    isServer?: boolean
}

class Resolver {
    constructor({ helpers = {}, routes, resolved = [], history, actions = {} }: ResolverConstructor) {
        this.helpers = helpers
        this.routes = routes
        this.resolved = resolved
        this.history = history
        this.listeners = []
        if (typeof actions.onStart === 'function') {
            this.start = actions.onStart
        }
        if (typeof actions.onSuccess === 'function') {
            this.success = actions.onSuccess
        }
        if (typeof actions.onFail === 'function') {
            this.fail = actions.onFail
        }
        this.injectListener(history)
    }

    helpers: Helpers

    routes: RouteConfig[]

    resolved: Resolved[]

    history: History

    listeners: LocationListener[]

    start: OnStart = () => {}

    success: OnSuccess = () => {}

    fail: OnFail = () => {}

    location?: Location

    lock: boolean = false

    getRoutes = () => this.routes

    getResolved = () => this.resolved

    setHelpers = (helpers: any) => {
        this.helpers = helpers
    }

    addHelper = (key: string, helper: any) => {
        this.helpers[key] = helper
    }

    notifyListeners = async (location: Location, action: Action) => {
        if (this.lock) return
        try {
            await this.resolve(location)
            this.listeners.forEach(listener => listener(location, action))
            this.location = location
        } catch (e) {
            if (typeof e === 'object' && e.type === 'redirect') {
                this.fail()
                this.history.replace(e.to)
            } else {
                if (this.location) {
                    this.fail()
                    this.history.replace(this.location)
                } else {
                    this.fail()
                }
            }
        }
    }

    injectListener = ({ listen }: History) => {
        listen(this.notifyListeners)
        this.history.listen = listener => {
            this.listeners.push(listener)
            return () => {
                this.listeners = this.listeners.filter(item => item !== listener)
            }
        }
    }

    injectOptionsFromComponent = (item: MatchedRoute) => {
        const { preload, onEnter, routes, preloadOptions } = item.route.component as RouteConfig

        if (typeof preload === 'function' && item.route.preload !== preload) {
            item.route.preload = preload
        }

        if (typeof preloadOptions === 'object' && item.route.preloadOptions !== preloadOptions) {
            item.route.preloadOptions = preloadOptions
        }

        if (typeof onEnter === 'function' && item.route.onEnter !== onEnter) {
            item.route.onEnter = onEnter
        }

        if (typeof routes === 'object' && item.route.routes !== routes) {
            item.route.routes = routes
        }
    }

    resolveChunks = async (location: Location, routes = this.routes) => {
        const matched: MatchedRoute[] = []
        const { pathname } = location
        matchRoutes(routes, pathname).forEach((item: MatchedRoute) => {
            if (!item.route.component && typeof item.route.getComponent === 'function') {
                matched.push(item)
            } else {
                item.route.component && this.injectOptionsFromComponent(item)
            }
        })

        const components = await Promise.all(
            matched.map((item: MatchedRoute) => item.route.getComponent && item.route.getComponent())
        )
        components.forEach((item, index) => {
            matched[index].route.component = item.default
            this.injectOptionsFromComponent(matched[index])
        })

        const last = matched.length - 1

        if (matched[last] && matched[last].route.routes) {
            await this.resolveChunks(location, matched[last].route.routes)
        }
    }

    resolveData = async (location: Location) => {
        const { pathname, search = '' } = location

        const branch = matchRoutes(this.routes, pathname).filter(
            (item: MatchedRoute) => typeof item.route.preload === 'function' || typeof item.route.onEnter === 'function'
        )

        if (branch.length === 0) return

        for (const i in branch) {
            if (Object.prototype.hasOwnProperty.call(branch, i)) {
                const {
                    match: { params },
                    route: { preload, path, onEnter }
                }: MatchedRoute = branch[i]
                const options = {
                    params,
                    location: { ...location, query: parse(search) },
                    redirect: (location: Location | string) => {
                        throw {
                            to: makeLocation(location),
                            type: 'redirect'
                        }
                    },
                    ...this.helpers
                }

                if (typeof onEnter === 'function') {
                    const result = await onEnter(options)
                    if (typeof result === 'function') {
                        await result(options)
                    }
                }
                preload && !this.isResolved(branch[i], location) && (await preload(options))

                this.pushItem({
                    params,
                    path,
                    search,
                    isServer: !isBrowser
                })
            }
        }
    }

    isResolved = ({ match: { params, path }, route: { preloadOptions = {} } }: MatchedRoute, { search = '' }) => {
        const { alwaysReload = false, reloadOnQueryChange = true, reloadOnParamsChange = true } = preloadOptions

        return (
            this.resolved.findIndex(item => {
                if (item.path === path) {
                    if (item.isServer) {
                        if (isBrowser) {
                            item.isServer = undefined
                        }

                        return true
                    }

                    if (alwaysReload) return false
                    return (
                        (reloadOnParamsChange ? shallowEqual(item.params, params) : true) &&
                        (reloadOnQueryChange ? search === item.search : true)
                    )
                }

                return false
            }) !== -1
        )
    }

    pushItem = (item: Resolved) => {
        const index = this.resolved.findIndex(i => i.path === item.path)
        if (index !== -1) {
            this.resolved[index] = item
        } else {
            this.resolved.push(item)
        }
    }

    resolve = async (location: Location) => {
        this.start(location)

        await this.resolveChunks(location)
        await this.resolveData(location)

        this.success(location)
    }

    init = async (location: Location) => {
        this.lock = true
        try {
            await this.resolve(location)
        } catch (e) {
            this.fail()
            if (typeof e === 'object' && e.type === 'redirect') {
                this.history.replace(e.to)
                await this.init(e.to)
            } else {
                throw e
            }
        }
        this.lock = false
    }
}

export default Resolver
