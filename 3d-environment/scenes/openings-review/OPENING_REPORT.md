# One connection between the two modeled rooms

The owner clarified that the two rooms have **one connecting doorway**. `venue-rooms-opening-candidate.blend` models one rectangular passage through the existing two-layer wall at the point where the model's two floor regions meet. Both layers were cut in alignment; they do not represent two separate doors. The opening is empty, with no modeled moving door leaf.

## References and interpretation

All 76 local venue photos (`IMG_0249` through `IMG_0324`) were reviewed as five labeled contact sheets, together with `devday-sitemap.png`. The [source registry](sources.json) contains each original image's SHA-256. The original images were not modified. HEIC images were decoded as the first frame using FFmpeg, then resized with Pillow for the contact sheets; larger review derivatives of the five most relevant photos are in `key-views/`. These private derivatives contain people and event graphics and are not included in the GLBs.

The most directly useful views are `IMG_0273`, `IMG_0274`, `IMG_0320` and `IMG_0324`, showing the doorway from the backdrop side toward the bright trussed room, and `IMG_0315`, showing the backdrop through the opening from the opposite side. They support a single broad, rectangular floor-level passage with brick jambs and a dark overhead member. `IMG_0297` and `IMG_0298` depict a different connection to the food area and were not used to add another opening. The event map is schematic and does not supply dimensions.

The source scan is not registered to the photos, and its room names and metric scale are not independently verified. The choice of the scan's central transition as this photographed connection, its exact width and height, and its wall coordinates are **provisional**, not an accepted measured match. The entry is represented as a simple cut; the photographed dark frame and parked sliding door are not modeled. The floor has small pre-existing level differences across the transition. The diagnostic cameras are approximate views from each side, not calibrated photo matches.

## Geometry and verification

The candidate modifies only `Wall_17` and `Wall_22`: two parallel scan meshes at the same room transition. Within the Blender Z-up frame, the provisional cut spans X -3.35 to -1.45 and goes up to Z 2.75, in source units of unknown physical accuracy. The surrounding walls, floor, furniture, collections, camera and materials are retained. The original `.blend` and earlier GLBs remain unchanged.

[Long-room view](../../renders/venue-opening-long-room.png) and [wide-room view](../../renders/venue-opening-wide-room.png) show the same through-passage from each side. The [top view](../../renders/venue-opening-plan.png) is unsectioned and consequently shows the wall material above the doorway; it is not a floor-level plan cut. No physical alignment or exact doorway measurement is established by these views.

The scene was reopened and compared with the original using the same frozen Blender review helper: the only changed objects were `Wall_17` and `Wall_22`, with no changes to furniture, materials, cameras, collections or other objects. Sampled mesh rays across the opening found no wall or opening obstruction, and rays above it found both retained headers. The updated cutaway and complete GLBs were loaded with Three.js r187 `GLTFLoader`: their separate architecture/furniture groups, 27 movable furniture items and mesh bounds were verified, and the same passage and overhead wall were tested with Three.js raycasting. This is not a browser, collision-system or navigation test.

Source `.blend` SHA-256: `27e2af5c0004aa6ab6125a1a28686d6fe26b7beba14130dc2f7480bd43c4529e` (unchanged before and after review). Candidate SHA-256: `189317083f6b990ab88e2a9a257303c75032c2a21c1c0d4b6414a4bbdd7bf487`. Frozen bootstrap SHA-256: `1a58cae0ebaad77630410b43bfec44205c264026573b1e50bb7407d7ef41a586`. Frozen review helper SHA-256: `678c449b2aa11eb3f2d3027c59793c29df5b4bb1526532dbf974bd5ed64bf466`. Blender 5.2.3 LTS ran with the task-owned runtime under `runtime/`; inventories and their comparison are in `baseline/` and `candidate/`.
