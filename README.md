# Participatory Design Test

## Development

TODO: Finish this.

```bash
# Install Dependencies
pnpm i

# Start the server
pnpm dev

# Add new components
npx assistant-ui add
```

### Key Files

- `app/assistant.tsx` - Sets up the runtime provider
- `app/api/chat/route.ts` - Chat API endpoint
- `components/assistant-ui/thread.tsx` - Chat thread component

### Participant Data

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

We're using ChatGPT 5.2 since that's the one anointed by Columbia.

## Authors

- Adrienne Pichon
- Nikhil Anand

## License

MIT

---

## Other Notes



---

## TODO before Sessions

- [ ] Allow participants to pick the timespan
- [ ] Title above chats
- [ ] Model picker -- fix to ChatGippity 5.2
- [ ] Collapsible indicator
- [ ] Mini search as modal
- [ ] Quotes around chat summaries?
- [ ] Try with Lab key and lab data
- [ ] Remove edit button
- [ ] Remove loop button
- [ ] Remove markdown button
- [-] Remove copy button
- [ ] Fix colors?
- [ ] Vercel for demo?
- [ ] Graceful/human error handling in UI?
