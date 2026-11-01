# Scan-based proportion and style study

Status: **provisional candidate, not a completed proportion correction**.
The new `venue-scan-style-candidate.blend` retains the existing eight venue
scenes and adds `Scan proportion study - provisional`. The old draft remains
separately saved. The study uses the exported Polycam geometry in its own
coordinate frame, without registering it to or reshaping the earlier draft.

## Sources and observations

The existing [survey](REFERENCE_SURVEY.md), [photo index](reference-index.csv),
[camera status](CAMERA_CALIBRATION.md) and
[Polycam intake](../3D-model/intake-01/REPORT.md) remain the source records.
The original GLB hash is
`baa3ce1d148b6c2085b50d97091b7fee96f0c2e0c5e53948b6ba5bbd399e2adc`.
No native depth, camera poses, confidence data, calibrated photographs or
independent control measurement accompanied it.

For this pass, the original HEIC image grid was decoded with FFmpeg 9.0.1
to upright JPEG review images. Native frames are 4032 × 3024 and orientation
tag 1; the review images preserve that geometry. No native-pixel traces were
authored, and these visual observations do not establish a registration:

| Source image | SHA-256 of original | Observed in source | Use and limit |
| --- | --- | --- | --- |
| IMG_0310.HEIC | `c76ca3fddfd1c1d415ead8539189cb12afdc01455450b0263c0fabf406a3379c` | Long skylit room with a pitched roof and exposed trusses. | Qualitative truss silhouette only; no measured span or camera match. |
| IMG_0317.HEIC | `6dab54b947c8b123075112c54ac69ba96a381cc3fb0af33d7dbf908dcbc9de17` | Repeated roof framing, brick, concrete-framed windows and a white end wall. | Supports a representative industrial roof language, not the candidate's exact truss count or positions. |
| IMG_0315.HEIC | `245a6d2b1be2513fa0d557754516b4abbf62db3cc42ac22f937be6d0e3de2865` | Backdrop is visible through a brick opening. | Connection exists in the photos; no scan opening has been accepted as its corresponding opening. |
| IMG_0297.HEIC | `ca1419e1517d86f76b6f28cb8d813c1ed5516703d9cddfd4c102e61bd2f713df` | Sliding-door opening from the stage side, with a window beyond. | Supports a connection; not matched to scan coordinates. |
| IMG_0298.HEIC | `ef6dcbb6162dcb371cc183b5cdbdd4f2bd58034c452b18341b15be9e0b9a6aa7` | Green sliding door viewed from the other side. | Supports the door identity; no independent dimensional fit. |
| IMG_0300.HEIC | `ad5a965c7f2a370d68803dbd37bc063a68499f8a8b453338e742ec8489d8799a` | Long, lower area with repeated large windows and a relatively flat ceiling. | Distinctive food-area reference; its correspondence to the scan is unverified. |

The style input `reference-images/style.png`, SHA-256
`a5ba7a0868d81116fc9cfe06c6d7c4c024554a845b5b7af38e0eb65e1b5f97ab`,
shows a pastel, faceted isometric world. It informs the flat palette and camera,
not the building layout. A first set of HEIC conversions using `sips` produced
black images and was discarded for visual interpretation; FFmpeg output was
visually inspected instead.

## Candidate and review

- The imported mesh geometry retains the source's long, narrow plan and its
  separate objects. Its dimensions are source values of unknown accuracy; the
  scan's room labels and coverage remain unverified.
- Flat warm masonry, concrete, pale window and wood colors replace the imported
  materials in the study. Original ceilings remain present but are hidden for
  the cutaway. Existing draft scenes and movable assets are not registered or
  transferred into the new scene.
- Five roof trusses and two longitudinal members are **inferred stylisation**,
  using the long floor and sloping ceiling of the GLB as a provisional frame
  and the two roof photographs for general form. Their number, location and
  contact with the real structure are not observed or measured. Each added
  object is tagged accordingly.
- The 1400 × 1100 [isometric](../renders/venue-scan-style-isometric.png),
  [opposite](../renders/venue-scan-style-opposite.png) and
  [plan](../renders/venue-scan-style-plan.png) views were inspected. The first
  plan framing clipped the ends; the camera was widened and the saved view
  rerendered. The plan still shows a dark gap at the room transition, and the
  scan is missing recognizable details including the photographic window
  divisions, stage and demo equipment. These are not accepted physical matches.
- Blender 5.2.3 reopened the saved candidate with nine scenes and 140 objects in
  the study scene. The scan study is a look-development and geometry reference,
  not a verified complete venue or application-ready GLB. A source-matched
  camera comparison and registration were not achieved.

The long floor has source bounds roughly 8.85 × 22.2 nominal units, while the
whole GLB spans roughly 18.8 × 42.0 nominal units; these are not surveyed room
dimensions. Independent measurement or the original scan capture with poses,
depth and frames is needed to check scale and identify shared fixed landmarks.
The narrow overall footprint also conflicts with the current app's 6.5-unit
normalized clear-floor target. No app export or integration test was requested
or performed.
