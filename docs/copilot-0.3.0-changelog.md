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

**Nachher:** Option und Merge gelöscht. An den zwei Call-Sites:

```ts
const catalogContext = {
  ...catalogToContextEntry(inject(A2UI_CUSTOM_CATALOG)),
  agentIds: [AGENT_ID],
};
connectAgentContext(() => catalogContext);
```

Per-Agent-Scoping läuft über `ScopedContext.agentIds` (Core 1.63.2):
Ticketing sendet den vollen Katalog, das Dashboard nur die Katalog-Id — die
Server-Extraktion per Description bleibt identisch.

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

**Nachher:**

- **Server:** `@ag-ui/mcp-apps-middleware` (plain AG-UI `Middleware`, **kein**
  Copilot Runtime!) wickelt in der Hono-Route den `ExtendedMastraAgent` ein:

  ```ts
  const hotelsMcpApps = new MCPAppsMiddleware({
    mcpServers: [
      { type: 'http', url: HOTELS_MCP_SERVER_URL, serverId: 'hotels' },
    ],
  });
  // in der Route:
  middleware.run(input, agent); // statt agent.run(input)
  ```

  Die Middleware entdeckt UI-Tools über SEP-1865-Metadaten
  (`_meta["ui/resourceUri"]` — ext-apps' `registerAppTool` stempelt den
  flachen Key automatisch neben `_meta.ui.resourceUri`), injiziert sie als
  AG-UI-**Client**-Tools, führt offene Calls am Run-Ende selbst aus und
  emittiert `TOOL_CALL_RESULT` + `ACTIVITY_SNAPSHOT` (mit `serverHash`,
  required!) vor dem zurückgehaltenen `RUN_FINISHED`.

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

- Toolname im Prompt: `hotels_findHotels` → **`findHotels`** (Middleware
  announced rohe MCP-Namen).
- `ticketing-agent.ts`: kein `MCPClient.listTools()` mehr; `USE_MCP=true`
  heißt jetzt "Route wickelt Middleware", nicht "Mastra kennt MCP-Tools".
- Das Tool führt **nach** dem LLM-Turn aus (Client-Tool-Semantik), nicht mehr
  mid-run in Mastra — entspricht dem bisherigen `followUp: false`-Verhalten.
- `AppHttpAgent`: Server-Memory-Filter wird bei `__proxiedMCPRequest`-Runs
  übersprungen (sonst könnte ein Widget-Refresh eine User-Message als
  "gesendet" markieren, bevor das Modell sie sah).
- Proxied Runs laufen über denselben Agenten → `isRunning()` ist während
  Widget-Refreshes kurz true (Composer zeigt Stop). Kosmetik.

**Gelöscht:** `mcp-apps-widget.ts`, `mcp-apps-activity-renderer.ts`,
`mcp-apps-content.ts`, `mcp-apps.provider.ts` (inkl. unserer
`provideMcp`/`provideMcpApps`-Provider — Namenskollision mit CopilotKits
`provideMCPApps` damit erledigt), `src/app/mcp-apps.config.ts`, sowie
`_meta.ui`-Sniffing + Snapshot-Hook in `extended-mastra-agent.ts`.

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

| Thema                                | Aktion                                                                                                                                     |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Fallback-Tool-Karte / `'*'`-Renderer | Ersetzen durch `defaultToolRendering: true`; eigene Karte allenfalls als Exkurs                                                            |
| `initAgentStore`-Signatur            | `context`-Option existiert nicht mehr; Frontend-Tools ohne `component`-Default                                                             |
| Interrupt-Kapitel                    | Neu: `injectInterrupt`-Controller; Hack + `buildResumeArray` + `resolvedInterruptId` raus; `addMessage`-Guard als neue Subtilität erklären |
| Kontext-Kapitel                      | `connectAgentContext` + `agentIds`-Scoping statt `AppHttpAgent`-Merge                                                                      |
| Shared-State-Kapitel                 | Lesen unverändert; Schreib-Entscheidung (Factory statt `setState`, Loop-Begründung) ergänzen                                               |
| MCP-Apps-Kapitel                     | Komplett neu erzählen: Middleware + `provideMCPApps`, Proxy-Architektur, Toolname `findHotels`, gelöschter Eigenbau-Host                   |
| `AppHttpAgent`-Folie                 | Neue Job-Liste: forwardedProps, `state`-Factory, Server-Memory-Filter, Interrupt-Guard, Proxied-Request-Guard — kein Context-Merge mehr    |
| Architektur-Diagramme                | Browser↔MCP-Server-Pfeil entfernen; MCP-Traffic läuft durch die AG-UI-Route                                                                |
| Abhängigkeiten-Folie                 | `@copilotkit/angular@0.3.0`, `@ag-ui/mcp-apps-middleware`, kein `@copilotkit/runtime`                                                      |
