# Serverless Toolkit CLI

- [Setup](#setup)
- [Concepts](#concepts)

## Setup

1. Install dependencies

```sh
yarn
```

1. Create Saga with initial state

```sh
yarn:create
```

4. Restore state -> apply command -> save "new" state

```sh
yarn:update
yarn:update-increment
yarn:update-decrement
```

5. Deploy using Lambda Function-URL

```sh
yarn deploy
```

## Concepts

### Instance Management

- list sagas by type using the CLI
- create and destory saga by id using the CLI
- correlation/instance ID can be client generated, using UUID by default 

### SDK

- `import { bindings, alarm, credentials, expire, store, worker } from 'gusto-sdk'`

#### Bindings

- defines the local handler for external events e.g. `bindings.ses['contact@example.com'].on('inbound').bind(this.onInbound)`

**examples**
```
export default class Counter {
    constructur() {
        Counter.addBinding(bindings.ses.onInbound('contact@example.com').bind(this.onEmail))
    }
}
```

```
export default function counter() {
    doSomething.addBinding(bindings.ses.onInbound('contact@example.com'))
}
```

### Communication

- using a HTTP based API
- external events as trigger (e.g. SES, Event-Bridge, Shopify, etc.) via Bindings from our SDK 

### Worker execution

- default execution timeout is 15 Minutes
- concurrent execution is 1000
- maximum memory size is 128MB
- request response invocation
- e.g. chaining via `const response = await worker.invoke('other')`

### Saga execution

- default execution timeout is 1 Minute
- concurrent execution is 1 per Saga type
- maximum memory size is 128MB
- [async invocation](https://docs.aws.amazon.com/lambda/latest/dg/invocation-async.html) using an event queue (unordered, at-least-once)

### Saga persistent state

- every `public` property is persistent 
- the maximum serialized size of a persistent property is 400kb 

### KV Store

- available via `store`
- `list`, `get`, `set` and `remove` operations to query and modify states
- handle changes using `onChange` handler attached to DynamoDB change stream

### Commands

- the command handler is a function of the Saga and has the same name as the command
- command handler invocation via `command` property
- command arguments via `commandArgs` property

### Alarms

- invocation at a specific time
- handle alarm using `onAlarm`
- `alarm` - `set`, `clear`

### Security

- 3rd party code execution is dynamically loaded from S3 and sandboxed in VM2
- credential KV store is available via `credentials`
- credential KV store management via CLI
  
### Saga expiry

- default expiry is 1 year
- reschedule possible
- handle expiry using `onExpire`
- `expire` - `at`

### Page objects

- Svelte and Markdown based Server Side Rendering 
- 
