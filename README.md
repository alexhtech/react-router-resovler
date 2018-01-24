# react-router-resolver

[![npm version](https://img.shields.io/npm/v/react-router-resolver.svg?style=flat-square)](https://www.npmjs.org/package/react-router-resolver)
[![npm downloads](https://img.shields.io/npm/dm/react-router-resolver.svg?style=flat-square)](http://npm-stat.com/charts.html?package=react-router-resolver)

Were you thinking about how to load data before transition or how to load it on server-side with using react-router v4? 
Or maybe you thought how to load chunks before transition by click the link? What about security system on your project ? 
Alright, you can talk that there are too many library what implements it... 
But I can suggest the powerful and small sized library what can help to do it on client-side and for server-side too

Alright, let's start

# Contents

* [Simple example](#simple-example)
* [Example usage with redux](#example-usage-with-redux)
* [API](#api)
* [Helpers](#helpers)


**Internal dependencies:**

| package  | ver |
| ------------- | ------------- |
| is-browser  | ^2.0.1  |
| qs  | 6.5.1  |
| react-display-name | ^0.2.3 |
| shallowequal | ^1.0.2 |

**External dependencies:**


| package  | ver |
| ------------- | ------------- |
| react-router  | ^4.2.0  |
| react-router-config  | 1.0.0-beta.4  |


## Simple example

**if you didn't work with the `react-router-config` please follow the [link](https://github.com/ReactTraining/react-router/tree/master/packages/react-router-config#route-configuration-shape) and review**

`./src/routes/index.js`
```js
import React from 'react'
import {NavLink} from 'react-router-dom'
import {renderRoutes} from 'react-router-config'


const App = ({route}) => (
    <div>
        <ul>
            <li>
                <NavLink to='/'>to home</Link>
            </li>
            <li>
                <NavLink to='/test'>to test page</Link>
            </li>
        </ul>
        {renderRoutes(route.routes)}
    </div>
)

const Test = () => 'I am test page'

export default [
    {
        path: '/',
        component: App,
        routes: [
            {
                path: '/test',
                component: Test
            }
        ]
    }
]
```

Ok, this is just example. let's try to add react-router-resolver to do with

We need to load data before transition to `/test`. Ok

```js
export default [
    {
        path: '/',
        component: App,
        routes: [
            {
                path: '/test',
                component: Test,
                preload: async (helpers) => { // preload will wait and hold the transition until the promise is resolved or rejected
                    // here is we can to load data and put it to your storage like redux/mobx/mobx-state-tree and others...
                    helpers.dispatch({
                        type: 'PUT_DATA',
                        payload: await someActionWhichReturnsPromise()
                    })
                }
            }
        ]
    }
]
```

## Example usage with redux

`./src/resolver.js`

```js
import Resolver from 'react-router-resolver'


let resolver

const getResolver = ({store, history, routes}) => {
    if (resolver) return resolver
    resolver = new Resolver({
        routes,
        store,
        history,
        actions: {
            onStart: location => store.dispatch({
                type: 'PRELOAD_START',
                payload: location
            }),
            onSuccess: location => store.dispatch({
                type: 'PRELOAD_SUCCESS',
                payload: location
            }),
            onFail: (e, location) => store.dispatch({
                type: 'PRELOAD_FAIL',
                payload: {
                    e,
                    location
                }
            })
        },
        helpers: {
            store,
            history,
            dispatch: store.dispatch,
            getState: store.getState
            // here is you can put your own helpers ...
        },
        resolved: []
    })

    return resolver
}


export {
    getResolver
}
```

`./src/App.jsx`

```js
import React from 'react'
import {ConnectedRouter} from 'react-router-redux'
import {renderRoutes} from 'react-router-config'
import {Provider} from 'react-redux'
import {getResolver} from './resolver'
import routes from './routes'


const App = async ({history, store}) => {
    const resolver = getResolver({store, history, routes})

    try {
        await resolver.init(history.location)
    } catch (e) {
        console.error('something went wrong', e)
    }

    return (
        <Provider store={store}>
            <ConnectedRouter history={history}>
                {renderRoutes(routes)}
            </ConnectedRouter>
        </Provider>
    )
}


export {
    App as default
}
```

`./src/index.js`
```js
import React from 'react'
import ReactDOM from 'react-dom'
import {AppContainer} from 'react-hot-loader'
import createHistory from 'history/createBrowserHistory'
import configureStore from './store/configureStore'
import App from './App'


const history = createHistory()
const store = configureStore()


const render = App => {
    App({history, store}).then(html => {
        ReactDOM.render(
            <AppContainer warnings={false}>
                {html}
            </AppContainer>,
            document.getElementById('react-root')
        )
    })
}

render(App)

if (module.hot) module.hot.accept('./App', () => render(App))
```

And test it :)

## API

| method				|	desctiption																										|
| ------------- | ------------------------------------------------------------- |
| getRoutes 		| returns array of passed routes to the resolver	  						|
| getResolved		| returns an array of all resolved routes 		    							|
| setHelpers 		| (helpers) setting helpers for preload/onEnter hooks 	 				|
| addHelper 		| (key, value) add helper																			  |
| resolve 			|	(location) resolve routes for server-side											|
| init 					|	(location) resolve routes for client-side											|


## Helpers

```js
import {onEnter, preload} from 'react-router-resolver'


const preloadOptions = { // this is default options
    alwaysReload: false,
    reloadOnParamsChange: true,
    reloadOnQueryChange: true
}

// also you can use decorators style
@onEnter(({check}) => check({
    authenticated: true,
    anonymous: false
}))
@preload(async ({helpers}) => {
    const data = await getSomeData()
    helpers.dispatch({
        type: 'PUT_DATA',
        payload: data
    })
}, preloadOptions)
@connect(state => state.data)
export default class Test extends React.Component {
    render() {
        const {data} = this.props
        return (
            // use data in your component
        )
    }
}
```


**onEnter like preload but onEnter fires always when location is change**

or like object

```js
{
    path: '/test',
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
```

