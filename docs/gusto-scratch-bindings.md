# Scratch Bindings

## Worker Bindings

```ts
import { SimpleHttpBinding } from 'gusto-sdk'

new SimpleHttpBinding(() => {})
new SimpleHttpBinding(simpleHandler, {})

function simpleHandler() {}
```

## Saga Bindings

```ts
import { SimpleHttpBinding } from 'gusto-sdk'

class SimpleSaga {
    constructor() {
        new SimpleHttpBinding(this.onMessage, {})
        new SimpleHttpBinding(this.onFoo)
        new SESHttpBinding(this.onFoo)
    }

    public function onMessage() {}
    public function onFoo() {}    
}
```

## Page Object Bindings

```ts
<script context="module">
    import { SimpleSaga } from './simpleSaga'

    export async function load(request) {
        if(request.firstname) {            
            fetch(`https://${SimpleSaga.simpleHttpBinding.onFoo.url}`, {
                method: 'POST', 
                body: { ...request }
            })
        }
    }
</script>

<form method="post">
    <input type="text" name="firstname" />
    <input type="submit" value="los" />
</form>
```