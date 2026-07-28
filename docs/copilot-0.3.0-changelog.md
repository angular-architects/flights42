# Changelog: CopilotKit-Migration 0.2.0 → 0.3.0 (Buch- und Slide-Impact)

Dieser Changelog fasst zusammen, was die Migration gemäß
[copilot-migration.md](copilot-migration.md) §8 am Repo geändert hat — aus der
Perspektive: _Welche Stellen im Buch und in den Workshop-Slides, die auf diesem
Repo basieren, müssen angepasst werden?_ Ausführliche Begründungen und
Verifikationsdetails stehen im dortigen `## Migration log`.

Stand: 2026-07-28, Branch `copilotkit-v0.3.0`. Paketstand:
`@copilotkit/angular` **0.3.0** (Core 1.63.2), neu `@ag-ui/mcp-apps-middleware`
**0.0.3**, entfernt `@copilotkit/runtime`.

---

## 1. Fallback-Tool-Karte: eigene Komponente → `defaultToolRendering`

**Vorher (Buch/Slides):** Eigene `FallbackToolCard` plus Registrierung eines
`'*'`-Wildcard-Renderers in `initAgentStore`; Frontend-Tools ohne Komponente
bekamen die Karte als Default (`component: tool.component || FallbackToolCard`).

**Nachher:** Beides gelöscht. Ein Flag übernimmt:

```ts
provideCopilotKit({
  defaultToolRendering: true,
  ...
});
```

Unbekannte bzw. komponentenlose Tool-Calls rendert CopilotKits eingebauter
`CopilotDefaultToolRenderer` (aufklappbare Karte, funktional äquivalent).
Auflösungsreihenfolge in `RenderToolCalls`: benannter Renderer → Client-Tool
mit Komponente → HITL → `'*'` → Built-in-Default.

**Folge-Anpassung:** `injectWidgetToolNames()` erkennt Widgets nicht mehr über
`component !== FallbackToolCard`, sondern über `component !== undefined`.

**Gelöscht:** `src/app/domains/shared/util-copilotkit/fallback-tool-card.ts`.

**Slide-Check:** Jede Folie, die die FallbackToolCard, das `'*'`-Pattern oder
"eigene Fallback-Karte bauen" zeigt → ersetzen durch das Flag; die eigene
Karte taugt jetzt höchstens noch als "so würde man es selbst bauen"-Exkurs.

## 2. Interrupts: Hand-Plumbing → `injectInterrupt`

**Vorher:** Drei handgeschriebene Bausteine, die im Buch vermutlich einzeln
erklärt sind:

1. Signal-Priming-Hack (`getPendingInterrupts` las `isRunning()`/`messages()`
   nur, um Recomputation zu erzwingen, weil `agent.pendingInterrupts` eine
   plain property ist);
2. `resumeInterrupt`-Helper mit `buildResumeArray`;
3. optimistisches Ausblenden per `resolvedInterruptId`-Signal in
   `chat-messages.ts`.

**Nachher:** Alle drei gelöscht. `assistant-chat.ts` hält einen Controller:

```ts
private readonly interruptController = injectInterrupt({
  agentId: computed(() => this.agentId() ?? undefined),
});

protected readonly interrupts = computed<Interrupt[]>(() =>
  this.isRunning() ? [] : [...this.interruptController.interrupts()],
);

protected onResumeInterrupt(event: ResumeInterruptEvent): void {
  void this.interruptController.resolve(event.payload, event.interruptId);
}
```

Der Controller ist headless und `agentId`-scoped (Signal → folgt dem
Chat-Wechsel der `ChatRegistry`), bringt Double-Submit-Guard und
Stale-Decision-Clearing mit. Die **Interrupt-UI bleibt unsere**:
`chat-messages.ts` mappt weiterhin `metadata.suspendPayload.options` auf
Buttons — gute Slide-Botschaft: _CopilotKit übernimmt die State-Machine, nicht
die Bubble._

**Neuer, erklärungswürdiger Kniff (Buch!):** `injectInterrupt.resolve()` hängt
clientseitig eine synthetische `role:'tool'`-Message für den unterbrochenen
Tool-Call an. Das ist das Client-Gegenstück zu CopilotKits eigenen
Executor-losen „interrupt tools" (BuiltInAgent, `interrupt.id === toolCallId`,
Reason `"tool_call"`: die Human-Response IST das Tool-Ergebnis). Bei uns
produziert aber Mastras `approveToolCall`/`resumeStream` das autoritative
Tool-Ergebnis — genau so, wie es die AG-UI-Spec vorsieht („it emits
ToolCallResult against the original toolCallId"); die synthetische Message
würde in `RenderToolCalls` (first-match) das echte Buchungsergebnis
verschatten → Action-Card zeigte "Failed". Darum, gescoped auf die Reasons
unseres Servers:

```ts
const SERVER_RESUMED_INTERRUPT_REASONS = new Set([
  'human_approval',
  'tool_suspended',
]);

override addMessage(message: Message): void {
  if (
    message.role === 'tool' &&
    (this.pendingInterrupts ?? []).some(
      (interrupt) =>
        interrupt.toolCallId === message.toolCallId &&
        SERVER_RESUMED_INTERRUPT_REASONS.has(interrupt.reason),
    )
  ) {
    return;
  }
  super.addMessage(message);
}
```

(`AppHttpAgent`). Das Reason-Gate lässt CopilotKit-artige Interrupt-Tools
(Reason `"tool_call"`) unangetastet — relevant, falls die Demo später beide
HITL-Muster nebeneinander zeigt. Wire-Format des Resume ist unverändert
(`[{ interruptId, status: 'resolved', payload }]`) — Serverseite unberührt.
Upstream-Issue [#6201](https://github.com/CopilotKit/CopilotKit/issues/6201)
schlägt vor, die Synthese in CopilotKit selbst zu gaten;
sobald das landet, fliegt der Override ersatzlos raus.

**Abhängigkeit:** Der Controller sendet beim Resume nur `{ resume }` —
Agent-Mode via forwardedProps überlebt nur, weil `AppHttpAgent` sie in jeden
Request injiziert. `AppHttpAgent` bleibt also load-bearing (bis PR #6076).

## 3. Kontext: `AppHttpAgent`-Merge → `connectAgentContext` + `agentIds`

**Vorher:** `initAgentStore({ context: () => [...] })`; `AppHttpAgent`
dedupte persistente `Context[]`-Einträge per Description in jeden Request
(`mergePersistentContext`).

**Nachher:** Option und Merge gelöscht — und die Stores wissen vom Katalog gar
nichts mehr. `initAgentStore` erledigt die vierte Per-Agent-Registrierung, neben
`registerFrontendTool`, `registerRenderToolCall` und `registerHumanInTheLoop`:

```ts
const catalog = inject(A2UI_CUSTOM_CATALOG, { optional: true });

if (catalog) {
  const entry = inject(A2UI_SEND_CATALOG_DESCRIPTION)
    ? catalogToContextEntry(catalog)
    : catalogIdToContextEntry(catalog.id);

  connectAgentContext(() => ({ ...entry, agentIds: [config.agentId] }));
}
```

Am Call-Site steht dazu **nichts** mehr — weder in
`ticketing-agent-store.ts` noch in `dashboard-agent-store.ts`:

```ts
initAgentStore({ agentId: AGENT_ID, url, ... });
```

`inject(..., { optional: true })` ist hier der Kniff: eine App ohne
`provideA2uiCatalog` braucht keinen Provider, ihre Agenten bekommen schlicht
keinen Katalog-Context-Eintrag — kein Flag, keine Fallunterscheidung im Store.

Per-Agent-Scoping läuft weiterhin über `ScopedContext.agentIds` (Core 1.63.2);
die Server-Extraktion per Description bleibt identisch. Die Reihenfolge ist
unkritisch: `connectAgentContext` registriert im ContextStore, gelesen wird erst
zur Request-Zeit.

**Verhaltensänderung (wichtig!):** Voll-Deskriptor vs. nur Katalog-Id ist jetzt
eine reine App-Entscheidung, keine Per-Agent-Entscheidung mehr — die
Unterscheidung aus Commit `014b743` („dashboard agent only gets the custom
catalog id") gibt es nicht mehr. Die App läuft dazu neu auf
`sendCatalogDescription: false`, d. h. **beide** Agenten bekommen nur noch
`{ catalogId, components: {} }`.

Für unseren Demo-Server heißt das: `catalogToPromptSection` findet keine
Komponenten und liefert `''` — die Custom-Catalog-Sektion fällt aus dem
System-Prompt. `extractCatalogId` liefert weiterhin die Id, Surfaces entstehen
also mit dem richtigen `catalogId`, aber das Modell erfährt nichts mehr über
`TicketWidget` und wird es folglich nicht anfordern. Das ist genau die
Produktions-Variante (Server hat seine eigene, vertrauenswürdige Registry) — für
die Live-Demo des Custom-Katalogs muss das Flag auf `true` bzw. weggelassen
werden.

**Der Katalog-Token bleibt, wird aber nur noch einmal injiziert.** Vorher holte
ihn _jeder_ Store per `inject(A2UI_CUSTOM_CATALOG)` heraus, serialisierte selbst
und hängte `agentIds` an — dieselben vier Zeilen an zwei Stellen. Jetzt liest
ihn nur die Facade, zusammen mit der Policy `A2UI_SEND_CATALOG_DESCRIPTION`
(`providedIn: 'root'`, Default `true`).

**`provideA2uiCatalog(catalog, options)`** bleibt in der Signatur unverändert:

```ts
provideA2uiCatalog(customCatalog, { sendCatalogDescription: false }); // app.config.ts
provideA2uiCatalog(customCatalog); // voller Deskriptor
provideA2uiCatalog(); // nur BasicCatalog
```

Der Provider registriert drei Dinge: den Renderer-Katalog
(`A2UI_RENDERER_CONFIG`, gebaut als `BasicCatalogBase` mit den
Custom-Komponenten), den Deskriptor am `A2UI_CUSTOM_CATALOG`-Token und die
Policy. Was er _nicht_ mehr tut: den Deskriptor vorab strippen — das entscheidet
jetzt `initAgentStore` beim Serialisieren.

**Slide-Wert:** die `initAgentStore`-Facade behandelt Kontext wie Tools und HITL
— App-weite Werte kommen aus DI (`inject(..., { optional: true })`), im
Config-Objekt steht nur, was sich pro Agent unterscheidet.

**Slide-Check:** Folien zum "Context-Merging im eigenen HttpAgent" streichen;
stattdessen `connectAgentContext` (+ `agentIds`-Scoping als Feature zeigen).

## 4. Shared State: Entscheidung — Pull-Factory bleibt (wichtig fürs Buch)

Die dokumentierte CopilotKit-Schreibseite (`agent.setState()`) wurde geprüft
und **bewusst nicht übernommen**: `setState` benachrichtigt
`onStateChanged`-Subscriber; zusammen mit dem Mirror-Effect
(`store().state()` → `TravelPlanStore.setPlan`) entsteht ein
Endlos-Feedback-Loop (jeder Zyklus erzeugt per `structuredClone` neue
Referenzen). Die `state`-Factory (`state: () => planStore.plan()`) ist
Pull-Modell, kann nie stale sein und bleibt.

**Buch-Botschaft:** Lesen nativ über `store().state()` (dok. API), Schreiben
bewusst per Request-Zeit-Factory statt `setState()` — mit dem Loop als
Begründung. Das ist eine begründete Abweichung von der offiziellen Doku und
damit eher Buch-Stoff als Korrektur.

## 5. MCP Apps: Eigenbau-Host → offizieller Stack (größte Änderung!)

Architektur-Umbau — jede MCP-Apps-Folie ist betroffen.

**Vorher:**

- Browser verband sich **direkt** mit dem MCP-Server
  (`http://127.0.0.1:3002/mcp`): eigener MCP `Client`, `AppBridge`,
  Sandbox-iframe (`mcp-apps-widget.ts` u. a.).
- Serverseitig registrierte `@mastra/mcp`s `MCPClient.listTools()` die Tools
  (`hotels_findHotels`) am Mastra-Agenten; `ExtendedMastraAgent` schnüffelte
  `_meta.ui` und emittierte den `mcp-apps`-`ACTIVITY_SNAPSHOT` selbst.

**Nachher (Hybrid — Revision vom 2026-07-29):** Die Tool-Ausführung bleibt
auf Agent-Ebene („Mastra-Bordmittel zuerst", wie ursprünglich entschieden);
nur Host und Proxy-Transport kommen von CopilotKit.

- **Server, Tool-Ausführung (unverändert nativ):** `ticketing-agent.ts`
  registriert die MCP-Tools weiterhin per `MCPClient.listTools()` —
  `hotels_findHotels` ist ein normales Mastra-Tool, läuft mid-run, der Agent
  sieht das Ergebnis. `ExtendedMastraAgent` behält das `_meta.ui`-Sniffing
  und emittiert den `mcp-apps`-`ACTIVITY_SNAPSHOT` selbst — neu darin nur
  das Feld `serverHash` (vom 0.3.0-Renderer zwingend erwartet; die Route
  rechnet es mit `getServerHash` aus derselben Server-Config und reicht es
  als `mcpAppsServerHashes` in die Bridge).
- **Server, Proxy:** `@ag-ui/mcp-apps-middleware` wickelt **keine** normalen
  Runs — sie beantwortet in der Route nur `__proxiedMCPRequest`-Runs des
  Widgets (resources/read, tools/call), ganz ohne Agent/LLM:

  ```ts
  const middleware = mcpAppsProxyFor(parsed.input.forwardedProps);
  // nur bei __proxiedMCPRequest: middleware.run(input, agent), sonst agent.run(input)
  ```

- **Client:** eine Zeile —

  ```ts
  import { provideMCPApps } from '@copilotkit/angular/mcp-apps';

  provideMCPApps({ hostInfo: {...}, hostContext: {...} });
  ```

  MCP-Traffic der iframe-Apps läuft als `__proxiedMCPRequest` durch den
  AG-UI-Agenten (Server-URLs erreichen den Browser nie mehr) — das
  Produktions-Argument (Auth, keine CORS-Fläche, MCP-Server nicht öffentlich)
  ist eine eigene Folie wert.

**Konsequenzen im Detail:**

- Toolname im Prompt bleibt `hotels_findHotels` (Mastra-Präfix, native
  Registrierung).
- `USE_MCP=true` heißt: Mastra kennt die MCP-Tools **und** die Route hält den
  Proxy + `serverHash` bereit.
- Der Top-Level-`listTools()`-Await bleibt: ai-server-Start braucht :3002
  (bekannte Macke, unverändert zum Vorher-Zustand).
- `AppHttpAgent`: Server-Memory-Filter wird bei `__proxiedMCPRequest`-Runs
  übersprungen (sonst könnte ein Widget-Refresh eine User-Message als
  "gesendet" markieren, bevor das Modell sie sah).
- Proxied Runs laufen über denselben Agenten → `isRunning()` ist während
  Widget-Refreshes kurz true (Composer zeigt Stop). Kosmetik.

**Gelöscht bleibt (Client):** `mcp-apps-widget.ts`,
`mcp-apps-activity-renderer.ts`, `mcp-apps-content.ts`,
`mcp-apps.provider.ts` (inkl. unserer `provideMcp`/`provideMcpApps`-Provider
— Namenskollision mit CopilotKits `provideMCPApps` damit erledigt).

**Verworfen (Zwischenstand vom 2026-07-28):** die Variante, bei der die
Middleware auch normale Runs wickelte und `findHotels` als AG-UI-Client-Tool
erst nach dem LLM-Turn ausführte — sie widersprach der früheren Entscheidung,
MCP-Tools auf Agent-Ebene einzuklinken.

**Unverändert:** der MCP-Server selbst (`mcp-server/`) inkl. CORS-Header —
die braucht weiterhin die standalone `mcp-apps-demo`, die den Browser-Host
noch zeigt. Wenn die Demo im Workshop den "so baut man den Host selbst"-Teil
trägt, bleibt sie gültig; die Flights-App zeigt jetzt den offiziellen Weg.

## 6. Kleinere Änderungen

- **`@copilotkit/runtime` entfernt** (war nie importiert; D3-Entscheidung
  gegen Copilot Runtime bleibt). Nebeneffekt: kein
  `@segment/analytics-node`-Warning mehr im Build.
- **`CopilotActivity` bleibt**, konsumiert aber
  `copilotKit.activityMessageRenderConfigs()` — der Computed merged in 0.3.0
  auch die per Multi-Token registrierten Built-in-Renderer (so erreicht
  `provideMCPApps()` unsere Custom-Shell). Löschbar erst, wenn PR #6033
  (Standalone-Dispatch-Komponente) landet.
- **A2UI-Katalog-Typen konsolidiert:** Es gab zwei fast identische Entry-Typen
  — `CustomCatalogEntry` (typisiert, in `a2ui-schema.ts`) und
  `A2uiCustomCatalogComponent` (erodiert: `component: Type<unknown>`,
  `schema: ZodTypeAny`, in `types.ts`). `ticketing-extra-components.ts` warf
  über die Annotation `: A2uiCustomCatalogComponent[]` genau die präzisen
  Typen wieder weg, die `createCustomComponent` gerade erzeugt hatte.
  Jetzt: **ein** generischer Typ `A2uiCustomCatalogComponent<TName, TSchema>`
  samt `createCustomComponent`/`createCustomFunction`/`createCustomCatalog` in
  `types.ts`; `a2ui-schema.ts` behält nur noch die Schema-Helfer (`binding`,
  `ContextFromSchema`), die die Widget-Contexts importieren; die Annotation an
  `ticketingExtraComponents` entfällt.

  **Warum nicht die SDK-Typen (`ComponentApi` / `AngularComponentImplementation`)?**
  Drei Gründe, alle buchtauglich: (1) `ComponentApi` ist `{ name, schema }` —
  **kein `description`**, das aber genau der Teil ist, den
  `catalogToContextEntry` in den Agenten-Context schreibt; (2)
  `AngularComponentImplementation.component` ist `Type<CatalogComponentInstance>`
  mit `props: Signal<Record<string, unknown>>`, unser Typ hält `TSchema` fest
  und leitet daraus `Signal<ContextFromSchema<TSchema>>` ab (TicketWidget wird
  gegen sein Schema geprüft); (3) die zod-Identität — App hat zod 4 (`zod/v3`-
  Subpath), `@a2ui/web_core` bundelt zod 3.25 im eigenen `node_modules`. Die
  SDK-Typen zu übernehmen entfernt den Mismatch nicht, es verteilt ihn: der
  Cast säße dann an jeder Komponenten-Definition statt einmal im Adapter
  (`toAngularComponentImplementation` / `toFunctionImplementation`).

- **`a2ui-surface`-Klasse** am Legacy-A2UI-Wrapper (semantische
  `a2ui-*`-Klassenkonvention; die übrigen Klassen emittiert der
  v0_9-Renderer ohnehin).
- **`@ag-ui/mastra`-Befund:** 1.1.1 fixt das Multimodal-Stripping (Check-in
  Workaround könnte weg), zieht aber Peer-Deps auf `@copilotkit/runtime` und
  `@mastra/core >= 1.29` nach — Pin bleibt auf 1.0.0, Workaround bleibt.
  Buch-Fußnote wert.

## 7. Bewusst NICHT geändert (Slides behalten ihre Gültigkeit)

- **Custom Chat-Shell** (Option 2 aus migration.md): Panel, Composer,
  Autoscroll, Bubbles — alles unverändert.
- **Legacy-A2UI-Stack** (`@a2ui/angular/v0_9`, eigener Katalog,
  `render-a2ui-tool`, Dashboard-DSL): CopilotKit-Kataloge sind Lit-only (D2).
- **Die drei Test-Strategie-Specs** (agui-mock, aimock, mock-agent):
  unangetastet, weiterhin Workshop-Material.
- **`registerHumanInTheLoop`-Plumbing**: weiter vorhanden und unbenutzt
  (Approvals bleiben Backend-Checkpoints).
- **`hiddenToolNames`**, Step-Bridge, Thought-Signature-Cache, Guardrails,
  Server-Memory-Filter: unverändert.
- **`@ag-ui/mastra`-Pin 1.0.0** und der Multimodal-Workaround.

## 8. Checkliste Buch / Slides

| Thema                                | Aktion                                                                                                                                                                                                                    |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Fallback-Tool-Karte / `'*'`-Renderer | Ersetzen durch `defaultToolRendering: true`; eigene Karte allenfalls als Exkurs                                                                                                                                           |
| `initAgentStore`-Signatur            | `context`-Option existiert nicht mehr; Katalog kommt per `inject(A2UI_CUSTOM_CATALOG, { optional: true })`; Frontend-Tools ohne `component`-Default                                                                       |
| Interrupt-Kapitel                    | Neu: `injectInterrupt`-Controller; Hack + `buildResumeArray` + `resolvedInterruptId` raus; `addMessage`-Guard als neue Subtilität erklären                                                                                |
| Kontext-Kapitel                      | `connectAgentContext` + `agentIds`-Scoping statt `AppHttpAgent`-Merge; Katalog-Token raus, Katalog + Policy injiziert `initAgentStore` selbst, Stores kennen ihn nicht mehr; `provideA2uiCatalog` nimmt ein Config-Objekt |
| Shared-State-Kapitel                 | Lesen unverändert; Schreib-Entscheidung (Factory statt `setState`, Loop-Begründung) ergänzen                                                                                                                              |
| MCP-Apps-Kapitel                     | Hybrid erzählen: Tools nativ auf Agent-Ebene + Snapshot aus der Bridge (mit `serverHash`); `provideMCPApps` als Host, Middleware nur als Proxy; gelöschter Eigenbau-Host                                                  |
| `AppHttpAgent`-Folie                 | Neue Job-Liste: forwardedProps, `state`-Factory, Server-Memory-Filter, Interrupt-Guard, Proxied-Request-Guard — kein Context-Merge mehr                                                                                   |
| Architektur-Diagramme                | Browser↔MCP-Server-Pfeil entfernen; MCP-Traffic läuft durch die AG-UI-Route                                                                                                                                               |
| Abhängigkeiten-Folie                 | `@copilotkit/angular@0.3.0`, `@ag-ui/mcp-apps-middleware`, kein `@copilotkit/runtime`                                                                                                                                     |
| A2UI-Katalog-Typen                   | Ein Entry-Typ `A2uiCustomCatalogComponent<TName, TSchema>` in `types.ts`; `CustomCatalogEntry` raus; Begründung „warum nicht SDK-Typen" als Exkurs                                                                        |
