# Ya Signals

_React application architecture on MobX._

## Installation

```bash
yarn add betula/ya-signals
```

- [Ya Signals](#ya-signals)
  - [Installation](#installation)
  - [Logic](#logic)
    - [On demand services](#on-demand-services)
    - [Describe component logic in OOP-style](#describe-component-logic-in-oop-style)
  - [License](#license)

## Logic

### On demand services

```typescript
import { service, un } from "ya-signals";

class UserServer {
  constructor() {}
}

// On demand service abstraction
export const userService = service(UserServer)

// If you run `userService.user` in your code anywhere it's get user property for on demand created service
const user = userService.user
```

In rare cases when it's necessary to initialize a service without invoking any method.

```typescript
service.instantiate(userService)
```

In rare case when it's necessary to destroy a service manually.

```typescript
service.destroy(userService);
```

### Describe component logic in OOP-style

```typescript
import { hook, un } from "ya-signals";

class RecipeForm {
  constructor(
    //(params proposal)
    //private signalOfParam1,
    //private signalOfParam2
  ) {
    un(() => {
      // destroy
    })
  }
}

useRecipeForm = hook(RecipeForm)

const form = useRecipeForm(/*(params proposal) param1, param2*/)
```

## License
ISC
