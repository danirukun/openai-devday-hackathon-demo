# Pet actions

Current implementation update: shared needs, elapsed-time decay, action gains and deterministic mood are implemented by the additive shared_pet_needs migration, needs.mjs and the unified turn save. The card shows four meters and real mood. Area bonuses and inventory consumption remain planned. This update supersedes older references below to mood being unimplemented.


For the Discord handoff, proposed changes and timed area bonuses, see the [venue actions and pet state plan](station-actions-plan.md). The user has approved dot-style figures, separate photo wall and plotter activations, Codex Cola instead of coffee, and messages written by a light text model. Pet moods and area bonuses remain planned.

Pet Island's actions should give attendees a reason to watch, share and meet. A single server-owned Decisions API choice selects the pet's next action using its personality and relevant world context. All visitors should see the same action and result.

## Available now

Server-side, every action below is implemented; `actions.sql` is required for all but the first four.

| Action | What happens | Result |
| --- | --- | --- |
| **Approach** | Walk over to greet another pet. | Event only. |
| **Wave** | Wave hello to another pet. | Event only. |
| **Explore** | Move around the island alone. | Event only. |
| **Printer** (`use_printer`) | Choose and print one of three dot figures. | A dot in the pet's inventory. |
| **Photo wall** (`take_photo`) | Pose together with the partner pet at the photo wall. | A photo record in **both** pets' inventories. In the scene, a camera flash fires once both pets reach the wall, then a printed photo of the pair in front of the backdrop pops up, holds and fades. |
| **Plotter** (`use_plotter`) | Get a portrait of the pet ready to plot. | A *ready to plot* portrait record, at most one per pet. |
| **Refreshments** (`visit_refreshments`) | Pick up food or a Codex Cola. | A `food` or `codex_cola` item. |
| **Send message** (`send_message`) | Send the partner pet a short message. | A checked, moderated message in the feed. Only when `MESSAGE_MODEL` is set. The sender walks over to the partner while the message shows, as for Approach. |

Each turn the server picks the acting pet and a **random** partner, and gives the Decisions API both personalities, the acting pet's last six events (its own and those it took part in) and its inventory, asking it to prefer variety. It only offers actions that make sense: paired actions need a partner, stations must be free (each is busy for 20 seconds after use), inventories hold at most 12 items (3 dots, 1 portrait), a pet doesn't visit refreshments twice in a row or message the same partner twice in a row. Pets already at a station, including both pets at the photo wall, are unavailable for other actions until their 20-second visit ends. The printer dot, refreshment item and message tone are extra questions in the same Decisions request. The world records each event with a plain-language line and exposes the decision context and confidence when a pet is clicked.

The scene moves pets to placeholder stations, and pet details list their inventory. Photo takes show a flash and a short-lived photo of the pair. Still to build: a saved or shareable photo image, drawing portraits and refreshment items in the scene, the plotter download link (see the [plotter handoff](plotter-handoff.md)), pet moods and area bonuses.

## Requested venue activations

### 3D printer: create a miniature object

A pet approaches a 3D printer on a table, chooses what to make, and watches a small object appear in the world. Other visitors see the same pet, choice and resulting object. The finished object should remain visible long enough to inspect and feature in the demo.

For the hackathon, the team chose to let the Decisions API select from a few clearly different, prebuilt or procedurally constructed 3D objects based on the pet's personality. This provides an immediate, real 3D result. It does not claim to generate an arbitrary novel 3D model; that is outside the first version.

### Photo wall and separate plotter

The user approved two separate activations. At the photo wall, two pets pose together for a shareable browser screenshot; the server records the photo for both pets. The scene already shows a flash and a temporary photo of the pair in front of the backdrop, drawn in each browser from the saved event's timing and the two pets' sprites; no image is stored, and a saved or shareable screenshot is still to do. The plotter marks a pet portrait ready for a visitor to submit manually to Bevell, subject to permission and a successful sprite test; the download link is still to do. Never automatically submit a pet image to the shared physical plotter or claim a portrait was plotted without confirmation.

### Food and Codex Cola: visit the refreshment area

A pet approaches the venue's food area and chooses food or a Codex Cola. Show the pet receiving a small, recognizable item and record the visit as a shared world event. Keep this as one simple station with two possible outcomes; the food and Codex Cola are virtual props.

### Send a message

The Decisions API chooses `send_message` and a tone (cheerful, shy, punny, nerdy, competitive or sleepy) that suits the pet's personality. A light text model, set by `MESSAGE_MODEL`, writes one friendly sentence of at most 140 characters. Personalities are passed as untrusted data. The server rejects multiline text, links and contact details, then runs OpenAI moderation; if anything fails or times out, nothing is saved and the turn shows as failed. The feed names the model that wrote the message, never presenting it as the Decisions API's reasoning. In the scene, the sender shows the message in a speech bubble above its avatar for the same 20-second window as other actions, fading in and out. The bubble is presentation only: it is drawn from the saved event's message and nothing extra is stored.

### Meet and exchange contact details

When two pets meet, they can invite their owners to connect. Each owner must explicitly opt in to the exchange before either owner can see the other's selected handles. A Decisions API choice alone must never disclose an owner's details. The activity feed can show that pets met without publishing private handles.

### Attendee profile

After individual accounts are introduced, attendees can add optional social or contact handles to a profile and later edit or remove them. The temporary shared-password gate has no individual ownership or profiles. Do not use the login email as a public handle or share it automatically. Handles are private by default and are shared only with the other owner after both opt in. Until this is implemented, contact sharing stays off.

The existing application does not currently link a pet to its owner or have attendee profiles. Both are needed for this interaction; existing pets must remain usable without inventing ownership. Profile details and visibility must be enforced on the server, not just hidden in the interface. Validate handles and construct safe links for supported platforms rather than rendering arbitrary user-supplied HTML or unsafe URLs. Allow owners to withdraw sharing and edit or delete their own handles.

## Shared rules

- Decisions must actually come from the Decisions API; generated captions must not be presented as its reasoning.
- The active station, resulting object or portrait, and completion state must be shared and persist across refresh for all visitors. Avoid running the same generation independently in every browser.
- A station handles one pet at a time; the photo wall holds one pair. Show an occupied or failed state and release the station on timeout; cap stored artifacts and API usage.
- Record only information needed for the shared result. Personalities and uploaded pet art are already shared; do not capture participant emails or private browser contents in a photo-wall screenshot.
- The teammate's venue GLB is not ready. Agree on printer, photo wall, plotter and refreshment-area positions with the teammate and provide a temporary in-app representation so the interaction can be developed and tested independently.
- Check rights before reusing pet artwork or venue branding in shareable outputs.

## Demo sequence

A visitor signs in, optionally adds handles, imports or selects a pet, and gives it a personality. The Decisions API can send the pet to the printer, photo wall, plotter or refreshments, or have it message another pet; another visitor sees the same activity. When pets meet, owners can connect only after both owners opt in. The actions are implemented on the server, and the scene moves pets to placeholder stations (the photo wall, plotter and refreshments are simple stand-ins until the venue GLB arrives). Drawing photos, portraits and refreshment items in the scene, and contact sharing, are not yet built.
