# Participatory Design Harness

TODO: Explain what problem this solves.

## Development

This project is built using [AssistantUI](https://www.assistant-ui.com/), [Next.js](https://nextjs.org/), [shadcn](https://ui.shadcn.com/), and TailwindCSS.

```bash
# Install Dependencies
pnpm i

# Start the server
pnpm dev

# Fix formatting
pnpm format:fix

# Build
pnpm build
```

You must set these environment variables prior to running or deploying this harness.

```bash
OPENAI_API_KEY=foobar
SYSTEM_PROMPT_LOCATION=/full/path/to/system-prompt.txt
PATIENT_ID=1234
PATIENT_DATA_LOCATION=/full/path/to/csv/files/
PATIENT_THREADS_LOCATION=/full/path/to/location/
```

- `OPENAI_API_KEY` is exactly what you think it is.
- `SYSTEM_PROMPT_LOCATION` is the _absolute/full path_ to the additional System Prompt on your computer as a _text file_.
- `PATIENT_ID` is the patient/participant identifier you will use for a session. You will modify this per session.
- `PATIENT_DATA_LOCATION` is the _absolute/full path_ to the

### Persistence

This is meant to be run locally but [is deployed in Vercel](https://participatory-design-harness.vercel.app) for a demo.

- When run **locally**, all conversation data is read from and written to disk to the location specified by `PATIENT_THREADS_LOCATION`.
- When **deployed**, all conversation data is read from and written to LocalStorage.

### Patient Data

These are CSVs in the location specified by `PATIENT_DATA_LOCATION`. Together with the `PATIENT_ID`, they _must_ be named:

The naming schema needs to be like this:

- `{PARTICIPANT_ID}_data_all_available.csv`
- `{PARTICIPANT_ID}_data_past_1_month.csv`
- `{PARTICIPANT_ID}_data_past_3_months.csv`
- `{PARTICIPANT_ID}_data_past_6_months.csv`
- `{PARTICIPANT_ID}_data_past_1_year.csv`
- `{PARTICIPANT_ID}_data_past_2_years.csv`

There's no scricture that all of these _must_ be present. The dropdown under the greeting in a new thread will reflect the presence/absence of any or all of these.

### Default LLM

See `app/constants.ts` for all the current OpenAI models. Generated using this handy-dandy script:

```typescript
import OpenAI from "openai";

(async () => {
  (await new OpenAI({ apiKey: process.env.OPENAI_API_KEY }).models.list()).data.map((m) =>
    console.log(m.id),
  );
})();
```

We're using ChatGPT 5.2 since that's the one anointed by Columbia. Thread summaries (in the sidebar) are generated usin GPT 4o Mini.

### Running this Harness

All participatory sessions are run locally and over Zoom but a demo is [deployed in Vercel](https://participatory-design-harness.vercel.app/). It uses the following additional system prompt:

```text
Speak like a caveman. Be brief. Save a poor graduate student some tokens yo.
```

And the following CSV data generated using ChatGPT

```text
Object,Emotion,Intensity
dog,happiness,high
cat,sadness,medium
tree,calm,low
car,anger,high
book,curiosity,medium
phone,anxiety,high
chair,boredom,low
table,surprise,medium
bicycle,fear,high
flower,love,medium
computer,excitement,high
clock,frustration,medium
lamp,calm,low
backpack,curiosity,medium
shoe,happiness,low
umbrella,sadness,high
camera,surprise,medium
guitar,love,high
piano,excitement,medium
television,boredom,low
mirror,anxiety,medium
window,calm,high
.
.
.
```

## Authors

- Adrienne Pichon
- Nikhil Anand

## License

MIT

---

## TODO

- [x] Allow participants to pick the timespan
- [x] Title above chats
- [x] Model picker -- fix to ChatGippity 5.2
- [x] Collapsible indicator
- [x] Mini search as modal
- [-] Quotes around chat summaries?
- [ ] Try with Lab key and lab data
- [x] Remove edit button
- [x] Remove loop button
- [x] Remove markdown button
- [-] Remove copy button
- [x] Fix colors?
- [x] Vercel for demo?
- [ ] Graceful/human error handling in UI?
