import * as qs from 'qs'
import { Location as $Location } from 'history'

const stringify = (params: object) => qs.stringify(params, { addQueryPrefix: true })

const parse = (queryString: string) => qs.parse(queryString, { ignoreQueryPrefix: true })

export interface Location extends $Location {
    query?: object
}

const makeLocation = (to: Location | string) => {
    if (typeof to === 'string') {
        return {
            pathname: to
        }
    } else {
        return typeof to.query === 'object'
            ? {
                  ...to,
                  search: stringify(to.query),
                  query: undefined
              }
            : to
    }
}

export { stringify, parse, makeLocation }
