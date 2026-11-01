# Scan study movable asset audit

Open [venue-topdown-movable-assets.blend](venue-topdown-movable-assets.blend), scene `Scan proportion study - provisional`. Expand `05 MOVABLE ASSETS - scan study` in the Outliner and select an individual mesh in Object mode to move or rotate it. The existing Polycam parent hierarchy is retained; each listed mesh can be moved independently. Positions, geometry, materials, camera and architectural objects were preserved.

| Source-label category | Separate objects |
| --- | ---: |
| Tables | 11 |
| Chairs | 11 |
| Sofas and armchairs | 4 |
| Storage cabinet | 1 |
| **Total** | **27** |

The [complete per-object audit](scan-movable-assets.csv) lists each Blender object, category, collection and parent. These categories come from the scan's automatic labels; the real-world identity of each item is unverified. The original scan study has no modeled photo wall. The separate scene `Venue - movable assets audit` is also retained in this Blender file and contains a grouped photo wall, demo equipment, tables, trays, stage furnishings and curtains; its [earlier audit](MOVABLE_ASSETS.md) identifies the individual groups. The two scenes are independent and have not been registered or combined.

Architectural floor, walls, openings, ceilings and provisional roof trusses remain outside the movable collection. Camera and lighting objects are scene helpers, not venue furnishings. The source file `venue-topdown-render-group.blend` remains unchanged.
