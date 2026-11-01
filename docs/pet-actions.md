# Pet actions

Pet Island's actions should give attendees a reason to watch, share and meet. A single server-owned Decisions API choice selects the pet's next action using its personality and relevant world context. All visitors should see the same action and result.

## Available now

- **Approach:** move towards another pet to greet them.
- **Wave:** wave hello to another pet.
- **Explore:** move around the island independently.

These are the only actions currently implemented. The world records a short event and exposes the decision context and confidence when a pet is clicked.

## Requested venue activations

### 3D printer: create a miniature object

A pet approaches a 3D printer on a table, chooses what to make, and watches a small object appear in the world. Other visitors see the same pet, choice and resulting object. The finished object should remain visible long enough to inspect and feature in the demo.

For the hackathon, the recommended first version lets the Decisions API choose among a few clearly different, prebuilt or procedurally constructed objects based on the pet's personality. This provides an immediate, real 3D result. It does not claim to generate an arbitrary novel 3D model. Fully generated 3D models require a separate generation service and a latency, cost and reliability check; the team must choose that scope before implementation.

### Photo booth: pose and get a plotted portrait

A pet approaches a photo wall and poses. The booth captures an image of that pet against the wall, and an animated virtual plotter draws a recognisable sketch on a sheet of paper. Other visitors see the same finished portrait; the drawing should be inspectable in the activity feed or by clicking the pet.

The recommended first version uses the pet's visual appearance and a fixed virtual photo wall, then derives a sketch from the resulting image. It does not photograph the attendee, request camera access or claim a physical drawing has been produced. Test the effect with actual sprite artwork, including transparent uploaded sprites, before promising recognisable portraits.

## Shared rules

- Decisions must actually come from the Decisions API; generated captions must not be presented as its reasoning.
- The active station, resulting object or portrait, and completion state must be shared and persist across refresh for all visitors. Avoid running the same generation independently in every browser.
- A station handles one pet at a time. Show an occupied or failed state and release the station on timeout; cap stored artifacts and API usage.
- Record only information needed for the shared result. Personalities and uploaded pet art are already shared; do not capture participant emails or private browser contents in a booth image.
- The teammate's venue GLB is not ready. Agree on printer and booth positions with the teammate and provide a temporary in-app representation so the interaction can be developed and tested independently.
- Check rights before reusing pet artwork or venue branding in shareable outputs. Keep the built-in email sender's restriction to organization members visible as a separate public-demo blocker.

## Demo sequence

A visitor imports or selects a pet, gives it a personality, and watches the Decisions API choose the printer or photo booth. The pet travels to the station, the finished object or portrait appears, and the same result is shown in a second browser. This is a target journey, not yet implemented.
