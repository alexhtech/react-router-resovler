import isBrowser from 'is-browser'
import {matchRoutes} from 'react-router-config'
import shallowEqual from 'shallowequal'
import {parse, makeLocation} from './helpers'


class Resolver {
    constructor({helpers = {}, routes, resolved = [], history, actions = {}} = {}) {
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
        this.location = null
        this.lock = false
    }

    start = () => {
    }

    success = () => {
    }

    fail = () => {
    }

    getRoutes = () => this.routes

    getResolved = () => this.resolved

    setHelpers = (helpers) => {
        this.helpers = helpers
    }

    addHelper = (key, helper) => {
        this.helpers[key] = helper
    }

    notifyListeners = async (...args) => {
        if (this.lock) return
        try {
            await this.resolve(args[0])
            this.listeners.forEach(listener => listener(...args))
            this.location = args[0]
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

    injectListener = ({listen}) => {
        listen(this.notifyListeners)
        this.history.listen = (listener) => {
            this.listeners.push(listener)
            return () => {
                this.listeners = this.listeners.filter(item => item !== listener)
            }
        }
    }

    injectOptionsFromComponent = (item) => {
        const {preload, onEnter, routes, preloadOptions} = item.route.component

        if (typeof (preload) === 'function' && item.route.preload !== preload) {
            item.route.preload = preload
        }

        if (typeof (preloadOptions) === 'object' && item.route.preloadOptions !== preloadOptions) {
            item.route.preloadOptions = preloadOptions
        }

        if (typeof (onEnter) === 'function' && item.route.onEnter !== onEnter) {
            item.route.onEnter = onEnter
        }

        if (typeof routes === 'object' && item.route.routes !== routes) {
            item.route.routes = routes
        }
    }

    resolveChunks = async (location, routes = this.routes) => {
        const matched = []
        const {pathname} = location
        matchRoutes(routes, pathname).forEach((item) => {
            if (!item.route.component && typeof item.route.getComponent === 'function') {
                matched.push(item)
            } else {
                item.route.component && this.injectOptionsFromComponent(item)
            }
        })


        const components = await Promise.all(matched.map(item => item.route.getComponent()))
        components.forEach((item, index) => {
            matched[index].route.component = item.default
            this.injectOptionsFromComponent(matched[index])
        })

        const last = matched.length - 1

        if (matched[last] && matched[last].route.routes) {
            await this.resolveChunks(location, matched[last].route.routes)
        }
    }

    resolveData = async (location) => {
        const {pathname, search = ''} = location

        const branch = matchRoutes(this.routes, pathname).filter(item =>
            typeof item.route.preload === 'function' ||
            typeof item.route.onEnter === 'function'
        )

        if (branch.length === 0) return;

        for (const i in branch) {
            if (Object.prototype.hasOwnProperty.call(branch, i)) {
                const {match: {params}, route: {preload, path, onEnter}} = branch[i]
                const options = {
                    params,
                    location: {...location, query: parse(search)},
                    redirect: (props) => {
                        throw {
                            to: makeLocation(props),
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
                preload && !this.isResolved(branch[i], location) && await preload(options)

                this.pushItem({
                    params,
                    path,
                    search,
                    isServer: !isBrowser
                })
            }
        }
    }

    isResolved = ({match: {params, path}, route: {preloadOptions = {}}}, {search = ''}) => {
        const {
            alwaysReload = false,
            reloadOnQueryChange = true,
            reloadOnParamsChange = true
        } = preloadOptions


        return this.resolved.findIndex((item) => {
            if (item.path === path) {
                if (item.isServer) {
                    if (isBrowser) {
                        item.isServer = undefined
                    }

                    return true
                }

                if (alwaysReload) return false
                return (reloadOnParamsChange ? shallowEqual(item.params, params) : true) &&
                    (reloadOnQueryChange ? search === item.search : true)
            }

            return false
        }) !== -1
    }

    pushItem = (item) => {
        const index = this.resolved.findIndex(i => i.path === item.path)
        if (index !== -1) {
            this.resolved[index] = item
        } else {
            this.resolved.push(item)
        }
    }

    resolve = async (location) => {
        this.start(location)

        await this.resolveChunks(location)
        await this.resolveData(location)

        this.success(location)
    }

    init = async location => {
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


export {
    Resolver as default
}