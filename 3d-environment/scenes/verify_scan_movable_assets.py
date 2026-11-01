"""Verify the saved movable-assets scene against its unchanged source."""
import bpy
import csv
from pathlib import Path

root = Path(__file__).resolve().parent
source = root / 'venue-topdown-render-group.blend'
candidate = root / 'venue-topdown-movable-assets.blend'
def snapshot():
    scene = bpy.data.scenes['Scan proportion study - provisional']
    bpy.context.window.scene = scene
    bpy.context.view_layer.update()
    return {o.name: (o.type, tuple(round(v, 7) for row in o.matrix_world for v in row),
                     len(o.data.vertices) if o.type == 'MESH' else None,
                     len(o.data.polygons) if o.type == 'MESH' else None,
                     tuple(m.name if m else '' for m in o.data.materials) if o.type == 'MESH' else None)
            for o in scene.objects}
bpy.ops.wm.open_mainfile(filepath=str(source))
before = snapshot()
bpy.ops.wm.open_mainfile(filepath=str(candidate))
after = snapshot()
assert before == after, 'Object names, transforms, geometry counts or materials changed'
scene = bpy.context.scene
collection = bpy.data.collections['05 MOVABLE ASSETS - scan study']
with (root / 'scan-movable-assets.csv').open(newline='', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
assert len(rows) == 27
assert {r['object'] for r in rows} == {o.name for o in collection.objects}
assert all(o.type == 'MESH' for o in collection.objects)
assert bpy.data.scenes.get('Venue - movable assets audit')
# Moving one item must not carry any other object with it.
chair = next(o for o in collection.objects if o.name.startswith('chair_'))
chair.location.x += 1.0
bpy.context.view_layer.update()
for obj in scene.objects:
    if obj == chair: continue
    now = tuple(round(v, 7) for row in obj.matrix_world for v in row)
    assert now == before[obj.name][1], 'Moving chair affected ' + obj.name
assert tuple(round(v, 7) for row in chair.matrix_world for v in row) != before[chair.name][1]
print('VERIFIED', len(after), 'scene objects,', len(rows), 'audited movable meshes; movement independent; original scene retained')
