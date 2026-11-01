# Plotter handoff

**Status: not implemented.** The server already records a "ready to plot" portrait when a pet uses the plotter. Nothing lets a visitor see it, download an image or reach Bevell. This document hands that work to whoever builds it. The rules come from [pet actions](pet-actions.md) and the [station actions plan](station-actions-plan.md).

## Decision: manual hand-off, no automation

Checked on 1 November 2026 from Bevell's public pages:

- **The DevDay plotter** (<https://bevell.app/devday>) is a web form. A visitor uploads a photo, enters a first name, ticks a consent box ("the photo is mine or I have permission, and I agree to send it to OpenAI") and clicks *Make my dot portrait*. Bevell makes a GPT Image dot portrait with a preview, then the visitor joins a queue and a robot draws it with one pen. No file limits or submission rules are documented for this flow. The gallery showed "Arm offline" when checked.
- Contact if the team wants to ask about an integration: natalie@bevell.app. Nothing has been sent.

So the app must **never** submit an image to Bevell, call its endpoints, or say a portrait was plotted. The visitor does the upload and ticks the consent box themselves. This is already a rule in the spec.

## What exists today

- The Decisions API can choose `use_plotter` (`actions.mjs`). `save_action` in `actions.sql` stores one `island_inventory` row with `item_type = 'portrait'`, no `item_key`, and makes the plotter station busy for 20 seconds. A pet can hold only one portrait.
- `GET /api/world` returns `inventory` rows (`pet_id`, `item_type`, `item_key`, `partner_pet_id`, `created_at`), capped at the newest rows. The feed says "got a portrait ready to plot."
- Pet details list a pet's inventory as plain text, so a ready portrait is already visible there.
- The scene has a placeholder plotter and pets walk to it (`public/roaming.mjs`, `public/app.js`).
- Sprites come from `GET /api/sprite?slug=…`: PNG or WebP, 1536 × 1872 or 1536 × 2288, 8 columns by 9 or 11 rows. Each frame is 192 × 208, and the first is at the top-left. `public/app.js` already crops it for the scene.
- There is no stored owner for a pet and no individual accounts. The shared password is the only identity.

## What to build

1. **Add the action to the item.** Pet details already list inventory as text, including "portrait ready to plot" (`formatInventory` in `public/pet-details.mjs`, used by `showPet` in `public/app.js`). Add a **Download portrait** button there, only for a pet that has a `portrait` inventory row in `world.inventory`.
2. **Make the image.** Crop the first sprite frame onto a canvas, scale it up with nearest-neighbour, and put it on a plain white background so transparency is not an issue. Export as PNG. Doing this in the browser needs no new dependency. A server route would need an image library, which the project does not have (it only has `image-size`).
3. **Rights prompt.** Before the download, show a short confirmation: the visitor has the right to share this pet's artwork. Petdex pets belong to their creators and uploaded pets are visitor uploads, so the prompt should name the credit shown on the pet. Skip the download if they decline.
4. **Hand-off steps.** After the download, show three steps: open the Bevell DevDay page in a new tab (`rel="noreferrer noopener"`), upload the file, tick the consent box. Say clearly that the app has not sent anything and the portrait is not plotted until they finish on Bevell.
5. **Honest states.** Don't show "plotted" anywhere. If the sprite fails to load or the first frame is blank (the scene already detects both), disable the download and say why.
6. **Keep it quiet for others.** The portrait item is shared state, so every visitor sees "ready to plot", but only someone who clicks through gets the download. Nothing about it should expose email or handles.

Optional once the above works: a "Mark as submitted" button is **not** recommended. It would add shared state the app cannot verify, which the spec warns against.

## Open questions for the team

- **Does a cartoon sprite work?** The DevDay form asks for a photo and says to keep faces and poses. Try a transparent pet sprite, and a version on a plain background, before building. If the result is poor, either drop the plotter item or say that results vary.
- **Which frame?** The first frame is the default. A larger frame or a chosen pose might trace better.
- **Is Bevell expecting this?** Ask natalie@bevell.app whether a link from the app to `/devday` is fine and whether pets' art is acceptable input.
- **Event timing.** The arm may be offline or have a long queue. Don't promise a wait time.
- **Rights.** Confirm the wording of the prompt and whether Petdex creators' pets can be sent at all.

## Tests and acceptance

- Unit test any pure helper (for example, the crop rectangle for 9-row and 11-row sheets). The browser canvas work needs a manual check.
- Manual check in two browser profiles: a pet with a portrait shows it for both; the download is a PNG of the first frame on white; declining the rights prompt downloads nothing; the Bevell link opens in a new tab and the app makes no request to Bevell.
- Check on a phone: tapping the button works and the file can be shared or saved.
- Check a blank-frame sprite and a failed sprite load.
- `npm test` passes. Update the README and the "not yet built" lists in [pet actions](pet-actions.md), [the station actions plan](station-actions-plan.md) and [the venue UX doc](venue-user-experience.md) when it ships.

## Out of scope

- Submitting to the DevDay form for the visitor, or calling Bevell from the app in any way.
- Other file formats. The DevDay form takes an image.
- Per-owner permissions. They wait for individual accounts.
