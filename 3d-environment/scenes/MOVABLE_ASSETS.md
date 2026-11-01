# Movable asset audit

Scene: `Venue - movable assets audit` in `venue-movable-assets-draft.blend`. The complete per-object inventory is [movable-assets.csv](movable-assets.csv).

In the Outliner, expand `MOVABLE ASSETS.001`. Each asset has its own collection and a `MOVE | …` root. Select the root in Object mode to move or rotate the whole item; individual mesh components remain editable and separate. The plotter, printer, camera, laptop, papers and table are independent items.

| Asset ID | Item | Mesh objects | Notes |
| --- | --- | ---: | --- |
| `photo_wall_01` | Photo wall | 89 | Includes backdrop panel and separate graphic meshes; orientation corrected by owner. |
| `demo_table_01` | Demo table | 8 |  |
| `plotter_01` | Drawing plotter | 12 |  |
| `drawing_card_01` | Drawing card | 1 |  |
| `drawing_paper_01` | Drawing paper stack | 3 |  |
| `sticker_printer_01` | Sticker printer | 3 |  |
| `sticker_01` | Emerging sticker | 1 |  |
| `demo_camera_01` | Demo camera | 3 |  |
| `laptop_01` | Demo laptop | 2 |  |
| `food_table_01` | Food table 01 | 5 |  |
| `food_tray_01` | Food tray 01 | 1 |  |
| `food_table_02` | Food table 02 | 5 |  |
| `food_tray_02` | Food tray 02 | 1 |  |
| `food_table_03` | Food table 03 | 5 |  |
| `food_tray_03` | Food tray 03 | 1 |  |
| `stage_riser_01` | Stage riser | 1 |  |
| `stage_curtain_01` | Stage backdrop curtain | 1 |  |
| `stage_screen_01` | Stage screen | 1 |  |
| `stage_side_curtain_01` | Stage side curtain | 1 | This was previously grouped with architecture, but represents a curtain. |

**Not yet modeled:** chairs, freestanding softboxes, and food/coffee items. The food-area trays are present. The light and camera objects in the preview collection are scene helpers; the demo camera is a separately movable prop.

The individually editable preview helpers are `Daylight.006`, `Warm stage fill.004`, `Blue and magenta accents.004`, and `Site map isometric camera.004`. They are not venue furniture.

Architectural walls, floor, structural beams, windows and door assemblies remain separate from these assets. The stage riser, screen and curtains are treated as movable. No object positions were changed when creating the groups.
