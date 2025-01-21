# unsubscriber

> Originally from [github.com/re-js/unsubscriber](https://github.com/re-js/unsubscriber).

How to easy collect unsubscribe functions from several sources.

```javascript
import { unsubscriber, collect, attach, run, scope, un } from '.';

const unsubs = unsubscriber();

// Run code and collect unsubscribers
const app = collect(usubs, () => {
  un(() => {
    console.log('unsubscribe');
  });

  attach(scope(), () => {});
  return new App();
});

const detach = attach(usubs, () => {});

run(usubs);
```

Context dependent functions who available into the function body:

```javascript
const app = collect(usubs, () => {
  const detach = un(unsubscriber);
});
```

Enjoy your code!
