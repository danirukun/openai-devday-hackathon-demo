# Camera metadata and reconstruction status

The per-image EXIF inventory is in [camera-metadata.csv](camera-metadata.csv).
It deliberately excludes timestamps, GPS and the photographs themselves.

## Recorded camera groups

| Images | Count | Pixel dimensions | Actual focal length | 35 mm equivalent | Aperture |
| --- | ---: | --- | ---: | ---: | ---: |
| IMG_0249–IMG_0320.HEIC | 72 | 4032 × 3024 | 2.22 mm | 14 mm | f/2.2 |
| IMG_0323.jpg and IMG_0324.jpg | 2 | 4032 × 2268 | 2.22 mm | 14 mm | f/2.2 |
| IMG_0321.jpg and IMG_0322.jpg | 2 | 4032 × 2268 | 6.86 mm | 24 mm | f/1.78 |

All 76 files report an iPhone 14 Pro and orientation tag 1. The HEIC EXIF
identifies ProCamera as the capture software. The camera group and aspect ratio
must be taken from each image rather than assuming every photo used 0.5×.

The CSV's approximate pixel focal lengths are only initialization guesses:
`35mm_equivalent × image_diagonal_pixels / sqrt(36² + 24²)`. This assumes a
35 mm diagonal equivalence and square pixels; it does not establish the
phone's actual intrinsics, principal point, processing, crop or lens distortion.
In particular, a 16:9 frame and 4:3 frame need not share the same calibration.

## What is and is not solved

The image inventory and a room-level reference index exist. There is no solved
camera pose, distortion calibration, multi-view reconstruction, verified scale,
or measured site-map registration yet. The site map is an event diagram, and
previous draft room dimensions and heights remain provisional. Do not describe
them as measured or precise.

The owner explicitly identified a 90-degree error in the photo-wall
orientation. `venue-camera-review-draft.blend` applies that rotation, but its
pivot and placement still need verification against source-matched views.

## Proposed evidence-driven reconstruction

1. Install the complete `scan-to-model` Codex plugin with its shared scripts
   and references; its individual skill directories use relative references
   outside the skill directory, so copying one skill alone is incomplete.
2. Produce camera-aware source observations from the original image files,
   including view correspondences, transitions and regions with occlusion.
3. Solve camera poses and lens parameters from stable image features. Audit
   reprojection residuals and validate against held-out observations; account
   for ultra-wide distortion, orientation and processing rather than treating
   the equivalent focal length as an exact calibration.
4. Register solved geometry to measurements or a LiDAR scan using shared
   physical landmarks and check residuals. Without a known distance or metric
   depth, photo reconstruction has unknown global scale.
5. Build a saved Blender candidate and compare source-matched views and plan
   views before refining materials and final GLB delivery. Keep the cutaway and
   app movement constraints visible in the review.

No camera-matching solver or external reconstruction plugin was available in
this environment at the time of this inventory. The published plugin's own
native depth reader describes support for Polycam keyframe exports; other scan
formats need validated adapters and should not be assumed interchangeable.
