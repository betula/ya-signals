# Ya Signals

_React application architecture on MobX._

[![npm version](https://img.shields.io/npm/v/ya-signals?style=flat-square)](https://www.npmjs.com/package/ya-signals)
[![npm bundle size](https://img.shields.io/bundlephobia/minzip/ya-signals?style=flat-square)](https://bundlephobia.com/result?p=ya-signals)

## Installation

```bash
npm install ya-signals
```

- [Ya Signals](#ya-signals)
  - [Installation](#installation)
  - [Logic](#logic)
    - [On demand services](#on-demand-services)
    - [Describe component logic in OOP-style](#describe-component-logic-in-oop-style)
  - [API Reference](#api-reference)
  - [License](#license)

## Logic

### On demand services

```typescript
import { service } from "ya-signals";

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
import { hook, un, type SignalReadonly } from "ya-signals";

export class RecipeForm {
  constructor(signalParams: SignalReadonly<[number, string]>) {
    un(() => {
      // destroy
    })

    signalParams.sync((params) => {
      console.log('Current params values', params);
    });
  }
}

export const useRecipeForm = hook(RecipeForm)
```

Somewhere inside React component function

```typescript
import { useRecipeForm } from './recipe-form.ts';

function Form() {
  const form = useRecipeForm([10, 'hello']); // params available here

  return <>
  // ...
}
```

## API Reference

  - [Documentation](/DOCUMENTATION.md)

## License
ISC
