import qs from 'qs'


const stringify = params => qs.stringify(params, {addQueryPrefix: true})

const parse = queryString => qs.parse(queryString, {ignoreQueryPrefix: true})

const makeLocation = to => {
    if (typeof to === 'string') {
        return {
            pathname: to
        }
    } else {
        return to.query === 'object' ? {
            ...to,
            search: stringify(to.query),
            query: undefined
        } : to
    }
}

export {
    stringify,
    parse,
    makeLocation
}



test = {
    component: Test,
    preload: async ({helpers}) => {
        const data = await getSomeData()
        helpers.dispatch({
            type: 'PUT_DATA',
            payload: data
        })
    },
    preloadOptions: { // this is default options
        alwaysReload: false,
        reloadOnParamsChange: true,
        reloadOnQueryChange: true
    },
    onEnter: ({check}) => check({
        authenticated: true,
        anonymous: false
    })
}