```ts
import { httpBinding, eMailBinding } from 'gusto'

httpBinding('/workers/foo', foo)
eMailBinding('foo', foo)

function foo(params) {
    console.log({ params })
    return {params}
}
```

//first
//-> analyse + generator

```
import AWS from 'aws-sdk'

const lambda_foo = AWS.Lambda.create({name: foo, code: '...'})
const api = AWS.ApiGateways.createRoute({path: '/bla', lambda: lambda_foo})
```
//-> validate (saas) -> (executor = nodejs) -> resource output as text/json

//second
//-> transpiler
```json
{
    "lambda": {
        foo: {
            name: "foo",
            code: "..."
        }
    },
    "api": {
        "name": "bla",
        "routes": {
            "/bla": "self.lambda.foo"
        }
    }
}
```
//-> validate (saas) -> (executor = self build)
