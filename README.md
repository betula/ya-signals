# @volga/signals

_Application architecture on MobX._


[![npm version](https://img.shields.io/npm/v/ya-signals?style=flat-square)](https://www.npmjs.com/package/ya-signals) [![npm bundle size](https://img.shields.io/bundlephobia/minzip/ya-signals?style=flat-square)](https://bundlephobia.com/result?p=ya-signals)


## Общие положения

Необходимые методы MobX рекомендовано подключать через эту библиотеку.

```typescript
reaction;
autorun;

observable;
computed;
makeObservable;
makeAutoObservable;
action;
transaction;

observer; // из mobx-react-lite
```

Например:

```typescript
import { makeAutoObservable, observer } from "@volga/signals"

class Some {
  constructor() {
    makeAutoObservable(this, {}, { deep: false });
  }
}

const App = observer(() => {
  return <></>
});
```

## Сервисы

```typescript
import { service, makeAutoObservable, observable } from '@volga/signals';

class AppService {
  public lang: string;

  constructor() {
    makeAutoObservable(this, {}, { deep: false });
  }
}

export const appService = service(AppService);
```

Функция `service` вернет прокси, который инициализирует класс `AppService` при первом использовании, например, когда будет использован `appService.lang`.

```typescript
import { observer } from "@volga/signals";
import { appService } from "./AppService.ts"

export const App = observer(() => {
  return (
    <div className="App">
      <h1>App lang {appService.lang}</h1>
    </div>
  );
});
```

Иногда нужно инициализировать сервис без его явного использования:

```typescript
service.instantiate(appService);
```

## Dependency Injection в Сервисах

Для переопределения класса сервиса в продуктовых пакетах необходимо использовать метод `override`.

```typescript
//./services/customCommandManager.ts

class CustomCommandManager extends CommandManager {
  // override parent
  send() {}
  fetch() {}

  // implement new
  customMethod() {}
}

// customCommandManager will be full feature service
// with types defined from class CustomCommandManager
export const customCommandManager = service.override(commandManager, CustomCommandManager);
```

Если новый сервис расширяет возможности предыдущего (базового), то одназначно имеет смысл размещать его файл рядом с другими сервисами и использовать именно его в данном пакете. Так как функционально он будет идентичным, а тип его будет новым, расширенным.

```typescript
import { customCommandManager } from './services/customCommandManager';

function bootstrap() {
  // ...
  service.instantiate(customCommandManager);
}
```

Если же сервис должен только переопределить некий базовый сервис, не внося какой-либо новой логики, то можно вызывать фазу `override` и в `bootstrap` функции. Такое решение выглядет приемлено, но я бы рекомендовал подумать над этим решением, всё-таки хотелось бы оставить фазу `override` на том же уровне где и вызов функции создания сервисов `service`, но это не требование, нужно глядеть как смотрится.

## Side-эффекты

Сайд-эффекты необходимо создавать внутри отдельного метода `init` внутри класса сервиса. В контексте выполнения этого метода доступна функция `un` для регистрации отписчиков. Именно внутри `init` нужно описывать реакции и реактивные синхронизации через `reaction` и `autorun`.

```typescript
import { makeAutoObservable, reaction } from '@volga/signals';

class AppService {
  public lang: string;

  constructor() {
    makeAutoObservable(this, {}, { deep: false });
  }

  init() {
    reaction(
      () => this.lang,
      lang => {
        console.log('Lang updated', lang);
      },
    );
  }
}
```

При _сложной_ композиции классов нужно организовывать `init` фазу в ручную.

```typescript
class ComplexService {
  logicA = new LogicA();
  logicB = new LogicB();

  init() {
    this.logicA.init();
    this.logicB.init();
  }
}
```

## Моки сервисов (тестирование)

Так же удобно определять моки для сервисов:

```typescript
service.mock(appService, {
  lang: 'en',
});
```

Такой вызов работает очень просто. Инстанция для сервиса задаётся явно в виде объекта и при обращении к сервису, будет просходить обращение к указанному объекту.

А **освобождать моки**, как и сервисы созданные в штатном порядке, можно через `service.destroy(appService)`.
А если вызвать без аргументов, то будут уничтожены все созданные на данный момент сервисы и моки `service.destroy()`.

## Логика компонентов

Логика компонентов должна быть описана в том же стиле, что и логика сервисов. Это классы, которые инстанциируются по требованию к компоненте React, и уничтожаются со смертью компонента. Сайд эффекты инициализируются так же как и в сервисах в методе `init`.

```typescript
import { hook, un } from '@volga/signals';

class RecipeForm {
  title = '';

  constructor() {
    makeAutoObservable(this, {}, { deep: false });
  }

  init() {
    // Сайд-эффекты

    un(() => {
      // unmount phase
    });
  }

  titleInputHander = (event: any) => {
    this.title = event.target.value;
  };
}

export const useRecipeForm = hook(RecipeForm);
```

Описываются они эквивалентным образом как сервисы, для единства стиля и управления реактивными взаимодействиями. Только используется метод `hook`, который возвращает хук для подключения в React компонент.

```typescript
import { useRecipeForm } from "./useRecipeForm.ts";

const Form = () => {
  const form = useRecipeForm(); // Somewhere in React component

  return (
    <form>
      <input value={form.title} onChange={form.titleInputHander} />
    </form>
  )
}
```

### Если нужны параметры

```typescript
import { reaction, hook, type StructSignalReadonly } from '@volga/signals';

// Can be object struct with named fields or tuple
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

И используем хук с параметрами в любом React компоненте

```typescript
import { useRecipeForm } from "./recipe-form.ts";

function Form() {
  const [count, setCount] = useState(() => 1);
  const [text, setText] = useState(() => "Hello");
  const logic = useLocalLogic({ count, text });

  return <>
  // ...
}
```

Для передачи параметров используется `signal`. Документацию по нему можно найти [здесь](DOCUMENTATION.md#signalinitialvalue).

## Сигналы-структуры

**Этот кейс, для больших и сложных (complex) Реакт компонентов с ожидаемой глубокой вложенностью.**

> Если значение не используется в дочернем компоненте, а используется в его потомках (дочерний дочернего), то оборачиваем в сигналы (useStructSignal, useSignal), что бы исключить неожиданный ререндер родителей.

С помощью сигналов хотелось бы иметь возможность удобно передавать конкретные свойства в общие компоненты без утери контроля над обновлениями реакт компонентов и потери контекса подписки в сервисах.

> **Это подход должен быть использован только как оптимизация.
> А оптимизация как известно должна быть только там где она нужна, лучше используйте более простые возможности когда оптимизация преждевремена.**

```typescript
import { useStructSignal, useSignal, observer, hook } from "@volga/signals"

const ParentComponent = () => {
  const [value, setValue] = useState();

  // variant 1
  const props1 = useStructSignal(() => ({
    scroll: viewportState.scroll, // scroll это Observable getter
    height: viewportState.y.viewportSize, // y это Observable
    width: viewportState.x.viewportSize, // y это Observable
    zoom: viewportState.zoom, // zoom это Observable
  })); // => StructSignalReadonly<{...}>

  // variant 2
  const props2 = useMemo(
    () => ({
      get zoom() {
        return viewportState.zoom;
      },
      get scroll() {
        return viewportState.scroll;
      },
      get height() {
        return viewportState.y.viewportSize;
      },
      get width() {
        return viewportState.x.viewportSize;
      },
    }),
    [],
  ); // => {...}

// variant 1
  const scroll1 = useSignal(() => canvasProps.scroll); // SignalReadonly<XY>

// variant 2
  const scroll2 = useMemo(
    () => ({
      get value() {
        return canvasProps.scroll;
      },
    }),
    [],
  ); // { value: XY }

  return <Child commonProps={props1 || props2} scroll={scroll1 || scroll2} someReactProperty={value} />;
};


// rerenders only when zoom changes!
const Child = observer(({ commonProps, scroll }) => {
  return (
    <>
      <p>{commonProps.zoom}</p> // subscribe only to zoom property
      <ChildOfChild scroll={scroll} />
    </>
  );
});

class LocalLogic {
  constructor(private params: StructSignalReadonly<{ scroll: SignalReadonly<XY> }>) {
    makeAutoObservable(this, {}, { deep: false });
  }

  get strangeDiff() {
    return this.params.scroll.value.x - this.params.scroll.value.y;
  }
}

const useLocalLogic = hook(LocalLogic);

const ChildOfChild = observer(({ scroll }) => {
  const { strangeDiff } = useLocalLogic({ scroll });

  return <p>strange difference is {strangeDiff}</p>;
});
```

## Модульные события

При Проектировании систем довольно часто используют паттерн EventEmitter. И бросают через один эмиттер множество типов эвентов.

В следствии EventEmitter должен при описании типов знать обо всех типах эвентов, а если просто сказать, то он должен включать в себя все эвенты сразу.

Проблема появляется при модульных системах и расширяемых системах. При появлении плагинов которые тоже хотят реализовать свои евенты в шину. А так как обычно шина это один EventEmitter, то его плагинизация является невозможным по определению в TypeScript.

В таких случае очень приятно кодировать модули и плагины, которые могут иметь свой собственный набор ивентов, состояний и логики.

Пример кодирования интерфейса событий такого модуля:

```typescript
export const onPastToClipboard = event<ClipboardType>();
```

Либо использование внутри класса:

```typescript
import { event } from "@volga/signals"

class ClipboardPlugin {
  public onPastToClipboard = event<ClipboardType>()

  someMethod() {
    // fire event
    this.onPastToClipboard.fire({ ... });
  }

  constructor() {
    // Event subscription
    this.onPastToClipboard((clipboard) => {
      // ...
    });
  }
}
```

Обычной практикой канонического ООП является наследование от EventEmitter, что бы иметь возможность бросать события у сущности.
Но это порождает во первых рост цепочки наследования.
А с другой стороны нивелирует преимущества паттерна Композиция.

Имея такие эвенты, которые предоставляет evemin можно не только отказаться от проблем общей шины и наследования, а ещё и воспользоваться преимуществом и наглядностью паттерна композиция. На примере выше любой плагин сможет поставлять какое угодно количество событий кого-то угодно типа, изолированно от других плагинов и в 2 раза быстрее чем EventEmitter.

## API Reference

- [Documentation](DOCUMENTATION.md)
