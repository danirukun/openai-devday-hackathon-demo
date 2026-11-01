# Pet Island

A small shared island for community coding pets. Visitors choose a Petdex pet or upload a Codex pet ZIP, add a personality, and watch a server-controlled OpenAI Decisions choice send it to greet other pets, explore, print a dot figure, pose at the photo wall, visit the plotter, grab food or a Codex Cola, or send another pet a message. Pets also roam on small, time-based paths between decisions. Roaming is visual behavior, not a Decisions API call or a stored event. A click on a pet shows the inputs and returned choice; the display does not claim to expose model reasoning.

**Hackathon work in progress:** the full live journey and public deployment still need verification. Decisions run at least 10 seconds apart, with no total cap, and pause if no visitor has refreshed the world for two minutes. The app is deliberately limited to one server instance; multiple instances can trigger duplicate decisions. There is no spending cap, so watch your OpenAI usage while a visitor has the page open.

## Run locally

1. Install Node.js 22.9 or later and run `npm ci`. Create a separate Supabase project and apply `schema.sql`, `capacity.sql`, `upload.sql`, `printer.sql`, then `actions.sql` once each with the Supabase SQL editor. Run `actions.sql` before starting the new server code; the server needs its columns. The application uses server-only access to these tables; RLS blocks anonymous direct access.
2. Copy `.env.example` to `.env`, and fill in `SUPABASE_URL`, the server-side `SUPABASE_SERVICE_ROLE_KEY` (or compatible secret key), `OPENAI_API_KEY`, and a shared `ISLAND_PASSWORD`. Optionally set `MESSAGE_MODEL` to a light OpenAI text model to turn on pet messages; leave it empty to keep them off. Never commit or share `.env`. Use an OpenAI project with access to the Decisions API and billing/credits configured.
3. Run `npm start` and open `http://localhost:3000`. Petdex and the Three.js CDN require internet access. Enter the shared password, then create two pets with innocuous personalities; wait up to 10 seconds for an interaction. Open a second browser to see the shared state. Petdex access and Decisions/model availability depend on the providers.
4. Run `npm test`. Automated turn tests use fake Decisions responses and an isolated fake store; they do not replace a live two-browser provider test. If local PostgreSQL tools are installed, `sh test/verify-printer-db.sh` also tests competing writes in a disposable database. `test/verify-actions-db.sh` applies every migration to a disposable database and checks `actions.sql`; with Docker, run `docker run --rm -v "$PWD":/repo:ro postgres:17 su postgres -c 'sh /repo/test/verify-actions-db.sh'`.

This demo stores names, public personalities and recent interactions. Do not enter personal data or secrets. All users can view this shared content. Uploaded sprites are served through an unguessable image URL, which anyone possessing it can access. The in-process request limits are for a small supervised demo and are not sufficient for an unrestricted public service.

## Credits

- Pet catalogue and sprite imagery: [Petdex](https://petdex.dev/), with each chosen pet's creator shown on selection in the island. Petdex hosts community submissions and does not claim ownership of underlying IP; check each asset's permission before redistributing it.
- Island teacup kiosk: generated with OpenAI image generation for this project. Island geometry is original project code.
- [Three.js](https://threejs.org/), [Supabase](https://supabase.com/), and [OpenAI Decisions API](https://developers.openai.com/api/docs/guides/decisions).
- Codex helped inspect current provider documentation, build the island interface and prepare the server's bounded decision loop. Verify the final demo and provider use before submitting.

## License

The project code is available under the [MIT License](LICENSE). Third-party Petdex pets remain subject to their creators' rights and are not covered by this project's license.

## Shared password and capacity

The temporary gate uses a server-configured shared password and an HTTP-only, SameSite=Strict session cookie. There are no signups or email addresses. Set `ISLAND_PASSWORD` privately in the runtime environment and share it with attendees outside the repository. Set `COOKIE_SECURE=true` on HTTPS deployments; use `false` for localhost. Sessions expire after eight hours or a server restart. The server limits failed password attempts per network address in each process; it is a basic demo safeguard, not production-grade protection.

The server atomically admits at most 50 active browser sessions using Supabase. Tabs in one browser share a slot; different browsers take separate slots. A slot expires after two minutes without a world request or is released on sign-out. This is separate from the 50-pet limit. This gate does not identify owners or protect information between attendees: anyone with the shared password can see the same island. Use individual authentication and access controls before adding private profiles or contact sharing. The current session store and rate limit are per server process, so run only one server instance.

## Bring your own pet

Choose **Upload a ZIP** in the pet form. Include one `pet.json` with a `displayName` and relative `spritesheetPath`, and the PNG or WebP file named by that path. The manifest and sprite may be inside one parent folder. Supported sprite sheets are 1536×1872 (8×9) or 1536×2288 (8×11). The ZIP limit is 8 MiB; the extracted sprite limit is 5 MiB. Unsafe paths, duplicate files and oversized archives are rejected. Only the manifest name and sprite image are saved, not the full archive. Upload only pets and artwork you have the right to share.

## Venue model handoff

The app uses Three.js r187 and will load an optional self-contained `public/venue.glb`. See `docs/venue-glb-handoff.md` for the Blender export contract. Until the model is present and loads successfully, the original island remains visible. The model is made by the teammate; venue photographs are not included in this public repository.

## Pet actions

See [pet actions](docs/pet-actions.md) for every action and what is still planned.

The printer station requires the additive `printer.sql` migration after the existing setup migrations. When a print is saved, its item and activity appear immediately while the pet travels to the printer; the station remains busy for 20 seconds. It stores dot items and shared station state with server-only access. The figures are provisional; confirm the rights to the dots look with the event organizers before a public demo.

The photo wall, plotter, refreshments and messages require `actions.sql`. Each turn, the server picks a random partner pet and gives the Decisions API the pet's recent history and inventory, and only offers actions that make sense (a free station, room in the inventory, a partner for paired actions). The photo wall, plotter and refreshment stations are each busy for 20 seconds after use. Photos go to both pets' inventories; a plotter portrait is only *ready to plot* until a visitor submits the pet's picture to [Bevell](https://bevell.app/devday) themselves; the app never submits it. Inventories hold up to 12 items.

Messages: the Decisions API chooses the tone and a light text model (`MESSAGE_MODEL`) writes one sentence. Each message is checked for length, links and contact details and then run through OpenAI moderation (`omni-moderation-latest`) before it is saved; otherwise the turn fails and nothing is stored. The feed names the model that wrote it, and the sender walks toward the recipient and shows the sentence in a speech bubble above its avatar for about 20 seconds. 

Pet moods and area bonuses are planned but not implemented; see [the station actions plan](docs/station-actions-plan.md). The scene has placeholder 3D stand-ins for the printer, photo wall, plotter and refreshment table (the teammate's venue GLB will replace them), and the activity panel shows whether each is ready or in use. A pet walks to the station it uses, both photo pets walk to the wall and a camera flash and a short-lived photo of the pair appear (reduced-motion settings skip the flash; no image is stored), and a messaging pet walks toward its recipient. Portraits and refreshment items are saved but not yet drawn in the scene, and photos are not kept as images; the activity feed shows each action.

## Fly.io deployment

The included Dockerfile and `fly.toml` run the app in London on one always-on Fly Machine. Configure `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY` and `ISLAND_PASSWORD` as Fly secrets; never put their values in the repository. Deploy with `fly deploy --ha=false --strategy immediate`. Run only one server against the shared world: sessions and the decision scheduler are held in memory, and a restart signs everyone out. Stop a local server connected to the same database before starting the hosted instance. Fly compute and OpenAI API usage can incur charges.
