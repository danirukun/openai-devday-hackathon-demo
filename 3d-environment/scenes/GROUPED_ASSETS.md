# Architecture and furniture groups

Open [venue-architecture-furniture-grouped.blend](venue-architecture-furniture-grouped.blend), in the `Scan proportion study - provisional` scene. In the Outliner:

- **ARCHITECTURE | building structure** contains separate collections for walls and joints, floors, doors and windows, ceilings, and provisional roof trusses. The roof trusses retain their previous hidden-in-render setting.
- **FURNITURE | movable objects** contains collections for tables, chairs, sofas and armchairs, and storage. Select an individual mesh in Object mode to move it independently.
- **Scan | original transform hierarchy** retains the imported parent objects. The other collections contain the existing cameras and lights.

The [object-by-object audit](grouped-assets.csv) lists all 125 architecture and furniture meshes. The 27 furniture meshes use the scan's provisional semantic labels; the labels have not been independently confirmed. The scan-study scene has no photo wall. The earlier `Venue - movable assets audit` scene remains in the same file, with its separately grouped photo wall and other props; see its [audit](MOVABLE_ASSETS.md). The two scenes have not been registered or combined.

The previous file, [venue-topdown-movable-assets.blend](venue-topdown-movable-assets.blend), remains unchanged. The grouping preserves object positions, geometry, materials, parents, and per-object visibility.
