# Documentation 

## Dependencies (aka imports)

The local CLI installs NPM dependencies using the `package.json` and build your workspace (strongly typed) in the background using ES-Build.

**Code example**
```
import { ... } from 'cloud-runtime'
import { a,b,c ) from 'foobar'
```

## Workspace (aka Namespace, Project, Context, App)

## Function

## Event + Handler

## Global State 

## Workflow (aka State Machine, StepFunction, Durable Function, Orchestratrion)

## LifeTime

singleton, session, perRequest


```
import { query, sleep } from 'cloud-runtime'

class HotelBooking {
    let hotelName;
    constructor() {
        getState('App.hb')
    }
    destructor() {}

    toString() {
        return {
            hotelName: this.hotelName
        }
    }
}

class App {
    private let hb, cb, fb;
    public let retries = 0
    private oo = 0

    constructor(credentials, params) {
        //dedub ()
        this.id = params.hotelName + params.username
        query<App>(...)              
    }

    destructor() {

    }

    async foo(payload: any) {        
        try {
            return await bla()
        } catch(error) {
            console.error(error)
            retryIn(1000)
            return {}
        }
    }

   async on(eventType, payload) {
        query(...)
    
        if(eventType === 'email') {            
            for(...) {
                const zz = await this.foo(payload)
            }            
            this.hb = new HotelBooking(1, stateA)    
            this.cb = new CarBooking(2, hb, stateA)
            this.fb = new Flightbooking(1)
        }
    }

    onStart(...args) {
                
    }

    onCancel(...args) {
        console.log(this.hb.hotelName)        
        this.hb..cancel()
        this.cb.cancel()
        ...
    }
}
```

## UX of CLI

### Login
### Deploy/Push
### Logs
### Watch/Dev
### Sync
### Test