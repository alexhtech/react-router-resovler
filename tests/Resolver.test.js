import React from 'react'
import {renderRoutes} from 'react-router-config'
import createHistory from 'history/createMemoryHistory'
import Resolver from '../src/Resolver'


const getTestData = () => new Promise((res, rej) => {
    res({
        id: 1,
        user: 'alex'
    })
})

const history = createHistory()

const storage = {}

const routes = [
    {
        path: '/',
        component: ({route}) => <div>{renderRoutes(route.routes)}</div>,
        routes: [
            {
                path: '/test',
                component: () => <div>{JSON.stringify(storage.testData)}</div>,
                preload: async ({storage}) => {
                    storage.testData = await getTestData()
                }
            }
        ]
    }
]

const helpers = {
    helper: () => 'I\'m helper',
    storage
}

let resolver

test('initialize', () => {
    resolver = new Resolver({
        helpers,
        routes,
        resolved: [],
        history,
        actions: {
            onStart: () => {

            },
            onSuccess: () => {

            },
            onFail: () => {

            }
        }
    })
    expect(resolver instanceof Resolver).toBe(true)
})

test('routes eq', () => {
    expect(resolver.getRoutes()).toEqual(routes)
})

test('helpers && preload hook', async () => {
    const location = {
        pathname: '/test',
        search: ''
    }

    await resolver.resolve(location)
    expect(storage.testData).toEqual(await getTestData())
})

test('resolved routes', () => {
    expect(resolver.getResolved()).toEqual(
        [
            {
                params: {},
                path: '/test',
                search: '',
                isServer: true
            }
        ]
    )
})