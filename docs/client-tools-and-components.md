# CopilotKit Angular: Tool Calls, Frontend Tools und Component Rendering

Bei CopilotKit Angular gibt es drei Fälle, die man sauber unterscheiden sollte:

1. Ein Tool läuft im Browser.
2. Das LLM soll eine UI-Komponente auswählen.
3. Ein bestehender Tool Call, insbesondere ein serverseitiger Tool Call, soll visualisiert werden.

Die zentrale Erkenntnis ist: **Nicht jede gerenderte Komponente ist automatisch ein Frontend Tool.** Und nicht jeder Tool Renderer macht das Tool dem LLM bekannt.

## 1. `registerFrontendTool` für echte Client Tools

`registerFrontendTool` verwendet man, wenn das LLM ein Tool aufrufen soll, das im Angular-Client ausgeführt wird.

Typische Beispiele:

- Daten über einen Angular-Service laden
- lokalen App-State ändern
- eine Route öffnen
- eine Aktion im Browser ausführen
- UI-seitige Logik starten

Beispiel:

```ts
registerFrontendTool({
  name: 'getWeather',
  description: 'Fetch and display weather information for a city',
  parameters: z.object({
    city: z.string().describe('City name'),
    units: z.enum(['celsius', 'fahrenheit']).default('celsius'),
  }),
  handler: async ({ city, units }, { signal }) => {
    const result = await inject(WeatherService).fetch(city, units, { signal });
    return JSON.stringify(result);
  },
  component: WeatherToolViewComponent,
});
```

Hier bekommt das LLM Tool-Metadaten: Name, Beschreibung und Parameter. Dadurch kann es das Tool auswählen. Der `handler` läuft im Browser. Die optionale `component` visualisiert den Tool Call im Chat.

Eine mögliche Renderer-Komponente:

```ts
import { Component, input } from '@angular/core';
import { AngularToolCall, ToolRenderer } from '@copilotkit/angular';

type WeatherArgs = {
  city: string;
  units: 'celsius' | 'fahrenheit';
};

@Component({
  selector: 'app-weather-tool-view',
  standalone: true,
  template: `
    @let call = toolCall();

    @if (call.status === 'in-progress') {
      <div class="animate-pulse">
        Preparing weather request for {{ call.args.city }}...
      </div>
    } @else if (call.status === 'executing') {
      <div class="animate-pulse">
        Fetching weather for {{ call.args.city }}...
      </div>
    } @else if (call.status === 'complete') {
      @let data = parse(call.result);

      <div class="rounded border p-4">
        <h3>{{ data.city }}</h3>
        <p>{{ data.temperature }} {{ data.units }}</p>
        <p>{{ data.conditions }}</p>
      </div>
    }
  `,
})
export class WeatherToolViewComponent implements ToolRenderer<WeatherArgs> {
  readonly toolCall = input.required<AngularToolCall<WeatherArgs>>();

  protected parse(result: string) {
    return JSON.parse(result);
  }
}
```

## 2. `registerFrontendTool` für Component-Auswahl durch das LLM

`registerFrontendTool` kann auch verwendet werden, wenn das LLM eine UI-Komponente auswählen soll. Das entspricht konzeptionell dem React-Pattern “Component as Tool”.

Beispiel: Das LLM soll entscheiden können, eine Produktkarte im Chat anzuzeigen.

```ts
registerFrontendTool({
  name: 'showProductCard',
  description: 'Show a product card to the user.',
  parameters: z.object({
    productId: z.string(),
    title: z.string(),
    price: z.number(),
    description: z.string().optional(),
  }),
  handler: async (args) => {
    return JSON.stringify(args);
  },
  component: ProductCardToolViewComponent,
});
```

Die Komponente rendert dann die fachliche UI:

```ts
type ProductCardArgs = {
  productId: string;
  title: string;
  price: number;
  description?: string;
};

@Component({
  selector: 'app-product-card-tool-view',
  standalone: true,
  template: `
    @let call = toolCall();

    @if (call.status === 'in-progress' || call.status === 'executing') {
      <div>Preparing product card...</div>
    } @else if (call.status === 'complete') {
      @let product = parse(call.result);

      <article class="rounded border p-4">
        <h3>{{ product.title }}</h3>
        <p>{{ product.description }}</p>
        <strong>{{ product.price }} €</strong>
      </article>
    }
  `,
})
export class ProductCardToolViewComponent implements ToolRenderer<ProductCardArgs> {
  readonly toolCall = input.required<AngularToolCall<ProductCardArgs>>();

  protected parse(result: string) {
    return JSON.parse(result);
  }
}
```

In diesem Fall ist der `handler` oft nur eine Durchreiche. Die eigentliche Absicht ist nicht “ein Tool ausführen”, sondern: **dem LLM eine auswählbare UI-Komponente anbieten**.

Wichtig: Damit das LLM die Komponente auswählen kann, braucht es Tool-Metadaten. Genau diese liefert `registerFrontendTool`.

## 3. `registerRenderToolCall` für Visualisierung bestehender Tool Calls

`registerRenderToolCall` verwendet man, wenn ein Tool Call bereits existiert und nur im Angular-Client visualisiert werden soll.

Das ist besonders relevant für serverseitige oder agentische Tools.

Beispiel:

```ts
registerRenderToolCall({
  name: 'searchProducts',
  component: ProductSearchToolCallViewComponent,
});
```

Hier wird kein Browser-Tool registriert. Es wird auch kein Handler ausgeführt. Angular sagt nur:

> Wenn im Stream ein Tool Call mit dem Namen `searchProducts` auftaucht, rendere diese Komponente.

Das Tool selbst muss auf Agent- oder Serverseite definiert sein:

```text
Tool name: searchProducts
Description: Search products by query and filters
Parameters: query, category, maxResults
```

Der Renderer kann dann Status, Argumente und Ergebnis darstellen:

```ts
type SearchProductsArgs = {
  query: string;
  category?: string;
  maxResults?: number;
};

@Component({
  selector: 'app-product-search-tool-call-view',
  standalone: true,
  template: `
    @let call = toolCall();

    @if (call.status === 'in-progress') {
      <div>
        Preparing product search...
        <pre>{{ call.args | json }}</pre>
      </div>
    } @else if (call.status === 'executing') {
      <div>Searching products for "{{ call.args.query }}"...</div>
    } @else if (call.status === 'complete') {
      <div>
        <h3>Search complete</h3>
        <pre>{{ call.result }}</pre>
      </div>
    }
  `,
})
export class ProductSearchToolCallViewComponent implements ToolRenderer<SearchProductsArgs> {
  readonly toolCall = input.required<AngularToolCall<SearchProductsArgs>>();
}
```

`registerRenderToolCall` ist damit ideal für:

- Statusanzeigen serverseitiger Tool Calls
- Progress UI
- Anzeige von Tool-Argumenten
- Anzeige von Tool-Ergebnissen
- fachliche Darstellung eines bereits ausgeführten Backend-Tools

## Entscheidungsregel

Die Unterscheidung lässt sich auf eine einfache Regel reduzieren:

```text
Soll das LLM ein Browser-Tool kennen und aufrufen?
→ registerFrontendTool

Soll das LLM eine Komponente auswählen können?
→ registerFrontendTool mit component

Soll ein bereits existierender Tool Call visualisiert werden?
→ registerRenderToolCall
```

Oder noch kürzer:

```text
registerFrontendTool
= Tool wird dem LLM bekannt gemacht und läuft im Client.

registerFrontendTool + component
= Tool wird dem LLM bekannt gemacht und zusätzlich als UI gerendert.

registerRenderToolCall
= bestehender Tool Call wird nur gerendert.
```

## Beispielhafte Benennung

Für fachliche UI-Komponenten sollte der Name die Absicht klar ausdrücken:

```text
showProductCard
→ LLM zeigt eine Produktkarte

openProductDetails
→ LLM löst eine Client-Aktion aus

searchProducts
→ serverseitiges Tool, dessen Status und Ergebnis visualisiert werden
```

Damit bleibt die Architektur sauber: **Tool-Auswahl, Tool-Ausführung und Tool-Visualisierung sind getrennte Konzepte.**
