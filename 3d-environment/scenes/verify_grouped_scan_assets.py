"""Reopen the grouped scene and compare it with the previous scene."""
import bpy
import csv
from pathlib import Path

root = Path(__file__).resolve().parent
scene_name = 'Scan proportion study - provisional'
def snapshot(path):
    bpy.ops.wm.open_mainfile(filepath=str(path))
    scene = bpy.data.scenes[scene_name]
    bpy.context.window.scene = scene
    bpy.context.view_layer.update()
    def matrix(o): return tuple(round(v, 7) for row in o.matrix_world for v in row)
    return {o.name: (o.type, matrix(o), o.parent.name if o.parent else None,
                     o.hide_render, o.hide_viewport,
                     tuple(tuple(round(x, 6) for x in v.co) for v in o.data.vertices) if o.type == 'MESH' else None,
                     tuple(tuple(p.vertices) for p in o.data.polygons) if o.type == 'MESH' else None,
                     tuple(m.name if m else '' for m in o.data.materials) if o.type == 'MESH' else None)
            for o in scene.objects}
original = snapshot(root / 'venue-topdown-movable-assets.blend')
grouped = snapshot(root / 'venue-architecture-furniture-grouped.blend')
assert original == grouped, 'Object geometry, parent, material, visibility or transform changed'
scene = bpy.context.scene
architecture = bpy.data.collections['ARCHITECTURE | building structure']
furniture = bpy.data.collections['FURNITURE | movable objects']
assert bpy.data.collections['03 Provisional roof trusses'].hide_render
with (root / 'grouped-assets.csv').open(newline='', encoding='utf-8') as f:
    rows = list(csv.DictReader(f))
grouped_meshes = [o for p in (architecture, furniture) for c in p.children for o in c.objects if o.type == 'MESH']
assert len(rows) == len(grouped_meshes) == 125
assert len({o.name for o in grouped_meshes}) == 125
assert {r['object'] for r in rows} == {o.name for o in grouped_meshes}
all_meshes = {o.name for o in scene.objects if o.type == 'MESH'}
assert all_meshes == {o.name for o in grouped_meshes}
assert sum(len(c.objects) for c in furniture.children) == 27
for child in furniture.children:
    for obj in child.objects:
        start = obj.location.copy()
        obj.location.x += 1.0
        bpy.context.view_layer.update()
        assert any(abs(obj.matrix_world[i][3] - original[obj.name][1][i*4+3]) > 1e-5 for i in range(3))
        for other in scene.objects:
            if other == obj: continue
            m = tuple(round(v, 7) for row in other.matrix_world for v in row)
            assert m == original[other.name][1], 'Moving %s affected %s' % (obj.name, other.name)
        obj.location = start
        bpy.context.view_layer.update()
assert bpy.data.scenes.get('Venue - movable assets audit')
print('VERIFIED: 125 categorized meshes, 27 independently movable furniture objects, unchanged scene and retained photo-wall scene')
