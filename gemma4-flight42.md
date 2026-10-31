# Moving Flights42 to Gemma 4

Flights42 has six agents: ticketing, co-planning, dashboard, reporting, travel planner and travel refinement. This branch moves all of them from GPT to Gemma 4 26B A4B on Cloudflare Workers AI (`@cf/google/gemma-4-26b-a4b-it`), with thinking off and temperature 0. This report lists every measure, what it changed and what it brought. It builds on the findings in [gemma4.md](gemma4.md).

All numbers come from `npm run eval`: 19 typical prompts across all agents, mostly 3 runs each. Every measure was measured right before and right after it was applied, on top of the previous ones. With 3 runs at temperature 0 the numbers show the direction of an effect rather than exact rates, and Cloudflare is not fully deterministic even at temperature 0. There is no comparison with GPT, as no OpenAI key was available.

| Agent             | Baseline (model switch only) | Final                               |
| ----------------- | ---------------------------- | ----------------------------------- |
| Ticketing         | 15/15                        | 18/18 (incl. a new detail question) |
| Co-planning       | 6/12                         | 8/12                                |
| Dashboard         | 4/6                          | 6/6                                 |
| Reporting         | 6/6                          | 6/6                                 |
| Travel planner    | 0/3                          | 3/3                                 |
| Travel refinement | 0/12                         | 12/12                               |
| **Total**         | **31/54**                    | **53/57**                           |

The last three full runs passed 57, 56 and 53 of 57 turns. In the second, one Cloudflare request took longer than the new 60-second timeout (see [Time out hanging requests](#time-out-hanging-requests)). In the third, one co-planning conversation answered all four requests without the plan widget, although the plans themselves were correct: once Gemma had skipped the widget in its first answer, it followed its own example in the history.

Several measures also made the agents much faster:

| Request                     | Before                                   | After                            |
| --------------------------- | ---------------------------------------- | -------------------------------- |
| Reporting examples          | 13.7 s, 8.4k input and 473 output tokens | 9.5 s, 4.6k input and 329 output |
| Travel planner              | 25.0 s, and the plan was never shown     | 10.8 s                           |
| "Maximize my time in Rome"  | 12.3 s, 47.6k input tokens               | 4.5 s, 19.2k input tokens        |
| "Did I book Paris already?" | 4.3 s                                    | 3.2 s                            |

## Model and Runtime

### Run Gemma 4 on Cloudflare Workers AI

The OpenAI models (`gpt-5.6-luna`, `gpt-5.6-terra` with priority tier and per-agent reasoning effort) are replaced by one model for all agents, including the plan finalizer of the travel workflow. `modelAdvancedTasks` is gone. The connection data comes from `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_API_TOKEN`, the temperature from `CLOUDFLARE_TEMPERATURE`.

With nothing else changed, ticketing, the analytics dashboard and reporting worked right away. Co-planning, the travel planner and the refinement chat failed most of their prompts: 31 of 54 turns passed.

Files: [config.ts](ai-server/src/mastra/config.ts), [planning-agent.ts](ai-server/src/mastra/agents/planning-agent.ts), [travel-planner-agent.ts](ai-server/src/mastra/agents/travel-planner-agent.ts), [travel-refinement-agent.ts](ai-server/src/mastra/agents/travel-refinement-agent.ts), [plan-finalizer-agent.ts](ai-server/src/mastra/workflows/plan-finalizer-agent.ts), [.env.example](.env.example), [README.md](README.md)

### Keep parallel tool calls apart

When Gemma calls the same tool several times in one step, e.g. one `flightWidget` per flight, Cloudflare streams every call with its own id but always with `index: 0`. Mastra's model router uses a bundled OpenAI-compatible provider that accumulates tool calls by index, so three calls arrived as one call with the arguments `{…}{…}{…}`. Mastra logged "Error converting tool call input to JSON", and the travel planner showed one flight and one hotel instead of three and two.

The model is now created with `createOpenAI(...).chat(...)` from `@ai-sdk/openai`, which keeps the calls apart. This provider drops unknown provider options, so a small `fetch` wrapper adds `chat_template_kwargs` to the request body itself.

This raised the total from 31 to 39 of 54 turns. "Give me a better hotel in Paris" went from 0/3 to 3/3, the co-planning follow-ups from 2/3 to 3/3.

Files: [config.ts](ai-server/src/mastra/config.ts)

### Turn thinking off

Cloudflare enables Gemma's thinking by default. The `fetch` wrapper sends `chat_template_kwargs: { enable_thinking: false }`; `MODEL_THINKING=true` turns it back on. We measured both settings with the ticketing, co-planning and reporting prompts, 3 runs each, after most measures were in place but before [the report chart moved to the tool result](#show-the-report-chart-from-the-tool-result). Durations are the median and the range of the single turns:

|                        | Thinking off              | Thinking on                         |
| ---------------------- | ------------------------- | ----------------------------------- |
| Passed turns           | 36/36                     | 34/36                               |
| Ticketing, per turn    | 2.5 s (1.5–3.6 s)         | 7.8 s (3.4–22.9 s)                  |
| Co-planning, per turn  | 2.9 s (1.5–3.7 s)         | 8.7 s (2.9–12.5 s)                  |
| Reporting, per prompt  | 14.5 s (9.8–16.4 s)       | 32.9 s (10.0–39.9 s, one run 750 s) |
| Output tokens per turn | 42–71 (reporting 413–527) | 99–640 (reporting 948–1,628)        |

The wide ticketing range has two causes. "Search Graz → Madrid" generated about 200 output tokens in all three runs but took 6.2, 15.0 and 22.9 seconds, so the extra time went into waiting for Cloudflare, not into thinking longer. "Search Graz → Madrid again" took 18.5 to 19.6 seconds in every run: Gemma repeated the same search four to five times, read 46k to 56k instead of 18.5k input tokens and ended without a reply, which the eval still counted as passed. The other ticketing turns took 3.4 to 9.7 seconds with thinking.

Thinking made the turns about three times slower on median, 1.7 to 6.8 times per prompt, and multiplied the output tokens by two to five, without making the tool calls more reliable: the two failures with thinking on were answers without the plan widget, which did not happen with thinking off on the same code.

The consequence for tool calling is that Gemma decides on its tool call in a single pass, without a hidden step that weighs the rules of the system prompt or checks its own result. Most of the following measures follow from that:

- The nearest text wins. Tool names and descriptions beat rules in the system prompt, so guidance belongs next to the tool, and tools should be named after the user's words ([Add a tool for the user's verb](#add-a-tool-for-the-users-verb), [Put negative examples next to the confusable tool](#put-negative-examples-next-to-the-confusable-tool)).
- Arithmetic and comparisons belong in code: dates, earliest and latest flights, star ratings ([Let code shift flight times](#let-code-shift-flight-times)).
- Data should not pass through tool arguments: tools take ids, the UI renders tool results and state ([Rendering Instead of Copying](#rendering-instead-of-copying)).
- Decisions are required enums ([Let the model ask for minimal or full results](#let-the-model-ask-for-minimal-or-full-results)).
- Errors say what did not happen and what to do instead, because the model does not double-check ([Reference flights by id and hotels by stars](#reference-flights-by-id-and-hotels-by-stars)).
- The model corrects itself in the next step instead of in its reasoning, so it needs more steps ([Cap output tokens and allow more steps](#cap-output-tokens-and-allow-more-steps)).

We measured thinking only after most measures were in place. Whether it would have rescued some of the baseline failures is open, but at this latency it is no option for an interactive demo.

Files: [config.ts](ai-server/src/mastra/config.ts)

### Cap output tokens and allow more steps

`maxSteps: 8` replaces Mastra's default of 5 model calls, and `maxOutputTokens: 4096` caps a single step. A refinement request needs a search, a change, `getTravelPlan` to verify it and the closing message. With five steps the closing `messageWidget` was often cut off: the plan was changed, but the user got no answer.

The refinement prompts went from 3/12 to 8/12: "Maximize my time in Rome" from 0/3 to 2/3, "End my trip in Vienna" from 0/3 to 3/3. The dashboard agent keeps `maxSteps: 1`, the check-in agent `maxSteps: 3`.

Files: [config.ts](ai-server/src/mastra/config.ts)

### Time out hanging requests

During the measurements one Cloudflare request hung for 2,929 seconds and then failed with `AI_APICallError`; with thinking on, one run took 750 seconds. The `fetch` wrapper now aborts every request after 60 seconds. The AI SDK treats the timeout as an abort rather than as a retryable connection error, so the turn ends with an error instead of waiting for most of an hour. In the final run this happened once: "When does my flight to Paris leave?" ended after 62 seconds with `TimeoutError`, while the same request usually takes 3 seconds. Two other turns took 31 and 34 seconds and still finished. A single retry after the timeout would turn such a case into an answer after about a minute; it is not implemented yet.

Files: [config.ts](ai-server/src/mastra/config.ts)

## Measuring

### Evaluate with the real agent stores

`npm run eval` is an Angular unit-test target that runs in Node. Its cases create the real agent stores with their frontend tools, the travel planner page and the refinement chat service, and send the prompts through CopilotKit to the running ai-server. Tool descriptions, follow-up runs after frontend tools and stores such as the `PlanStore` are therefore exactly those of the app.

The checks look at what the user sees: the flights shown in the chat and whether their data matches the flight API, the arguments of `findFlights`, the steps of the co-plan, the dashboard tiles, the chart values against references computed from the flight API, and the travel plan against the flights and hotels that really exist. For every turn the eval reports duration, input and output tokens from `RUN_FINISHED` and failed tool calls. `EVAL_RUNS`, `EVAL_CASE` and `EVAL_OUT` set the runs, filter the cases and write all traces to a JSON file.

The first baseline of the refinement chat showed a flaw in the eval itself: it initialized the agent store a second time, which replaced the `HttpAgent` holding the travel plan, so Gemma saw an empty plan. Reading the traces before blaming the model paid off here.

Files: [flights42.eval.ts](eval/flights42.eval.ts), [cases.ts](eval/cases.ts), [harness.ts](eval/harness.ts), [reference.ts](eval/reference.ts), [tsconfig.json](eval/tsconfig.json), [angular.json](angular.json), [package.json](package.json)

### Show model, duration and failed tool calls

The AG-UI stream adds the model, the duration and the number of failed tool calls to the result of `RUN_FINISHED`. A server tool call counts as failed when it gets no result or a validation error and does not wait for an approval. The chat shows model and duration in small print below the messages and a red hint when tool calls failed, independent of what the model writes. The eval reads the same values.

Files: [ag-ui-stream.ts](ai-server/src/mastra/routes/ag-ui-stream.ts), [run-info.ts](src/app/domains/shared/ui-assistant/run-info/run-info.ts), [chat-messages.ts](src/app/domains/shared/ui-assistant/chat-messages/chat-messages.ts), [chat-messages.html](src/app/domains/shared/ui-assistant/chat-messages/chat-messages.html)

## Rendering Instead of Copying

### Generate a compact DSL instead of A2UI

The dashboard is the most complex generated UI in Flights42, but its migration needed only one small fix. Its agent already followed this principle before the migration, as described in [A2UI with a DSL: Controllable Dashboards Optimized for Performance](https://www.angulararchitects.io/en/blog/how-i-made-my-a2ui-dashboard-300-times-faster/). The model does not write A2UI but makes one `renderDashboard` call with a list of tiles such as `{ "type": "delayShareChart", "from": "Graz", "to": "Hamburg" }`. The server compiles this spec into A2UI and loads the data for the tiles.

The DSL was introduced for speed and cost: it made the dashboard about 300 times faster and cut its tokens by a factor of 30. It also made the move to Gemma easy, because even a weak model can reliably write a few tiles with flat arguments. Component trees and the data in them would be much harder for it. The analytics dashboard passed from the start, and the personal dashboard only needed [numbers and booleans written as strings](#accept-numbers-and-booleans-written-as-strings) to be accepted.

Files: [dashboard-agent.prompt.ts](ai-server/src/mastra/agents/dashboard-agent.prompt.ts), [render-dashboard.ts](ai-server/src/mastra/tools/render-dashboard.ts), [dashboard-spec.ts](ai-server/src/mastra/dashboard-dsl/dashboard-spec.ts), [compile-dashboard.ts](ai-server/src/mastra/dashboard-dsl/compile-dashboard.ts)

### Render booked flights from the tool result

Before, the ticketing agent called `findBookedFlights` and then one `flightWidget` per flight, copying id, route, full ISO date and delay into the arguments. Now `FlightWidget` is a tool renderer for `findBookedFlightsTool`: it shows the flights of the tool result with their check-in button, and the model only writes the message. The tool description says that calling it is what displays the cards, in the current answer only.

The pass rate stayed at 3/3, as Gemma copied correctly in the baseline, too. Output tokens dropped from 107 to 58, the duration from 4.3 to 2.9 seconds and the input from 19.6k to 17.5k tokens. More importantly, the model no longer needs the flight data, which made minimal tool results possible. A request for a table now shows the cards and the table. An empty result left an empty chat bubble, so the chat hides messages whose renderer shows nothing.

Files: [flight-widget.ts](src/app/domains/ticketing/ui/flight-widget.ts), [ticketing-agent-store.ts](src/app/domains/ticketing/ai/ticketing-agent-store.ts), [ticketing-agent.prompt.ts](ai-server/src/mastra/agents/ticketing-agent.prompt.ts), [get-loaded-flights.tool.ts](src/app/domains/ticketing/ai/tools/get-loaded-flights.tool.ts), [chat-messages.css](src/app/domains/shared/ui-assistant/chat-messages/chat-messages.css)

### Show the travel plan from the AG-UI state

Before, the travel planner rendered the workflow result with a `messageWidget`, one `flightWidget` per flight and one `hotelWidget` per hotel, and the page copied their props into the plan store. This failed for two reasons that have nothing to do with Gemma: CopilotKit 0.6 gives component tools an empty string as result, and the page read that result instead of falling back to the arguments (`"" ?? args` stays `""`). In addition, the page gave up waiting when its effect ran before the run had started.

Now the page takes the plan from the completed background task of the workflow, validates it with Zod and writes it into the AG-UI state of the refinement agent, which the page displays. The planner agent has no widgets anymore, and its prompt lost the step that told it to copy every flight character by character.

The travel planner went from 0/3 to 3/3, its input from 7.0k to 3.7k tokens and its duration from about 24 to 14 seconds. Without the copying instructions, Gemma also dated the dinner stopover correctly: before, its rough plan listed hotels in Paris and Rome but put the flight to Rome on the same day, so the workflow found no night in Paris.

Files: [travel-planner-page.ts](src/app/domains/ticketing/feature-travel-planner/travel-planner-page.ts), [travel-planner-page.html](src/app/domains/ticketing/feature-travel-planner/travel-planner-page.html), [travel-planner-agent-store.ts](src/app/domains/ticketing/feature-travel-planner/travel-planner-agent-store.ts), [travel-workflow-progress.ts](src/app/domains/ticketing/feature-travel-planner/travel-workflow-progress/travel-workflow-progress.ts), [travel-planner-agent.prompt.ts](ai-server/src/mastra/agents/travel-planner-agent.prompt.ts)

### Keep the refinement chat to text

The refinement chat no longer has flight and hotel widgets. The plan is shown only from the AG-UI state next to the chat, and proposals are listed in the message. This removes two tool definitions and the instructions for them from every request.

The refinement prompts went from 8/12 to 9/12, and the input dropped noticeably, e.g. from 38.6k to 26.0k tokens for "Give me a better hotel in Paris" and from 47.8k to 36.1k for "End my trip in Vienna".

Files: [travel-refinement-agent-store.ts](src/app/domains/ticketing/feature-travel-planner/travel-refinement-agent-store.ts), [travel-refinement-agent.prompt.ts](ai-server/src/mastra/agents/travel-refinement-agent.prompt.ts)

### Show the report chart from the tool result

The reporting agent aggregates the flights with a JavaScript snippet in `executeJavaScript`. Before, it then copied the aggregated values into the arguments of the frontend tool `renderChart`. Now a `ChartWidget` renders the chart as a tool renderer for `executeJavaScript`, just like the `FlightWidget` does for booked flights. The reporting page has no chat layout, so it embeds the latest `executeJavaScript` call with `<copilot-render-tool-calls>`. `renderChart` and its store are gone. Like `findBookedFlights`, the tool has a required `detail`: with `"minimal"` the model only learns that the chart was shown, with `"full"` it gets the values.

Both examples still passed 6/6, and they got much faster: the daily delay rates went from about 14 to 9 seconds, the delay counts from about 13 to 5 seconds. The input dropped from 8.7k to 4.6k tokens and from 8.2k to 4.4k, the output from 527 to 343 and from 419 to 232 tokens.

At first Gemma asked for `"full"` in all 6 runs, as both examples are phrased as questions. After the description of `detail` said that `"minimal"` also applies when the chart answers a question, it chose `"minimal"` in 6 of 6. A question that needs the values, "On which day were the most flights between Graz and London delayed?", got `"full"` in 3 of 3 runs, but Gemma only replied "Here is your chart", because the prompt told it to confirm the chart in one sentence. With the added rule to answer the question when it used `"full"`, it named both days with two delays each in 3 of 3 runs. Since then, the delay-count example takes `"full"` again and adds the numbers to its reply, which costs about 2 seconds.

Files: [execute-javascript.ts](ai-server/src/mastra/tools/execute-javascript.ts), [reporting-agent.prompt.ts](ai-server/src/mastra/agents/reporting-agent.prompt.ts), [chart-widget.ts](src/app/domains/ticketing/feature-reporting/reporting-page/chart-widget.ts), [reporting-chart.ts](src/app/domains/ticketing/feature-reporting/reporting-page/reporting-chart.ts), [reporting-page.ts](src/app/domains/ticketing/feature-reporting/reporting-page/reporting-page.ts), [reporting-page.html](src/app/domains/ticketing/feature-reporting/reporting-page/reporting-page.html), [reporting-agent-store.ts](src/app/domains/ticketing/feature-reporting/reporting-page/reporting-agent-store.ts)

## Tool Design

### Filter booked flights by route and flight id

`findBookedFlights` takes the optional arguments `from`, `to` and `flightId`, and it resolves spelling variants such as Wien and Vienna. Since the renderer shows everything the tool returns, the filter decides which cards the user sees. A country is mapped to its best-known city in the prompt, e.g. "Frankreich" to `to: "Paris"`.

Gemma set `to` correctly in 6 of 6 runs and `flightId` in 9 of 9 probes ("Did I book flight 516?", "… 517?", "Is flight 50 delayed?").

Files: [find-booked-flights.ts](ai-server/src/mastra/tools/find-booked-flights.ts), [ticketing-agent.prompt.ts](ai-server/src/mastra/agents/ticketing-agent.prompt.ts), [flight-widget.ts](src/app/domains/ticketing/ui/flight-widget.ts)

### Let the model ask for minimal or full results

`findBookedFlights` has a required enum `detail`. With `"full"` the model gets all fields; with `"minimal"` Mastra's `toModelOutput` returns a short note instead: which flights were shown as cards, that their dates and delays are not part of the result, and that the cards are not visible in later answers. Mastra stores this short version with the message, so later turns don't carry the data either.

To see what the choice is worth, we forced each variant and added the question "When does my flight to Paris leave?":

| Variant        | Detail question | Other ticketing turns |
| -------------- | --------------- | --------------------- |
| Always minimal | 0/3             | 15/15                 |
| Always full    | 3/3             | 14/15                 |
| Model decides  | 3/3             | 14/15                 |

With minimal results Gemma did not invent a date but pointed to the card. Left to decide, it chose correctly in 9 of 9 runs: `minimal` for "Did I book …?", `full` for "When …?" and "Is … delayed?". The token savings are small here because the filtered result contains one flight; the benefit is that the model only gets data when it needs it.

Files: [find-booked-flights.ts](ai-server/src/mastra/tools/find-booked-flights.ts)

### Let code shift flight times

`maximizeTime` and `minimizeTime` take a city. They replace the flight into the city with the earliest or latest one and the flight out of it with the latest or earliest one, each on its current day, and commit the plan. Before, Gemma read the plan, searched two routes and called `replaceFlightInPlan` twice with copied flight objects.

"Maximize my time in Rome" stayed at 3/3, but the input dropped from 47.6k to 20.9k tokens, the output from 362 to 87 tokens and the duration from 12.3 to 4.7 seconds.

Files: [time-in-city.tool.ts](ai-server/src/mastra/tools/plan/time-in-city.tool.ts), [index.ts](ai-server/src/mastra/tools/plan/index.ts), [travel-refinement-agent.ts](ai-server/src/mastra/agents/travel-refinement-agent.ts), [travel-refinement-agent.prompt.ts](ai-server/src/mastra/agents/travel-refinement-agent.prompt.ts)

### Address hotels by city

The hotel ids came from templates, so every city had a `biz-hotel`. "I don't need a hotel in Rome after all" led to `removeHotelFromPlan({ hotelId: "biz-hotel" })`, which removed the hotels in Rome and Paris. The tool now takes the city, which is also what the user names, and answers "The plan was not changed: …" when there is no hotel in that city. In addition, the hotel API now combines template and city into a unique id such as `biz-hotel-rome`, which also removes duplicate `track` keys in the travel plan view.

The request went from 0/3 to 3/3.

Files: [remove-hotel-from-plan.tool.ts](ai-server/src/mastra/tools/plan/remove-hotel-from-plan.tool.ts), [find-hotels.ts](ai-server/src/mastra/tools/find-hotels.ts)

### Reference flights by id and hotels by stars

The other plan tools took complete flight and hotel objects that the model copied from search results. Now they take ids, or a city with a star rating: `addFlightToPlan({ flightId })`, `replaceFlightInPlan({ oldFlightId, newFlightId })`, `addHotelToPlan({ city, stars })` and `setTravelPlan({ flightIds, hotels: [{ city, stars }] })`. The tools look up the data themselves, accept numbers written as strings, and their errors name the fix, e.g. "flight 123 does not exist. Use an id from a searchFlights result" or "there is no 2-star hotel in Paris. Available stars: 3, 4, 5". The stars are optional: `addHotelToPlan` then takes the standard 4-star hotel, and `setTravelPlan` keeps the city's current hotel or, if there is none, takes the 4-star one.

The refinement prompts stayed at 12/12, also after the stars became optional and the hotels got unique ids, and the travel planner stayed at 3/3. Gemma still passes the stars for every hotel. For "End my trip in Vienna" the output dropped from 414 to 298 tokens and the input from 36.1k to 33.2k. The main gain is robustness: in one earlier run of the same request, Gemma invented the hotel ids `biz-hotel-paris` and `biz-hotel-rome` while copying the hotels into `setTravelPlan`, ids that did not exist at that time.

Files: [plan-lookup.ts](ai-server/src/mastra/tools/plan/plan-lookup.ts), [add-flight-to-plan.tool.ts](ai-server/src/mastra/tools/plan/add-flight-to-plan.tool.ts), [replace-flight-in-plan.tool.ts](ai-server/src/mastra/tools/plan/replace-flight-in-plan.tool.ts), [remove-flight-from-plan.tool.ts](ai-server/src/mastra/tools/plan/remove-flight-from-plan.tool.ts), [add-hotel-to-plan.tool.ts](ai-server/src/mastra/tools/plan/add-hotel-to-plan.tool.ts), [set-travel-plan.tool.ts](ai-server/src/mastra/tools/plan/set-travel-plan.tool.ts)

### Accept numbers and booleans written as strings

In the dashboard spec Gemma sometimes wrote `"count": "2"` or `"showCheckInButton": "true"`, and the spec was rejected. Numbers now go through `z.coerce.number()`, booleans through a preprocessor that only maps the strings `"true"` and `"false"`; `z.coerce.boolean()` would turn `"false"` into `true`. The JSON schema the model sees still says integer and boolean.

The personal dashboard went from 5/8 to 8/8 in 8 runs, although Gemma still wrote strings in 2 of them.

Files: [dashboard-spec.ts](ai-server/src/mastra/dashboard-dsl/dashboard-spec.ts)

### Add a tool for the user's verb

Gemma read "Verschiebe 1 auf 5" as moving plan step 1 to position 5. It called `getPlan`, found an empty plan and answered "I couldn't find an existing plan to move anything from", although the system prompt said three times that these numbers are flight ids. The frontend tool `addRebooking({ cancelFlightId, bookFlightId })` adds a cancel step and a book step and works on an empty plan.

On its own the tool did not help (0/3), as Gemma still went for the step semantics. Together with the negative example of the next group it solved the request.

Files: [add-rebooking.tool.ts](src/app/domains/ticketing/ai/tools/plan/add-rebooking.tool.ts), [planning-agent-store.ts](src/app/domains/ticketing/ai/planning-agent-store.ts), [planning-agent.prompt.ts](ai-server/src/mastra/agents/planning-agent.prompt.ts)

## Prompting

### Put negative examples next to the confusable tool

The description of `movePlanStep` now says: not for "verschiebe 1 auf 5", as numbers without "step" or "Schritt" are flight ids, so use `addRebooking`. On its own this example did not help either (0/3). Together with `addRebooking`, "Verschiebe 1 auf 5" went from 0/3 to 3/3 and the co-planning prompts to 12/12; "Verschiebe 1 auf 4" passed 3/3, too.

A more precise wording by the user also works without these changes: "Verschiebe Flug 1 auf Flug 5" and "Verschiebe den Flug mit der ID 1 auf den Flug mit der ID 5" both passed 3/3. Gemma then looked the flights up first, though, and needed 35–37k input tokens and 7–9 seconds, compared to 15k tokens and 3 seconds with the new tool.

Files: [move-plan-step.tool.ts](src/app/domains/ticketing/ai/tools/plan/move-plan-step.tool.ts)

### Give examples where the decision is made

After "Search Graz → Madrid", the follow-up "Und retour" sometimes produced an A2UI search form instead of a search, because a rule says to render a form when a city is missing. The description of `findFlights` now has the example "Und retour" → `findFlights({ from: "Madrid", to: "Graz" })` and calls the form wrong. It also says that calling the tool is what shows the results, so a repeated request needs a new call.

"Und retour" passed 10 of 15 runs over the five measurements before and 5 of 5 right after, and it has passed every run since.

Files: [find-flights.tool.ts](src/app/domains/ticketing/ai/tools/find-flights.tool.ts)

### Name the reply language and give an example per language

The reporting agent answered English questions in German, and the travel plan summary came in German although the page sends an English request. The reporting prompt had no language rule but twice the example reply "Hier ist dein Diagramm.", which Gemma copied. The plan finalizer was told to write "in the user's language", while its prompt contains German keywords such as "günstig" and "5 Sterne".

The reporting prompt now asks for the language of the user's request and gives the example as a pair: "Here is your chart." for an English request, "Hier ist dein Diagramm." for a German one. The finalizer writes the summary in the language of the original request, which the description of the `summary` field in its output schema says, too.

English reporting questions went from 0/3 to 3/3 English replies, German ones stayed German in 3/3, and the plan summary went from 0/3 to 3/3 English.

Files: [reporting-agent.prompt.ts](ai-server/src/mastra/agents/reporting-agent.prompt.ts), [plan-finalizer-agent.prompt.ts](ai-server/src/mastra/workflows/plan-finalizer-agent.prompt.ts), [schemas.ts](ai-server/src/mastra/workflows/schemas.ts)

### Remove rules the tools made redundant

With `addRebooking` in place, we removed the rules that explain "verschiebe N auf M" from the co-planning prompt: all 20 turns of 5 runs passed, as fast as before. Removing the general rule that bare numbers after "buche" or "storniere" are flight ids still passed 19 of 20 turns, but "Verschiebe 1 auf 5" then took about 10 seconds and 41k tokens, because Gemma first looked up the loaded and booked flights and once even started a flight search that navigates the app. That rule stays.

Files: [planning-agent.prompt.ts](ai-server/src/mastra/agents/planning-agent.prompt.ts)

### Approaches that did not help

Examples for "Verschiebe 1 auf 5" and "Ergänze auch die Buchung von 6" in the system prompt did not fix the first request and made Gemma drop the plan widget in every turn: the co-planning prompts fell from 9/12 to 0/12. A hint in the result of `getPlan` that an empty plan is the normal start was ignored as well (0/3). Both were removed.

## Open Issues

The plan widget of the co-planning agent is a separate tool call without arguments, so Gemma can skip it, and it then tends to skip it for the rest of the conversation. Rendering the plan from the results of the plan tools, like the booked flights and the report chart, would make this impossible.

The eval covers 19 prompts. Bookings and cancellations with their action cards and approvals, check-in, hotels via the hotel agent, A2UI tables and forms, the MCP mode, questions in the refinement chat and `minimizeTime` are not measured.

Some behavior changed by design: refinement proposals are text, the planner chat shows no widgets, a table of booked flights comes with cards, and countries are resolved to their best-known city.
