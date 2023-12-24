# Ya Signals

_React application architecture on MobX._

[![npm version](https://img.shields.io/npm/v/ya-signals?style=flat-square)](https://www.npmjs.com/package/ya-signals) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/ya-signals?style=flat-square)](https://bundlephobia.com/result?p=ya-signals)

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

[![Edit example in Codesandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/sleepy-field-79wqfh?file=%2Fsrc%2FApp.tsx%3A25%2C1-25%2C11)

```typescript
import { service, makeObservable, observable } from "ya-signals";

// AppService.ts

class AppService {
  public lang: string;

  constructor() {
    this.lang = "ru";

    makeObservable(this, {
      lang: observable.ref, // immutable value
    });
  }
}

// Only Proxy for create class on demand in future
export const appService = service(AppService);
```

If you run `appService.user` in your code anywhere it's get app property for **on demand** created service

```typescript
import { observer } from "ya-signals";
import { appService } from "./AppService.ts"

// App.tsx

export const App = observer(() => {
  return (
    <div className="App">
      <h1>App lang {appService.lang}</h1>
    </div>
  );
});
```

In rare cases when it's necessary to initialize a service without invoking any method.

```typescript
service.instantiate(appService);
```

In rare case when it's necessary to destroy a service manually.

```typescript
service.destroy(appService);
```

### Describe component logic in OOP-style

```typescript
import { hook, un } from "ya-signals";

class RecipeForm {
  constructor() {
    un(() => {
      // destroy
    })
  }
}

export const useRecipeForm = hook(RecipeForm)

// Somewhere in React component
const form = useRecipeForm()
```

**And it can be with params of course**

[![Edit example in Codesandbox](https://codesandbox.io/static/img/play-codesandbox.svg)](https://codesandbox.io/p/sandbox/nostalgic-galileo-p8ylnf?file=%2Fsrc%2FApp.tsx%3A20%2C1)

```typescript
import { hook, type SignalReadonly } from "ya-signals";

// Can be object struct with named fields
type Params = {
  count: number;
  text: string;
};

class LocalLogic {
  constructor($params: SignalReadonly<Params>) {
    console.log("constructor with params", $params.value);

    $params.subscribe((params) => {
      console.log("updated params", params);
    });
  }
}

const useLocalLogic = hook(LocalLogic);
```

The `signal` documentation see [here](/DOCUMENTATION.md#signalinitialvalue).

And using it somewhere inside React component function

```typescript
import { useRecipeForm } from './recipe-form.ts';

function Form() {
  const [count, setCount] = useState(() => 1);
  const [text, setText] = useState(() => "Hello");
  const logic = useLocalLogic({ count, text });

  return <>
  // ...
}
```

## API Reference

  - [Documentation](/DOCUMENTATION.md)

## License
ISC
