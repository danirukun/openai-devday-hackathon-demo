# Pet actions

For the Discord handoff, proposed changes and timed area bonuses, see the [venue actions and pet state plan](station-actions-plan.md). Changes to this approved baseline remain proposals until the team agrees.

Pet Island's actions should give attendees a reason to watch, share and meet. A single server-owned Decisions API choice selects the pet's next action using its personality and relevant world context. All visitors should see the same action and result.

## Available now

- **Approach:** move towards another pet to greet them.
- **Wave:** wave hello to another pet.
- **Explore:** move around the island independently.

These are the only actions currently implemented. The world records a short event and exposes the decision context and confidence when a pet is clicked.

## Requested venue activations

### 3D printer: create a miniature object

A pet approaches a 3D printer on a table, chooses what to make, and watches a small object appear in the world. Other visitors see the same pet, choice and resulting object. The finished object should remain visible long enough to inspect and feature in the demo.

For the hackathon, the team chose to let the Decisions API select from a few clearly different, prebuilt or procedurally constructed 3D objects based on the pet's personality. This provides an immediate, real 3D result. It does not claim to generate an arbitrary novel 3D model; that is outside the first version.

### Photo booth: pose and get a plotted portrait

A pet approaches a photo wall and poses. The booth captures an image of that pet against the wall, and an animated virtual plotter draws a recognisable sketch on a sheet of paper. Other visitors see the same finished portrait; the drawing should be inspectable in the activity feed or by clicking the pet.

The recommended first version uses the pet's visual appearance and a fixed virtual photo wall, then derives a sketch from the resulting image. It does not photograph the attendee, request camera access or claim a physical drawing has been produced. Test the effect with actual sprite artwork, including transparent uploaded sprites, before promising recognisable portraits.

### Food and coffee: visit the refreshment area

A pet approaches the venue's food area and chooses food or coffee. Show the pet receiving a small, recognizable item and record the visit as a shared world event. Keep this as one simple station with two possible outcomes; the food and coffee are virtual props.

### Meet and exchange contact details

When two pets meet, they can invite their owners to connect. Each owner must explicitly opt in to the exchange before either owner can see the other's selected handles. A Decisions API choice alone must never disclose an owner's details. The activity feed can show that pets met without publishing private handles.

### Attendee profile

During email sign-in, attendees can add optional social or contact handles to a profile and later edit or remove them. Existing users can set up a profile after signing in. Do not use the login email as a public handle or share it automatically. Handles are private by default and are shared only with the other owner after both opt in. Until this is implemented, contact sharing stays off.

The existing application does not currently link a pet to its owner or have attendee profiles. Both are needed for this interaction; existing pets must remain usable without inventing ownership. Profile details and visibility must be enforced on the server, not just hidden in the interface. Validate handles and construct safe links for supported platforms rather than rendering arbitrary user-supplied HTML or unsafe URLs. Allow owners to withdraw sharing and edit or delete their own handles.

## Shared rules

- Decisions must actually come from the Decisions API; generated captions must not be presented as its reasoning.
- The active station, resulting object or portrait, and completion state must be shared and persist across refresh for all visitors. Avoid running the same generation independently in every browser.
- A station handles one pet at a time. Show an occupied or failed state and release the station on timeout; cap stored artifacts and API usage.
- Record only information needed for the shared result. Personalities and uploaded pet art are already shared; do not capture participant emails or private browser contents in a booth image.
- The teammate's venue GLB is not ready. Agree on printer, booth and refreshment-area positions with the teammate and provide a temporary in-app representation so the interaction can be developed and tested independently.
- Check rights before reusing pet artwork or venue branding in shareable outputs. Keep the built-in email sender's restriction to organization members visible as a separate public-demo blocker.

## Demo sequence

A visitor signs in, optionally adds handles, imports or selects a pet, and gives it a personality. The Decisions API can send the pet to the printer, photo booth or refreshments; another visitor sees the same activity. When pets meet, owners can connect only after both owners opt in. This is a target journey, not yet implemented.
