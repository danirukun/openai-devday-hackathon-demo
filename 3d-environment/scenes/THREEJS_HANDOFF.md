# Three.js export handoff

The GLBs were exported from `venue-architecture-furniture-grouped.blend`, scene `Scan proportion study - provisional`. The Blender file remains the editable source. Both GLBs are self-contained, use glTF's Y-up coordinates and contain no embedded images or compressed mesh extensions.

- `venue-threejs-cutaway.glb` (about 1.5 MB) preserves the top-down preview's visibility: it omits the nine ceiling meshes and 32 provisional roof-truss meshes that are hidden for render in Blender. It contains 84 individually named meshes.
- `venue-threejs-complete.glb` (about 1.6 MB) includes all 125 meshes, including the ceilings and trusses. All are initially visible in standard glTF viewers; hide the `Architecture_Ceilings` and `Architecture_RoofTrusses` nodes if a cutaway is desired.

Both contain the following explicit glTF/Three.js nodes:

```text
Architecture
  Architecture_Walls
  Architecture_Floors
  Architecture_Openings
  Architecture_Ceilings
  Architecture_RoofTrusses
Furniture
  Furniture_Tables
  Furniture_Chairs
  Furniture_Sofas
  Furniture_Storage
```

The cutaway may have no ceiling or roof-truss nodes because those groups contain no exported meshes. Every furniture mesh keeps its source name, plus `userData.asset_id`, `userData.asset_group` and `userData.asset_category`. The [manifest](threejs-export-manifest.json) lists the names, groups and Y-up bounds for every mesh; `hidden_in_preview` identifies meshes omitted from the cutaway. Source semantic names and scan scale have not been independently verified. The photo wall belongs to a separate, unregistered Blender scene and is not present in these exports.

Example using a hosted or locally served GLB URL:

```js
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

const { scene: venue } = await new GLTFLoader().loadAsync('/venue-threejs-cutaway.glb');
scene.add(venue);

const architecture = venue.getObjectByName('Architecture');
const furniture = venue.getObjectByName('Furniture');
const table = venue.getObjectByName('table_dining_rect_0');
if (table) table.position.x += 1; // Only this table moves.
```

Coordinates are local to each object's parent, in glTF Y-up space. If the application scales or repositions the entire venue, those parent transforms affect world-space movement. Camera and lighting helpers are not exported; provide them in Three.js.

Both variants were parsed with the actual Three.js r187 `GLTFLoader` in Node, including checks of group membership, all 27 individual furniture nodes, mesh world bounds against Blender, and independent movement. The cutaway was re-imported and visually compared to the existing Blender top-down view. An in-browser application or pet interaction test was not performed. The scan-based candidate is provisional and its narrow footprint does not meet the app's documented 6.5-unit clear-floor target after normalization; see [scan study](SCAN_STYLE_STUDY.md) and [source intake](../3D-model/intake-01/REPORT.md).
