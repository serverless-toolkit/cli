# Serverless Toolkit (STK) CLI

### STK CLI

```
Usage: stk COMMAND

Kommandos:
  stk dev        Start development.
  stk test       Start local test execution.
  stk logs       Watch logs.
  stk sync       Sync code files.
  stk init       Prepare a local development environment.
  stk bootstrap  Bootstrap the runtime environment in AWS.
  stk destroy    Destroy the runtime environment in AWS.

Optionen:
  -v, --version  Version anzeigen                                      [boolean]
  -h, --help     Hilfe anzeigen                                        [boolean]
```

## Setup a new project

```
➜ npx @serverless-toolkit/cli@latest init
```

**or**

```
➜ npm create @serverless-toolkit/cli@latest
```

```
✔ Enter your project name: · api
✔ Do you wanna use Route53 domain? (y/N) · true
✔ Enter your Route53 domain name: · serverless-toolkit.com
✔ Do you wanna use GitHub actions for deployments? (y/N) · true

Project api initiated. Change to folder api and enter

stk bootstrap

to prepare the development in AWS.
```

### Bootstrap - prepare the serverless runtime in AWS

```
➜ cd api
➜ stk bootstrap
```

### Start local development

> File changes will be updated and deployed in the background.

```
➜ stk dev
```

### Manually deploy your file changes

```
➜ stk sync
```

### Manually run tests

```
➜ stk test
```

### Destroy the serverless runtime

```
➜ stk destroy
```

## API

### Key-Value Store

#### `get`

```typescript
context.store.get(id: string, type?: string);
```

#### `set`

```typescript
interface Item {
  id: string
}
context.store.set(item: Item, type?: string);
```

### Alarms

> Currently only supported in Sagas.

#### `inMinutes`

```typescript
context.alarm.inMintes(minutes: number);
```

#### `clear`

```typescript
context.alarm.clear();
```

## Run tests in local development

```
➜ yarn test
➜ yarn test workers
➜ yarn test pages
➜ yarn test sagas
```
