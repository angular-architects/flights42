# Making an Agentic App Work with Gemma 4

This branch moves the agentic sales app from a frontier model to Gemma 4, a much smaller open model. The app has two chats: a sales chat that renders charts from data the model passes in, and a dashboard chat whose `runQuery` tool computes and renders the data on the server. This article lists every measure we took to make the smaller model work, with the numbers we measured along the way.

All numbers were measured with Gemma 4 26B A4B, as `gemma4:26b-a4b-it-q8_0` on Ollama and as `@cf/google/gemma-4-26b-a4b-it` on Cloudflare Workers AI, mostly with 3 runs per scenario at temperature 0. They show the direction of an effect rather than exact rates. The default model is now `gemma4:31b-it-q4_K_M`, which `npm run eval` can measure the same way.

## Model and Runtime

### Run Gemma 4 through an OpenAI-compatible provider

Mastra's model router talks to both Cloudflare Workers AI and Ollama through their OpenAI-compatible endpoints, so no provider package is needed. `MODEL_PROVIDER` switches between them, and the Ollama instance runs on a GPU droplet reached through an SSH tunnel. Cloudflare sporadically answered with `500 AiError` (code 8005), which Mastra already retries twice.

Files: [config.ts](agent/src/mastra/config.ts), [.env.example](.env.example), [README.md](README.md)

### Turn thinking off explicitly

Both providers enable Gemma's thinking by default, which costs seconds per step. Cloudflare needs `chat_template_kwargs.enable_thinking: false`, while Ollama's OpenAI endpoint only reacts to `reasoning_effort: "none"` and ignores `think` and `chat_template_kwargs`. A short prompt took 8.7 s with 811 characters of reasoning and 0.6 s without; `MODEL_THINKING=true` turns it back on.

Files: [config.ts](agent/src/mastra/config.ts)

### Cap the output tokens

Without a limit, one model step ran for 535 s and produced neither text nor a tool call. Ollama processes requests one after another, so this also blocked every other chat. With `maxOutputTokens: 4096` the longest run we saw afterwards took 17 s, while legitimate answers stay far below the cap.

Files: [config.ts](agent/src/mastra/config.ts)

### Allow more steps

Mastra's default `stopWhen: stepCountIs(5)` counts model calls, not tool calls, so five parallel tool calls are one step. A weaker model often needs a retry or two, and after five failed calls the run ended without any text. `maxSteps: 8` leaves room for corrections without letting loops run long.

Files: [config.ts](agent/src/mastra/config.ts)

## Schema Design

### Use flat schemas instead of unions

Cloudflare's Gemma chat template doesn't render `anyOf` or `oneOf` on property level, so Gemma never saw the variants of the union `querySchema` and invented fields like `labels`, `x` and `chartType`. A probe showed that unions fail at top level and on properties, but mostly work inside array items. The query spec is now one flat object with `kind` as an enum and the pivot dimensions as optional fields that the tool checks itself.

Files: [query-schema.ts](shared/query-schema.ts), [run-query.ts](agent/src/mastra/tools/run-query.ts)

### Make decision fields required enums

Gemma tends to leave out optional fields: an optional boolean `returnData` was omitted in every run and scored 3 of 6. A required boolean reached 5–6 of 6 and a required enum `purpose: "show" | "answer"` 6 of 6, while the same enum with a default was omitted again in 2 of 6 calls. So `purpose` is required, and the dashboard tiles send `"show"` explicitly when they call the tool via REST.

Files: [run-query.ts](agent/src/mastra/tools/run-query.ts), [query-client.ts](src/app/data/query-client.ts)

## Tool Results

### Control what a tool returns to the model

Mastra's `toModelOutput` lets a tool return the full result to the UI and a shorter version to the model. `RETURN_TOOL_RESULT_TO_MODEL` selects `full`, `minimal` or `model_decides`, where the model sets `purpose: "answer"` only when it needs the values. Mastra stores the short version with the message, so later turns don't carry the data either.

Files: [feature-flags.ts](agent/src/mastra/feature-flags.ts), [run-query.ts](agent/src/mastra/tools/run-query.ts), [dashboard-agent.prompt.ts](agent/src/mastra/agents/dashboard-agent.prompt.ts)

### Explain side effects of tools

When the user repeated a request, Gemma answered in text because the result was already in the history: it didn't know that calling `runQuery` is what displays the chart. The short note now says in past tense that the chart was shown in this answer and is not visible in later ones, and the tool description says that calling it displays the chart. Repeated requests went from no chart to 9 of 9, while the same rule at the end of the system prompt made Gemma claim "added to your dashboard" in 4 of 6 answers.

Files: [run-query.ts](agent/src/mastra/tools/run-query.ts)

## API Design

### Accept what the model writes anyway

Gemma passed lists like `{ "Continent": ["Europe", "Americas"] }` as filter values, which the aggregation server rejected. The server now accepts a value or a list per column and turns lists into `IN`. The dashboard comparison went from 5 failed calls and an empty dashboard to one successful call, and all 5 tiles of the per-continent example got both of their filters instead of 1.

Files: [sales-dal.ts](server/data/sales-dal.ts), [request-parsing.ts](server/apis/request-parsing.ts), [evaluate-jsonata.ts](agent/src/mastra/tools/evaluate-jsonata.ts)

### Add the aggregate functions the model expects

To count orders, Gemma wrote `"aggregateFn": "count_distinct"`, which didn't exist. The server now supports it, and the prompt tells the model to count orders with `count_distinct` on `TransactionId`. "Orders per month" is now correct in 3 of 3 runs in 2 s, while the JSONata workaround loaded about 5,000 rows and triggered an approval.

Files: [sales-dal.ts](server/data/sales-dal.ts), [aggregate.ts](server/apis/aggregate.ts), [sales-tools.ts](agent/src/mastra/tools/sales/sales-tools.ts), [sales-data.prompt.ts](agent/src/mastra/agents/sales-data.prompt.ts)

### Let code enumerate values

Asked for "one pie chart per continent", Gemma built a single chart grouped by continent, even with prompt rules, tool descriptions and a plural tool. The spec now has an optional `splitBy` column: the code loads its values and runs the expression once per value with that value as an additional filter. The request now succeeds in 3 of 3 runs with one call, and the dashboard shows the charts of such a tile across the full row.

Files: [query-schema.ts](shared/query-schema.ts), [run-query.ts](agent/src/mastra/tools/run-query.ts), [query-result-view.ts](src/app/feature-dashboard/query-result-view.ts), [styles.css](src/styles.css)

## Errors

### Write error messages that name the fix

The model reads every tool error, but messages like `Filter value must be a scalar` don't tell it what to do instead. The messages now name the alternative: how to exclude values, which aggregate functions exist, the expected data shape with an example, and the pivot fields with example values. JSONata errors get a hint for the mistakes we saw most, such as `[0..6]` instead of `[[0..6]]`, pipes and invented functions like `$group`.

Files: [request-parsing.ts](server/apis/request-parsing.ts), [aggregate.ts](server/apis/aggregate.ts), [run-query.ts](agent/src/mastra/tools/run-query.ts), [evaluate-jsonata.ts](agent/src/mastra/tools/evaluate-jsonata.ts)

### Repair unambiguous mistakes deterministically

Gemma regularly wrote several JSONata statements without the surrounding block `( …; … )`, even with a right and a wrong example in the description. When compiling fails with exactly this error, the tool wraps the expression in parentheses and compiles it again; if that fails too, the model gets the original error with a hint. A field-level example in the chained form removed most of these mistakes, and the repair catches the rest.

Files: [evaluate-jsonata.ts](agent/src/mastra/tools/evaluate-jsonata.ts), [query-schema.ts](shared/query-schema.ts)

### Make failures impossible to misread

After five failed `addDashboardItem` calls, Gemma answered "I've added the bar chart to your dashboard". The dashboard tools now fail with "The dashboard was not changed: …", a failed `runQuery` reaches the model as "No visualization was shown to the user: …", and an unreachable server is named as such. With an unreachable data server, Gemma now answers honestly after one attempt.

Files: [dashboard-tools.ts](agent/src/mastra/tools/dashboard/dashboard-tools.ts), [run-query.ts](agent/src/mastra/tools/run-query.ts), [sales-api.ts](agent/src/mastra/tools/sales/sales-api.ts)

### Show failed tool calls in the UI

`@ag-ui/mastra` swallows tool errors, so the UI never learns about them. The AG-UI route counts server tool calls without a result or with a validation error, leaves out calls that wait for an approval and adds the count to `RUN_FINISHED`. The chat shows a red hint when a run had failed calls, independent of what the model writes.

Files: [ag-ui-stream.ts](agent/src/mastra/routes/ag-ui-stream.ts), [run-result-schema.ts](shared/run-result-schema.ts), [run-info.ts](src/app/shared/run-info.ts)

## Prompting

### Prefer examples over rules

Gemma follows examples much more reliably than rules, and it copies them almost literally. On six JSONata tasks, pattern examples for excluding values and for comparing a row with the previous one raised the correct results from 4 of 18 to 15 of 18. On six new tasks that resemble no example, the same examples still raised the score from 12 of 18 to 17 of 18.

Files: [evaluate-jsonata.ts](agent/src/mastra/tools/evaluate-jsonata.ts)

### Put guidance next to the field it is about

Descriptions of tools and fields had a stronger effect than sentences in the system prompt. A chained example in the description of the `expression` field fixed the missing JSONata blocks in 4 of 4 runs, while rules in the system prompt rarely helped and sometimes hurt. When an example is copied into the wrong place, as the per-group example into a `splitBy` expression, one clarifying sentence next to it fixed that.

Files: [query-schema.ts](shared/query-schema.ts), [evaluate-jsonata.ts](agent/src/mastra/tools/evaluate-jsonata.ts)

### Fix rules the model reads too literally

"Don't call it again" made Gemma believe that it may only call `runQuery` once per answer, so it couldn't show several charts. "Call each visualization once per answer" made the sales agent refuse several pie charts. The rules now say "in the same answer" and allow several charts in one step, and the sales prompt forbids JSON and code blocks in the chat, which the model printed after charts.

Files: [dashboard-agent.prompt.ts](agent/src/mastra/agents/dashboard-agent.prompt.ts), [sales-agent.prompt.ts](agent/src/mastra/agents/sales-agent.prompt.ts), [sales-data.prompt.ts](agent/src/mastra/agents/sales-data.prompt.ts)

## Measuring

### Show model and duration of every run

The AG-UI route adds the model and the duration to the result of `RUN_FINISHED`, and the chat shows both in small print below the messages. This makes it obvious which model answered and how long a change in the prompt or the tools costs.

Files: [ag-ui-route.ts](agent/src/mastra/routes/ag-ui-route.ts), [ag-ui-stream.ts](agent/src/mastra/routes/ag-ui-stream.ts), [run-info.ts](src/app/shared/run-info.ts)

### Measure every change with an evaluation

`npm run eval` sends the example prompts of both chats to the running agent over AG-UI and checks the tool calls and charts against reference values from the aggregation server. It accepts "Other" groups when their value equals the rest of the group and runs each case three times. The baseline is 24 of 24 runs for the dashboard chat and 0 of 9 for the sales chat, which still has to copy the data into the chart arguments itself.

Files: [cases.ts](eval/cases.ts), [eval.ts](eval/eval.ts), [ag-ui.ts](eval/ag-ui.ts), [data.ts](eval/data.ts), [README.md](README.md)

### Measure in isolation before changing

Several fixes that looked obvious had no effect, so we tested each idea with a small probe against the model first. Replaying the exact request that Mastra sends, captured with a `fetch` wrapper, separated the effect of the prompt from that of the tools and the working memory. Without these probes, we would have shipped a plural tool and a JavaScript sandbox that don't help.

## Approaches That Did Not Help

### A plural tool

A `runQueries` tool with a list of specs made no difference: Gemma decides on the number of charts before the shape of the tool matters. When the values were named, as in "for desktop and for mobile", both tools produced two charts; when Gemma had to enumerate them, both produced one. Parallel calls of a single tool are already one step, so a plural tool saves neither steps nor tokens.

### A JavaScript sandbox instead of JSONata

On six tasks, JSONata reached 7 of 18 and JavaScript 6 of 18. Most failures were the same in both languages: Gemma wrote MongoDB-style filters like `{ "$ne": "(not set)" }` and `count_distinct`, which the API didn't support. A sandbox would add a security boundary to maintain, while closing these API gaps helped both.

### Forcing or forbidding tool calls

With `tool_choice: "required"`, Gemma called `addDashboardItem` and even `updateDashboardItem` in response to "Thanks!". With `toolChoice: "none"` on the last step, Mastra drops the tools and Gemma writes its native `<|tool_call>` syntax as text into the answer. Neither is a safe way to force a final answer.

## Open Issues

The sales chat fails all evaluation cases: it folds categories into a wrongly computed "Other", loops on JSONata errors and doesn't produce one chart per continent. Moving its charts to the `runQuery` pattern of the dashboard chat is the most promising next step and can now be measured with `npm run eval`. Gemma also leaks an empty `<|channel>thought` marker into about one answer in 12, and sometimes uses series instead of `splitBy` for "one chart per value".
