# Venue reference survey

This is a working interpretation of `reference-images/devday-sitemap.png` and
the photographs, not a measured architectural survey. The map is an event
diagram; its proportions, boundaries and unlabelled spaces may be schematic.
Do not treat its pixels or perspective in the photographs as metric dimensions.

The image-by-image index is in [reference-index.csv](reference-index.csv), and
the approximate zone view is in [reference-zone-map.svg](reference-zone-map.svg). A
zone identifies the visible area, not a surveyed camera position or direction.
Confidence applies to the room or landmark match, not to dimensions. Some views
cover several areas; the listed zone is the strongest visible match. The site
map does not label the red-door lounge, so its exact footprint remains unknown.

## Connections supported by the photographs

- **Stage / demos:** `IMG_0278`–`IMG_0296` establish the stage screen, black
  curtains, concrete posts, steel ceiling and the adjoining brick wall. The
  precise stage-side wall profile and post spacing are unmeasured.
- **Demos to food:** `IMG_0297` shows the stage-side doorway and the food-room
  window beyond; `IMG_0298` shows the corresponding green sliding door from
  the food side. Food-room views `IMG_0298`–`IMG_0307` show a long, lower
  space with brick walls, repeated industrial windows, dark supports and a
  relatively flat ceiling.
- **Demos to hacking:** `IMG_0273`, `IMG_0274`, `IMG_0320` and `IMG_0324`
  show the photo-wall/demo side looking through an opening to a brighter room.
  `IMG_0315` shows the colorful backdrop through an opening from the brighter
  room. This supports a connection, but not exact opening width or map position.
- **Hacking:** `IMG_0308`–`IMG_0319` show brick, concrete-framed openings,
  exposed steel, roof trusses and long skylight strips. The roof is pitched;
  its height and ridge direction need measurement or a registered scan.
- **Photo wall and demo equipment:** `IMG_0321`–`IMG_0324` document the
  plotter, camera, printer, backdrop and context. The user places the shared
  equipment table to the right of the stage, between two doors. The photographs
  don't establish exact distances.
- **Unlabelled lounge / red door:** `IMG_0249`–`IMG_0261` show a separate
  lower-ceilinged alcove, a red arched door, block walls and a concrete-framed
  opening near the photo wall. This area is not explicitly labelled on the
  event map; avoid assigning it to judges, crew or courtyard without evidence.

## Heights and scale

No photo supplies a verified absolute measurement. Door proportions can serve
as tentative visual comparisons but are not evidence of a standard door size.
The earlier `.blend` files use illustrative heights and are not calibrated.

Collect, if possible:

1. A single connected LiDAR scan through all rooms, doorways and the entrance,
   revisiting the starting point to help register the spaces. Scan both sides
   of each connection and include the floor, wall tops and ceilings.
2. A measured floor-to-ceiling height in the stage/demo room, in the hacking
   room (both eaves and ridge), and in the food area; plus one long floor
   dimension and a doorway width as cross-checks.
3. Export a geometry-containing mesh or point cloud, preferably GLB/glTF, OBJ
   or PLY, and preserve any original scan project. A floor plan and individual
   room scans are useful too, but disconnected scans may need alignment.
4. Capture overlapping photos of the same corners and openings, including
   currently hidden areas; the raw scan and original photos remain local.

Phone LiDAR can drift or miss dark, reflective, high or occluded surfaces.
Treat it as a dimensional reference and compare against tape measurements;
do not use a scan's photographed texture in the public asset. The current app
contract and camera require a cutaway, so even an accurate survey will need an
explicit decision about which walls and roof pieces to omit.

## Open questions for reconstruction

- The precise position and extent of the red-door lounge and the entrance-side
  rooms relative to the schematic map.
- Measured wall heights, roof heights, slopes, structural spans and door widths.
- Which interior walls can be removed for the fixed camera while retaining the
  venue's visual identity.
- How pet movement will be constrained across a multiroom footprint: the app
  currently has no collision or navigation system, and the requested open
  central area conflicts with faithfully retaining the mapped room divisions.

Reference photographs may contain people and event graphics. They are local
inputs only; use independently made geometry and materials for the public GLB.
