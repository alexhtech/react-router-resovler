import * as React from 'react'
import { renderRoutes } from 'react-router-config'
import createHistory from 'history/createMemoryHistory'
import Resolver, { RouteConfig } from '../src/Resolver'

const getTestData = () =>
    new Promise((res, rej) => {
        res({
            id: 1,
            user: 'alex'
        })
    })

const history = createHistory()

const storage = {
    testData: ''
}

const routes: RouteConfig[] = [
    {
        path: '/',
        component: ({ route }: any) => <div>{renderRoutes(route && route.routes)}</div>,
        routes: [
            {
                path: '/test',
                component: () => <div>{JSON.stringify(storage.testData)}</div>,
                preload: async ({ storage }) => {
                    storage.testData = await getTestData()
                }
            }
        ]
    }
]

const helpers = {
    helper: () => "I'm helper",
    storage
}

let resolver: Resolver

test('initialize', () => {
    resolver = new Resolver({
        helpers,
        routes,
        resolved: [],
        history,
        actions: {
            onStart: () => {},
            onSuccess: () => {},
            onFail: () => {}
        }
    })
})

test('routes eq', () => {
    expect(resolver.getRoutes()).toEqual(routes)
})

test('helpers && preload hook', async () => {
    const location = {
        pathname: '/test',
        search: '',
        state: null,
        hash: ''
    }

    await resolver.resolve(location)
    expect(storage.testData).toEqual(await getTestData())
})

test('resolved routes', () => {
    expect(resolver.getResolved()).toEqual([
        {
            params: {},
            path: '/test',
            search: '',
            isServer: true
        }
    ])
})
