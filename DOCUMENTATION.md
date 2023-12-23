# Ya Signals

_React application architecture on MobX._

## Installation

```bash
npm install ya-signals
```

- [Ya Signals](#ya-signals)
  - [Installation](#installation)
  - [React Integration](#react-integration)
  - [Guide / API](#guide--api)
    - [`signal(initialValue)`](#signalinitialvalue)
    - [`wrap(fn)`](#wrapfn)
    - [`autorun(fn)`](#autorunfn)
    - [`reaction(fn,fn)`](#reactionfnfn)
    - [`sync(fn,fn)`](#syncfnfn)
    - [`when(fn)`](#whenfn)
    - [`untracked(fn)`](#untrackedfn)
    - [`transaction(fn)`](#transactionfn)
  - [Extra API](#extra-api)
    - [Simple and fast actions abstraction](#simple-and-fast-actions-abstraction)
    - [Automatic unsubscription control](#automatic-unsubscription-control)
    - [On demand services](#on-demand-services)
    - [Isolated services scope for SSR support](#isolated-services-scope-for-ssr-support)
    - [Describe component logic in OOP-style](#describe-component-logic-in-oop-style)
  - [License](#license)

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
import { signal } from "ya-signals";

const counter = signal(0);

// Read value from signal, logs: 0
console.log(counter.value);

// Write to a signal
counter(1);
```

Writing to a signal is done by calling as a function. Changing a signal's value synchronously updates every [computed](#computedfn) and [autorun](#autorunfn) that depends on that signal, ensuring your app state is always consistent.

### `wrap(fn)`

Data is often derived from other pieces of existing data. The `wrap` function lets you combine the values of multiple signals into a new signal that can be reacted to, or even used by additional computeds. When the signals accessed from within a computed callback change, the computed callback is re-executed and its new return value becomes the computed signal's value.

```js
import { signal, wrap } from "ya-signals";

const name = signal("Jane");
const surname = signal("Doe");

const fullName = wrap(() => name.value + " " + surname.value);

// Logs: "Jane Doe"
console.log(fullName.value);

// Updates flow through wrap, but only if someone
// subscribes to it. More on that later.
name("John");
// Logs: "John Doe"
console.log(fullName.value);
```

Any signal that is accessed inside the `wrap`'s callback function will be automatically subscribed to and tracked as a dependency of the struct computed signal.

### `autorun(fn)`

The `autorun` function is the last piece that makes everything reactive. When you access a signal inside its callback function, that signal and every dependency of said signal will be activated and subscribed to. In that regard it is very similar to [`wrap(fn)`](#wrapfn). By default all updates are lazy, so nothing will update until you access a signal inside `autorun`.

```js
import { signal, wrap, autorun } from "ya-signals";

const name = signal("Jane");
const surname = signal("Doe");
const fullName = wrap(() => name.value + " " + surname.value);

// Logs: "Jane Doe"
autorun(() => console.log(fullName.value));

// Updating one of its dependencies will automatically trigger
// the autorun above, and will print "John Doe" to the console.
name("John");
```

You can destroy an autorun and unsubscribe from all signals it was subscribed to, by calling the returned function.

```js
import { signal, wrap, autorun } from "ya-signals";

const name = signal("Jane");
const surname = signal("Doe");
const fullName = wrap(() => name.value + " " + surname.value);

// Logs: "Jane Doe"
const dispose = autorun(() => console.log(fullName.value));

// Destroy autorun and subscriptions
dispose();

// Update does nothing, because no one is subscribed anymore.
// Even the computed `fullName` signal won't change, because it knows
// that no one listens to it.
surname("Doe 2");
```

### `reaction(fn,fn)`

`reaction` is like [`autorun`](#autorunfn), but gives more fine grained control on which signals will be tracked. It takes two functions: the first, data function, is tracked and returns the data that is used as input for the second, effect function. It is important to note that the side effect only reacts to data that was accessed in the data function, which might be less than the data that is actually used in the effect function.

The typical pattern is that you produce the things you need in your side effect in the data function, and in that way control more precisely when the effect triggers. By default, the result of the data function has to change in order for the effect function to be triggered.

```typescript
import { signal, reaction } from "ya-signals"

class Animal {
  name = signal(0)
  energyLevel = signal(0)

  constructor(name) {
    this.name(name)
    this.energyLevel(100)
  }

  reduceEnergy() {
    this.energyLevel.update(v => v - 10)
  }

  get isHungry() {
    return this.energyLevel.value < 50
  }
}

const giraffe = new Animal("Gary")

reaction(
  () => giraffe.isHungry,
  isHungry => {
    if (isHungry) {
        console.log("Now I'm hungry!")
    } else {
        console.log("I'm not hungry!")
    }
    console.log("Energy level:", giraffe.energyLevel)
  }
)

console.log("Now let's change state!")
for (let i = 0; i < 10; i++) {
  giraffe.reduceEnergy()
}
```

### `sync(fn,fn)`

`sync` is like [`reaction`](#reactionfnfn), but the effect function should immediately be triggered after the first run of the data function.

```typescript
import { sync } from "ya-signals"

class List {
  constructor(authService) {
    sync(
      () => authService.isLoggedIn, // data function
      (loggedIn) => {               // effect function
        if (loggedIn) {
          this.initUserData()
        } else {
          this.clearUserData()
        }
      }
    )
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
	effectCount(untracked(() => {
    return effectCount.value + 1;
  }));
});
```

### `transaction(fn)`

The `transaction` function allows you to combine multiple signal writes into one single update that is triggered at the end when the callback completes.

```js
import { signal, wrap, autorun, transaction } from "ya-signals";

const name = signal("Jane");
const surname = signal("Doe");
const fullName = wrap(() => name.value + " " + surname.value);

// Logs: "Jane Doe"
autorun(() => console.log(fullName.value));

// Combines both signal writes into one update. Once the callback
// returns the `autorun` will trigger and we'll log "Foo Bar"
transaction(() => {
	name("Foo");
	surname("Bar");
});
```

When you access a signal that you wrote to earlier inside the callback, or access a computed signal that was invalidated by another signal, we'll only update the necessary dependencies to get the current value for the signal you read from. All other invalidated signals will update at the end of the callback function.

```js
import { signal, wrap, autorun, transaction } from "ya-signals";

const counter = signal(0);
const double = wrap(() => counter.value * 2);
const triple = wrap(() => counter.value * 3);

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
import { signal, wrap, autorun, transaction } from "ya-signals";

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

### Simple and fast actions abstraction

```typescript
import { action } from "ya-signals";

const userLoggedIn = action()

// subscribe to the action
userLoggedIn.subscribe(listener)

// call the action
userLoggedIn()
```

### Automatic unsubscription control

```typescript
un(() => {
  // unsubscribe your event listeners here
})
```

### On demand services

```typescript
import { service, un } from "ya-signals";

class UserServer {
  constructor() {
    un(() => {
      // destroy
    })
  }
}

// On demand service abstraction
export const userService = service(UserServer)

// If you run `userService.user` it's get user property for on demand created service
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

### Isolated services scope for SSR support

Isolation of async scopes (only in node environment)

Run your app in isolated Service Provider scope. All instances cached for this will be isolated from all cached instances in other scopes. Useful for implementing SSR.

```typescript
import { isolate } from "provi/ssr"

const html = await isolate(async () => {
  // Isolated instance of appService created on demand here, 
  // by calling run method contains state initialization requests
  await appService.run();
  // ...
  return ReactDOMServer.renderToString(<App />);
});
```

Each isolated instance will be destroyed at the end of the isolated asynchronous function.

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
