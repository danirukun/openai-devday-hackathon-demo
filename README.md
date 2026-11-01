# Pet Island

A small shared island for community coding pets. Visitors choose a Petdex pet, add a personality, and watch a server-controlled OpenAI Decisions choice trigger a greeting, wave, or exploration. A click on a pet shows the inputs and returned choice; the display does not claim to expose model reasoning.

**Hackathon work in progress:** the full live journey and public deployment still need verification. Decisions run at most 30 times per server process, at least 30 seconds apart, and pause if no visitor has refreshed the world for two minutes. The app is deliberately limited to one server instance; multiple instances can trigger duplicate decisions and bypass that per-process limit. It is not a production rate limiter.

## Run locally

1. Install Node.js 20 or later. Create a separate Supabase project and apply `schema.sql` followed by `capacity.sql` once with the Supabase SQL editor. The application uses server-only access to these tables; RLS blocks anonymous direct access.
2. Copy `.env.example` to `.env`, and fill in `SUPABASE_URL`, the public `SUPABASE_PUBLISHABLE_KEY`, the server-side `SUPABASE_SERVICE_ROLE_KEY` (or compatible secret key), and `OPENAI_API_KEY`. Never commit or share `.env`. Use an OpenAI project with access to the Decisions API and billing/credits configured.
3. Run `npm start` and open `http://localhost:3000`. Petdex and the Three.js CDN require internet access. Sign in through an email link, then create two pets with innocuous personalities; wait up to 30 seconds for an interaction. Open a second browser to see the shared state. Petdex access and Decisions/model availability depend on the providers.
4. Run `npm test`. The tests cover the local HTTP boundary, input rejection and unavailable-database handling; they do not replace a live two-browser provider test.

This demo stores names, public personalities and recent interactions. Do not enter personal data or secrets. All users can view this shared content. The in-process request limits are for a small supervised demo and are not sufficient for an unrestricted public service.

## Credits

- Pet catalogue and sprite imagery: [Petdex](https://petdex.dev/), with each chosen pet's creator shown on selection in the island. Petdex hosts community submissions and does not claim ownership of underlying IP; check each asset's permission before redistributing it.
- Island teacup kiosk: generated with OpenAI image generation for this project. Island geometry is original project code.
- [Three.js](https://threejs.org/), [Supabase](https://supabase.com/), and [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions).
- Codex helped inspect current provider documentation, build the island interface and prepare the server's bounded decision loop. Verify the final demo and provider use before submitting.

## License

The project code is available under the [MIT License](LICENSE). Third-party Petdex pets remain subject to their creators' rights and are not covered by this project's license.

## Email sign-in and capacity

Email magic-link sign-in is required for the shared island. The server verifies the session with Supabase Auth and atomically admits at most 50 distinct accounts. Multiple tabs share one place. A place expires after two minutes without a world request; capacity is checked on each refresh and join. The cap is distinct from the maximum of 50 persistent pets. Configure the deployed origin as an allowed Auth redirect URL.

The Supabase built-in email sender only sends to organization team members and is unsuitable for open public hackathon access. The event requires custom SMTP for general attendees, and its send rate limit must accommodate expected sign-ins. See [Supabase authentication testing](https://supabase.com/docs/guides/auth/testing-auth-flows) and [custom SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Email addresses are retained by Supabase Auth and are not displayed in the island.
