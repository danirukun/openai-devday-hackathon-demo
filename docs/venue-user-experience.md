# Pet Island — venue and user experience

**Status: proposed design for review.** The printer dot figures and separate photo wall and physical plotter are approved; other new station proposals remain under review. This document covers how attendees enter, explore and understand the venue; it does not mean the proposed screens or venue are already implemented.

## Experience in one sentence

An attendee brings a pet into a miniature version of the hackathon venue, watches it meet other pets and use the venue's playful stations, and can choose whether to connect with another owner.

## The core journey

1. **Arrive:** Open directly into the full-screen Three.js venue. Keep sign-in and **Add pet** at the edge of the scene. Before sign-in, show the venue preview without presenting private world activity as live data.
2. **Sign in:** Enter the shared event password; no signup or email is required. If the 50-person capacity is reached, explain that the venue is full and offer a retry; do not reveal other attendees' email addresses.
3. **Bring a pet:** Choose a Petdex pet or upload a Codex pet ZIP, add a short personality, and optionally add profile handles. Make it clear that the pet and personality are shared, while handles stay private until both owners opt in. Existing attendees can edit their profile later.
4. **Enter:** Place the pet in the shared venue and show a short, dismissible orientation: the activity feed, clickable pets and the printer, photo wall, plotter and refreshment area. The same signed-in account in multiple tabs occupies one of the 50 places.
5. **Watch and connect:** The Decisions API selects a bounded action; show the pet move and the resulting activity. A visitor can inspect a pet or station. If two pets meet, their owners can opt in separately to exchange selected handles; the general activity feed never displays private handles.

The venue and activities are primarily observed; the initial design does not promise that a visitor can manually direct every pet or force a particular Decisions outcome.

## Main screen

**Desktop and phone are both required:** The isometric venue fills the viewport. Place compact, game-like controls along its edges: the venue identity and connection status, sign-in and Add pet controls, and a persistent activity panel. The pet count opens a text-based pet list for inspection. Profile and connection controls remain planned. Avoid a separate marketing landing page.

- **Activity:** recent shared events in plain language, such as “Mochi printed a pink dot” or “Boba posed for a photo with Pip at the photo wall.” Show progress and completed results only when they actually exist. Selecting an event opens its detail.
- **Pets:** a text list of pets, owners' public pet names and current activities. Selecting one highlights it and exposes the same details available by clicking it in the scene. This supplies a keyboard-accessible alternative to hitting small sprites.
- **Pet detail:** show the pet's name, supplied personality, current activity and recent event. When a real Decisions result exists, show the supplied context and returned choice/confidence as a **decision trace**, never as a fabricated explanation of the model's reasoning. Show creator attribution for Petdex pets.
- **My profile:** edit or remove the attendee's optional handles and see pending connection invitations. Keep email and private handles out of public activity cards and screenshots.
- **Station detail:** identify the printer, photo wall, plotter or refreshment area, show whether it is available or in use, and display a finished dot figure, photo or ready-to-plot portrait when available. The first version needs no general building editor or arbitrary placement tools.

## Mobile experience

Attendees can complete the same sign-in, pet selection or upload, observation and mutual-opt-in connection journey on an ordinary phone browser. Portrait orientation is the default; landscape is optional. The venue, activity and contact permissions are shared with desktop visitors, not a separate mobile world.

- **Layout:** Keep the venue full-screen with a compact header and an activity panel at the bottom edge. The pet count opens a touch-friendly list; profile and connection views remain planned. Selecting a pet or station must leave an obvious way to return to the venue. Respect the phone's safe areas and dynamic browser bars, and avoid horizontal scrolling or controls hidden behind the keyboard.
- **Touch:** Tap a pet or station for details, with a selectable text list as an alternative when small sprites are hard to hit. Aim for at least 44 × 44 CSS-pixel interactive targets, visible focus states and readable labels. Normal page scrolling must work without accidental scene gestures; don't require drag, hover, pinch or rotation to finish the journey.
- **Sign-in:** Use the shared password on each browser or device. Tabs in the same browser share a session; the password gate does not identify individual owners.
- **Bring a pet:** Offer the Petdex gallery and the ZIP upload equally. The ZIP picker must work with the phone's native Files chooser, including files stored on-device or in a cloud drive. Show format/size errors in the form, retain the personality after an error, and allow the gallery path when the attendee has no ZIP. No camera access is required for the virtual photo wall.
- **Speech bubbles:** When a pet sends a message, show it in a speech bubble above that pet's avatar for about 20 seconds, wrapped to a few lines and truncated if long. The sending pet also walks toward the recipient while the message shows. The full text stays in the activity feed.
- **Readable shared activity:** Present recent events as concise cards; make printer outcomes and photo-wall screenshots tappable for a larger view. Keep handles hidden until both owners opt in. Profile and connection controls must remain reachable without relying on small objects in the 3D scene.
- **Performance and fallback:** Keep the GLB and textures lightweight, cap rendering pixel density, and adapt the view to available screen size. If WebGL or model loading fails, show a clear message and retain usable text-based activity and pet controls where possible; never invent simulated events. Actual performance depends on the delivered model and device.

## Venue direction

The teammate's GLB should depict a miniature cutaway of the supplied venue references: warm red-brown brick, concrete columns and floor, dark ceiling beams and curtains, tall industrial windows and skylights, neutral daylight, warm spotlights, and restrained blue/magenta accents. Keep the friendly, toy-like pets legible against that industrial setting. The provided photographs stay private and are not copied into the public repository.

Use the existing fixed isometric camera as the starting view. Remove or cut away the walls and ceiling facing the camera. Place the printer table, photo wall, plotter, and food/Codex Cola station around a clear central floor so they remain distinguishable at the scene's actual display size. Keep pets, station entrances and important results unobstructed by foreground geometry.

### Blender handoff and station positions

- The teammate creates the GLB elsewhere; this machine does not build the Blender scene. Follow the existing `docs/venue-glb-handoff.md` contract for Y-up export, embedded textures, scale normalization, file size, and supported compression.
- **Proposal to agree with the teammate:** include named anchor nodes `PrinterStation`, `PhotoBoothStation` (the photo wall), `PlotterStation`, and `RefreshmentsStation`, each on the floor at the point where a pet should stand. These names are a proposed contract: the current app does not read anchors yet. The loader must locate and transform them after the GLB is centered and scaled.
- If an anchor is missing, show an available fallback station position or a clear station-unavailable state; never route pets to an invisible origin. Station status and outcomes must not depend on every browser independently simulating the interaction.
- Existing movement is simple interpolation; it has no collision detection or navigation mesh. Until pathfinding is deliberately added, keep direct routes across open floor and validate them with the delivered venue.
- Keep the current island as an honest fallback while the GLB is missing or invalid. Once the real file arrives, compare lighting and materials in the browser; Blender render lighting does not automatically match Three.js.

## Interaction and shared state

The server remains the authority for a pet's chosen action and the shared event. All connected visitors should see consistent station activity and outcomes after refresh. Show a pet travelling, a short in-progress state and the final result; if the active viewer opens later, show the current or completed state rather than pretending a new decision occurred.

A station handles one pet at a time, except for the two-pet photo wall. Make occupancy legible and recover cleanly if a turn fails. The printer uses prebuilt dot figures. The photo wall and physical plotter are separate: visitors can capture the posed pets at the wall, and a person must manually submit a permitted image to Bevell for the plotter. The scene shows placeholder photo wall and plotter stations that pets walk to; capturing the screenshot and the Bevell hand-off are not implemented yet.

Handles are optional and private by default. Each owner must opt in before either sees the other's selected handles. A pet meeting or model decision must never bypass that consent. Show pending, accepted, declined and withdrawn states only to the relevant owners. Existing pets have no owner relationship today; don't infer or assign an owner retroactively.

## States that need clear copy

- **First visitor / no pets:** explain how to bring a pet; don't show simulated activity as real.
- **Waiting for a decision:** show that pets are settling in, and distinguish this from an API failure.
- **Venue full:** explain the 50-person limit and let the visitor retry; a stale place expires after two minutes without a heartbeat in the current implementation.
- **Invalid password or unavailable sign-in:** show a clear retry message without disclosing the configured password.
- **Bad ZIP or unsupported sprite:** keep the form open with the specific safe validation message and allow another file.
- **Missing GLB, unavailable Petdex or failed decision:** preserve the parts of the experience that work and clearly identify the unavailable piece. Never describe fallback behavior as an AI choice.
- **No handle or no mutual consent:** keep contact information hidden and explain the next voluntary step to the relevant owner only.

## Visual and accessibility principles

Keep the interface quiet around the colorful venue: warm off-white surfaces, deep green text and controls, warm brick/coral accents, with blue and magenta reserved for the venue's lights. Use readable text and contrast, keyboard-operable forms and tabs, visible focus indicators, labels that don't depend on color alone, and a text equivalent for scene events. Respect reduced-motion preferences for station and pet animations. The scene should scale with the window while preserving a usable, non-overlapping view of the central floor.

## Verification before the demo

1. Use two distinct permitted accounts in separate browser profiles. Each can sign in, add a pet and see the other's pet and the same activity after a refresh.
2. Verify the complete journey on a real iPhone in Safari and a real Android phone in Chrome when available: password entry, native ZIP selection, gallery selection, activity/pet details, opt-in controls and shared state with a desktop session. Test portrait at a narrow viewport, keyboard-open and browser-bar states, safe areas, touch targets, reduced motion and WebGL/model-load failure. Browser emulation supplements but does not replace the real-device checks; record unavailable devices as unverified.
3. With the teammate's actual GLB, verify orientation, floor alignment, station anchors, lighting, occlusion and pet paths. Test the missing-model fallback separately.
4. Confirm the 50-person admission boundary and empty, full, invalid-password, bad-ZIP, occupied-station and failed-API states without exposing private handles or pretending errors are successful decisions.
5. Confirm the mutual-opt-in flow with two accounts: neither sees the other's handles before both agree, each sees only permitted handles afterward, and withdrawal removes access. Verify that login emails and handles never leak into the shared event feed.
6. For the final demo, verify a publicly reachable deployment and links, a video no longer than 90 seconds, credits for the model and assets, and a concrete Codex contribution.
