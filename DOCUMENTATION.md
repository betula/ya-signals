# Signals

_React application architecture on MobX._

- [Signals](#signals)
  - [React Integration](#react-integration)
  - [Guide / API](#guide--api)
    - [`signal(initialValue)`](#signalinitialvalue)
    - [`wrapSignal(fn)`](#wrapsignalfn)
    - [`autorun(fn)`](#autorunfn)
    - [`reaction(fn,fn)`](#reactionfnfn)
    - [`sync(fn,fn)`](#syncfnfn)
    - [`when(fn)`](#whenfn)
    - [`untracked(fn)`](#untrackedfn)
    - [`transaction(fn)`](#transactionfn)
  - [Extra API](#extra-api)
    - [Simple and fast events abstraction](#simple-and-fast-events-abstraction)
    - [Automatic unsubscription control](#automatic-unsubscription-control)
    - [On demand services](#on-demand-services)
    - [Describe component logic in OOP-style](#describe-component-logic-in-oop-style)

## React Integration

React adapter allows you to access signals directly inside your components and will automatically subscribe to them.

```typescript
import { observer, signal } from "ya-signals";

const count = signal(0);

const CounterValue = observer(() {
	// Whenever the `count` signal is updated, we'll
	// re-render this component automatically for you
	return <p>Value: {count.value}</p>;
})
```

The `observer` HoC automatically subscribes React components to any observables that are used during rendering. As a result, components will automatically re-render when relevant observables change. It also makes sure that components don't re-render when there are no relevant changes. So, observables that are accessible by the component, but not actually read, won't ever cause a re-render.

In practice this makes MobX applications very well optimized out of the box and they typically don't need any additional code to prevent excessive rendering.

## Guide / API

### `signal(initialValue)`

The `signal` function creates a new signal. A signal is a container for a value that can change over time. You can read a signal's value or subscribe to value updates by accessing its `.value` property.

```js
import { signal } from 'ya-signals';

const counter = signal(0);

// Read value from signal, logs: 0
console.log(counter.value);

// Write to a signal
counter(1);
```

Writing to a signal is done by calling as a function. Changing a signal's value synchronously updates every [computed](#computedfn) and [autorun](#autorunfn) that depends on that signal, ensuring your app state is always consistent.

### `wrapSignal(fn)`

Data is often derived from other pieces of existing data. The `wrapSignal` function lets you combine the values of multiple signals into a new signal that can be reacted to, or even used by additional computeds. When the signals accessed from within a computed callback change, the computed callback is re-executed and its new return value becomes the computed signal's value.

```js
import { signal, wrapSignal } from 'ya-signals';

const name = signal('Jane');
const surname = signal('Doe');

const fullName = wrapSignal(() => name.value + ' ' + surname.value);

// Logs: "Jane Doe"
console.log(fullName.value);

// Updates flow through wrapSignal, but only if someone
// subscribes to it. More on that later.
name('John');
// Logs: "John Doe"
console.log(fullName.value);
```

Any signal that is accessed inside the `wrapSignal`'s callback function will be automatically subscribed to and tracked as a dependency of the struct computed signal.

### `autorun(fn)`

The `autorun` function is the last piece that makes everything reactive. When you access a signal inside its callback function, that signal and every dependency of said signal will be activated and subscribed to. In that regard it is very similar to [`wrapSignal(fn)`](#wrapsignalfn). By default all updates are lazy, so nothing will update until you access a signal inside `autorun`.

```js
import { signal, wrapSignal, autorun } from 'ya-signals';

const name = signal('Jane');
const surname = signal('Doe');
const fullName = wrapSignal(() => name.value + ' ' + surname.value);

// Logs: "Jane Doe"
autorun(() => console.log(fullName.value));

// Updating one of its dependencies will automatically trigger
// the autorun above, and will print "John Doe" to the console.
name('John');
```

You can destroy an autorun and unsubscribe from all signals it was subscribed to, by calling the returned function.

```js
import { signal, wrapSignal, autorun } from 'ya-signals';

const name = signal('Jane');
const surname = signal('Doe');
const fullName = wrapSignal(() => name.value + ' ' + surname.value);

// Logs: "Jane Doe"
const dispose = autorun(() => console.log(fullName.value));

// Destroy autorun and subscriptions
dispose();

// Update does nothing, because no one is subscribed anymore.
// Even the computed `fullName` signal won't change, because it knows
// that no one listens to it.
surname('Doe 2');
```

### `reaction(fn,fn)`

`reaction` is like [`autorun`](#autorunfn), but gives more fine grained control on which signals will be tracked. It takes two functions: the first, data function, is tracked and returns the data that is used as input for the second, effect function. It is important to note that the side effect only reacts to data that was accessed in the data function, which might be less than the data that is actually used in the effect function.

The typical pattern is that you produce the things you need in your side effect in the data function, and in that way control more precisely when the effect triggers. By default, the result of the data function has to change in order for the effect function to be triggered.

```typescript
import { signal, reaction } from 'ya-signals';

class Animal {
  name = signal(0);
  energyLevel = signal(0);

  constructor(name) {
    this.name(name);
    this.energyLevel(100);
  }

  reduceEnergy() {
    this.energyLevel.update(v => v - 10);
  }

  get isHungry() {
    return this.energyLevel.value < 50;
  }
}

const giraffe = new Animal('Gary');

reaction(
  () => giraffe.isHungry,
  isHungry => {
    if (isHungry) {
      console.log("Now I'm hungry!");
    } else {
      console.log("I'm not hungry!");
    }
    console.log('Energy level:', giraffe.energyLevel.value);
  },
);

console.log("Now let's change state!");
for (let i = 0; i < 10; i++) {
  giraffe.reduceEnergy();
}
```

### `sync(fn,fn)`

`sync` is like [`reaction`](#reactionfnfn), but the effect function should immediately be triggered after the first run of the data function.

```typescript
import { sync } from 'ya-signals';

class List {
  constructor(authService) {
    sync(
      () => authService.isLoggedIn, // data function
      loggedIn => {
        // effect function
        if (loggedIn) {
          this.initUserData();
        } else {
          this.clearUserData();
        }
      },
    );
  }
  initUserData() {}
  clearUserData() {}
}
```

### `when(fn)`

`when` observes and runs the given predicate function until it returns `true`. Once that happens, the return promise resolved.

The `when` function returns a `Promise` with `cancel` method allowing you to cancel it manually.

This combines nicely with `async / await` to let you wait for changes in reactive state.

```typescript
import { when } from "ya-signals"

async function() {
  await when(() => that.isVisible)
  // etc...
}
```

To cancel when prematurely, it is possible to call `.cancel()` on the promise returned by itself.

### `untracked(fn)`

In case when you're receiving a callback that can read some signals, but you don't want to subscribe to them, you can use `untracked` to prevent any subscriptions from happening.

```js
const counter = signal(0);
const effectCount = signal(0);

autorun(() => {
  console.log(counter.value);

  // Whenever this effect is triggered, run function that gives new value
  effectCount(
    untracked(() => {
      return effectCount.value + 1;
    }),
  );
});
```

### `transaction(fn)`

The `transaction` function allows you to combine multiple signal writes into one single update that is triggered at the end when the callback completes.

```js
import { signal, wrapSignal, autorun, transaction } from 'ya-signals';

const name = signal('Jane');
const surname = signal('Doe');
const fullName = wrapSignal(() => name.value + ' ' + surname.value);

// Logs: "Jane Doe"
autorun(() => console.log(fullName.value));

// Combines both signal writes into one update. Once the callback
// returns the `autorun` will trigger and we'll log "Foo Bar"
transaction(() => {
  name('Foo');
  surname('Bar');
});
```

When you access a signal that you wrote to earlier inside the callback, or access a computed signal that was invalidated by another signal, we'll only update the necessary dependencies to get the current value for the signal you read from. All other invalidated signals will update at the end of the callback function.

```js
import { signal, wrapSignal, autorun, transaction } from 'ya-signals';

const counter = signal(0);
const double = wrapSignal(() => counter.value * 2);
const triple = wrapSignal(() => counter.value * 3);

autorun(() => console.log(double.value, triple.value));

transaction(() => {
  counter(1);
  // Logs: 2, despite being inside transaction, but `triple`
  // will only update once the callback is complete
  console.log(double.value);
});
// Now we reached the end of the transaction and call the autorun
```

Transactions can be nested and updates will be flushed when the outermost transaction call completes.

```js
import { signal, wrapSignal, autorun, transaction } from 'ya-signals';

const counter = signal(0);
autorun(() => console.log(counter.value));

transaction(() => {
  transaction(() => {
    // Signal is invalidated, but update is not flushed because
    // we're still inside another transaction
    counter(1);
  });

  // Still not updated...
});
// Now the callback completed and we'll trigger the autorun.
```

## Extra API

### Simple and fast events abstraction

```typescript
import { event } from 'ya-signals';

const onUserLoggedIn = event();

// subscribe to the event
onUserLoggedIn(listener);

// call the event
onUserLoggedIn.fire();
```

### Automatic unsubscription control

```typescript
un(() => {
  // unsubscribe your event listeners here
});
```

### On demand services

```typescript
import { service, makeObservable, observable } from 'ya-signals';

// AppService.ts

class AppService {
  public lang: string;

  constructor() {
    this.lang = 'ru';

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
import { hook, un } from 'ya-signals';

class RecipeForm {
  constructor() {}
  init() {
    un(() => {
      // destroy
    });
  }
}

export const useRecipeForm = hook(RecipeForm);

// Somewhere in React component
const form = useRecipeForm();
```

**And it can be with params of course**

```typescript
import { reaction, hook, type StructSignalReadonly } from 'ya-signals';

// Can be object struct with named fields
type Params = {
  count: number;
  text: string;
};

class LocalLogic {
  constructor(private params: StructSignalReadonly<Params>) {
    console.log('Count from params', params.count);
  }
  init() {
    reaction(
      () => this.params.text,
      text => {
        console.log('Text updated', text);
      },
    );
  }
}

const useLocalLogic = hook(LocalLogic);
```

The `signal` documentation see [here](#signalinitialvalue).

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
