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