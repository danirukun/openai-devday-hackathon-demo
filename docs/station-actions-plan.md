# Venue actions and pet state plan

**Status: planning only.** This incorporates the Discord handoff and the request for areas that restore energy and fun over time. The user approved dot-style printer figures and a photo wall separate from the physical plotter. Other changes remain proposals. See [pet actions](pet-actions.md) for the current implementation status. The GLB is being built by a teammate.

## Demo and scope

Protect the core journey: an attendee signs in, imports or selects a pet, watches a real Decisions API choice in the shared world, and sees the same result in another browser after refresh. Preserve time for a public repository, setup instructions and a demo video under 90 seconds. Do not imply that a station or generated message exists until it works end to end.

Priority for the six-hour hackathon:

1. Keep sign-in, pet import, shared activity and a real decision reliable. The built-in Supabase email sender is restricted to authorized organization members, so general attendee sign-in remains a demo blocker until an appropriate sender is configured.
2. Build one complete station slice first: printer choice, shared persistent result, visible pet movement and a simple prebuilt object. Use placeholder positions until the venue GLB arrives. Add state changes only when they help demonstrate the slice.
3. Add the photo wall, refreshments, plotter, inventory and messaging only if the full journey, two-browser test and video remain on schedule. Do not treat the full handoff as the minimum demo.

## Actions in the handoff

Retain `approach`, `wave` and `explore`. The handoff proposes these additional actions:

| Action | Proposed result |
| --- | --- |
| `use_printer` | The Decisions API chooses a prebuilt dot figure. The pet receives a persistent item and the shared world can show the object. It is not a newly generated 3D model. Confirm the final figures with the scene builder and permission to use OpenAI's dots look with the organizers. |
| `take_photo` | Two available pets pose at the photo wall. Both receive a shared photo record; a visitor can capture the scene in the browser. The record is not an image file. |
| `use_plotter` | A pet's image becomes ready for a visitor to download and submit manually to [Bevell](https://bevell.app/devday). Do not automatically use the shared physical plotter or claim a portrait was plotted. Verify that the service accepts and produces useful results from transparent pet sprites, and that the visitor has permission to share the image. |
| `visit_refreshments` | A pet receives a virtual food item or Codex Cola. |
| `send_message` | The Decisions API chooses a tone; a separate small text model writes one public, pet-to-pet message. The feed identifies that model. |

The user approved the photo-wall/physical-plotter split and dot figures. Codex Cola instead of coffee remains a proposed change. Inventory, mood and messages add scope; their full design is not yet implemented. Contact exchange remains an owner-controlled, mutual opt-in feature requiring profiles and pet ownership; a pet decision must not expose or trigger sharing of contact details.

## Shared pet state

The handoff proposes four server-owned needs: fullness, energy, fun and social, each starting at 70 on a 0–100 scale. Needs decay with elapsed time and are floored at 10, and action gains are capped at 100. Its starting balance proposals are:

| Need | Proposed decay | Proposed action gains |
| --- | --- | --- |
| Fullness | 10/hour | food +35 |
| Energy | 8/hour | Codex Cola +30; exploring costs 10 |
| Fun | 10/hour | printer +25, plotter +25, photo +20, explore +15 |
| Social | 12/hour | photo +25 to each pet; message +15 sender and +20 recipient; approach or wave +10 to each pet |

Treat these as tuning values, not settled game balance. Mood is a deterministic game label: the lowest need below 30 gives hungry, sleepy, bored or lonely; otherwise all four above 75 gives excited; otherwise happy. Show this as pet state, not model reasoning. Give Decisions the needs, mood, recent actions, eligible stations and inventory as context; it still chooses the action rather than following a forced rule.

### Area bonuses over time

Some areas, especially the keynote/presentation area, should restore **both energy and fun** more quickly while a pet is present. Model this with configurable per-area energy and fun gain rates and multipliers. A one-minute tick is a starting cadence, not a requirement to run a timer or write to the database every minute. Apply earned increments from authoritative elapsed time so a refresh or a second browser cannot double-count them. Stop accruing when a pet leaves; clamp needs at 100, and account for decay over the same interval.

The server must know when each pet entered and left an area. Record or derive a shared, authoritative area and entry time rather than inferring presence separately from each browser's animation. Settle elapsed time once on transitions and actions. Define rounding, partial-minute handling, offline/server-restart behavior, overlapping areas and whether bonuses accrue when no one is watching before implementation. The current world has no authoritative areas or arrival tracking, so the bonus is not available yet.

Proposed starting test values, subject to tuning: a regular eligible area adds 1 energy and 1 fun per completed minute, while the keynote area has a 2x multiplier for each, adding 2 energy and 2 fun per completed minute before decay and caps. This is an example, not a decision by the model. Ordinary areas with no explicit bonus add nothing. Test whether this makes keynote stays too dominant relative to action gains and ensure pets can leave.

## Shared state and safeguards

- The server offers only eligible actions. Paired actions need another pet; busy stations cannot be selected. The photo wall may hold exactly two pets for one photo. Release reservations on completion, failure or timeout.
- Persist action, participants, station status and outcome once. Commit event, resulting inventory and both pets' updated needs atomically. A pet's inventory is capped at 12 items; the handoff also proposes no more than three dots and one ready-to-plot portrait per pet. A photo record belongs to both pets. Deleting a pet deletes its inventory.
- Return shared activity, inventory and game state to visitors without exposing email or private profile details. An item record is not a stored photo or an actual plotted portrait.
- Treat visitor-entered personalities as untrusted data. A message is one friendly public sentence, at most 140 characters. Reject multiline content, links and contact details, then run moderation before storing it. On invalid output, a failed moderation check or timeout, save no message and report a failed turn; do not substitute fabricated text. Do not message the same partner twice in a row. The exact text model and tone list remain open.
- Preserve the existing one-turn-per-30-seconds and 30-turn-per-process limits, and pause decisions when nobody is viewing. The current local process has reached its limit; plan an intentional demo reset without silently raising the limit. Message calls share the turn budget and have their own short timeout.
- Keep server credentials out of the browser and repository. New database tables and functions need restricted server access and row-level security. Test invalid choices, contention, timeouts and rollback; do not overwrite migrations already applied.

## Venue handoff

Proposed anchors for the scene builder are `PrinterStation`, `PhotoBoothStation`, `PlotterStation` and `RefreshmentsStation`. The first three station locations suggested by the Discord handoff are along the Demos–Hacking wall, with refreshments in the food area. Reserve a distinct presentation/keynote area with a clearly identifiable floor region where multiple pets can linger and earn the area bonus. Agree exact positions, boundaries and anchor names with the teammate; neither anchors nor authoritative area tracking are implemented. Keep paths and pets visible from the fixed isometric camera and provide fallback positions when the GLB or an anchor is unavailable.

## Verification and open decisions

- Use fake clocks to check completed minutes, area entry and exit, decay, caps, restart behavior and two browsers observing identical values. Check an action and an area transition at the same time cannot double-apply a bonus.
- Use fake model responses to check eligible actions, station occupancy, timeout release, inventory caps, atomic writes, invalid answers, message validation and prompt-injection attempts. Existing events must still load. Verify the completed slice in two browser sessions and on a phone.
- Team decisions still needed: confirm the proposed drink change, final dot choices and rights; message model and tones; area boundaries, occupancy and bonus rates; offline accrual; and whether the physical plotter actually works with sprites. Confirm venue layout and anchors with the scene builder.
