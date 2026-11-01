# Venue GLB handoff

The venue model is being built by a teammate, not in this repository. Place the finished self-contained binary glTF at `public/venue.glb` and reload the app. Three.js r187 loads it automatically; if the file is absent or cannot load, the existing island remains visible. No reference photographs or identifiable people should be included in the public repository.

## Visual direction from the supplied photos

Use a dollhouse/cutaway interpretation of the photographed industrial interior: exposed red-brown brick walls, concrete pillars and worn concrete floor, dark beams/ceiling and black curtains. The references show large industrial windows and skylights, bright neutral daylight, warm ceiling spots, and restrained blue/magenta accent lighting. Focus on the recognisable architecture and mood; do not model identifiable attendees or copy event branding without permission.

## Export and spatial contract

- Export a single `.glb` (glTF 2.0 binary) with embedded textures. Blender 5.2.3 LTS is the latest stable release verified for this project as of 1 November 2026. Apply object transforms; use glTF's standard Y-up export.
- Design for the existing fixed isometric camera looking toward the origin from `(10, 11, 13)`; remove or cut away the front walls and roof so pets and the floor remain visible. A fully enclosed room will hide the action.
- The app centers the X/Z footprint, scales its longest horizontal side to 8 world units and moves the lowest point of the model to Y=0. Keep the intended floor as the lowest geometry. Avoid oversized invisible objects and geometry far outside the venue, which would distort bounds.
- Leave a clear, flat central floor at least 6.5 units across after normalization. Pet sprites are about 1 world unit tall, with their bases near Y=0.08; they move around the central area. Avoid furniture and raised platforms in their path. No navigation mesh or collision detection is implemented.
- Use simple PBR materials and embedded PNG/JPEG textures, modest polygon and draw-call counts, and a target GLB under 10 MB for a fast demo. Do not rely on Draco, Meshopt or KTX2 compression; the app does not configure their decoders.
- If exporting punctual lights, enable the glTF light export option and keep light count small. The current app also supplies a hemisphere light and a directional light, so final brightness, shadows and color need adjustment with the actual GLB in-browser. Blender render lighting, area lights and world settings do not automatically reproduce themselves in Three.js.
- Keep furniture, curtains, walls and lights in named objects or collections in the source `.blend`, and retain the source separately for revisions. Credit any third-party textures or models and provide their license details; do not embed people or private imagery.

## Verification when the teammate delivers

1. Place the GLB at the exact path above and run `npm start`.
2. Check that “Venue preview” appears, the full interior fits the frame, the central floor and pets are visible, and the fallback island disappears. Check both wide and narrow browser windows.
3. Compare the look against the reference photos and adjust materials/light intensity in the GLB or Three.js; the loader alone cannot guarantee matching lighting.
4. Confirm pets still join, move and respond to clicks in two browser sessions. Check file size and browser console for missing textures, unsupported compression and rendering errors.
5. Commit the GLB only after its ownership and asset licenses are clear; keep the `.blend` out of the public repo unless the team explicitly wants to share it.

## Requested activity stations

The [venue actions and pet state plan](station-actions-plan.md) includes proposed separate photo wall and plotter anchors and a presentation area with time-based energy and fun bonuses. The separate photo wall and physical plotter are approved; exact positions and area boundaries still need agreement with the teammate.

Reserve space for a small table with a 3D printer, a photo wall, a separate physical-plotter area, and a refreshment table where pets can collect food and coffee. The supplied reference set shows the colorful photo-wall area in `IMG_0273.HEIC`, `IMG_0274.HEIC`, and `IMG_0320.HEIC`; the photos are not included here. Maintain a clear path and enough camera visibility for the pets and resulting objects. Please discuss station positions before final export; runtime anchor naming and placement are not implemented yet. See `docs/pet-actions.md` for the intended interactions.
