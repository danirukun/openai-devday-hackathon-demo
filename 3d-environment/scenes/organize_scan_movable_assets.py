"""Organize the active scan study's existing non-architectural meshes.

Run on venue-topdown-render-group.blend; the source file is never overwritten.
Polycam's labels are provisional and do not establish the items' real identity.
"""
import bpy
import csv
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parent
scene = bpy.context.scene
if scene.name != 'Scan proportion study - provisional':
    raise RuntimeError('Open the top-down scan study first')
out = root / 'venue-topdown-movable-assets.blend'
csv_path = root / 'scan-movable-assets.csv'
if out.exists():
    raise RuntimeError('Refusing to overwrite ' + str(out))
source_collection = bpy.data.collections['01 Polycam geometry - unregistered']
furniture_root = bpy.data.objects['Furniture']
fixtures_root = bpy.data.objects['Fixtures']
objects = [o for o in scene.objects if o.type == 'MESH' and o.parent in (furniture_root, fixtures_root)]
if len(objects) != 27:
    raise RuntimeError('Unexpected furniture/fixture count: ' + str(len(objects)))
categories = {'table': 'Table', 'chair': 'Chair', 'sofa': 'Sofa / armchair', 'storage': 'Storage cabinet'}
for o in objects:
    if o.name.split('_', 1)[0] not in categories:
        raise RuntimeError('Unclassified non-architectural object: ' + o.name)
    if list(o.users_collection) != [source_collection]:
        raise RuntimeError('Unexpected collection links: ' + o.name)

bpy.context.view_layer.update()
before = {o.name: o.matrix_world.copy() for o in scene.objects}
original_parents = {o.name: o.parent.name for o in objects}
collection = bpy.data.collections.new('05 MOVABLE ASSETS - scan study')
scene.collection.children.link(collection)
collection['purpose'] = 'Select each mesh object in Object mode to move it independently.'
collection['source_labels'] = 'Polycam semantic labels are provisional, not confirmed venue identities.'
rows = []
for obj in sorted(objects, key=lambda o: o.name):
    category = categories[obj.name.split('_', 1)[0]]
    source_collection.objects.unlink(obj)
    collection.objects.link(obj)
    obj['asset_category'] = category
    obj['audit_id'] = obj.name
    obj['classification'] = 'Provisional Polycam source label'
    rows.append({'asset_id': obj.name, 'category': category, 'object': obj.name,
                 'collection': collection.name, 'parent': original_parents[obj.name],
                 'note': 'Source semantic label; real-world identity unverified'})
bpy.context.view_layer.update()
for obj in scene.objects:
    delta = max(abs(obj.matrix_world[i][j] - before[obj.name][i][j]) for i in range(4) for j in range(4))
    if delta > 1e-6:
        raise RuntimeError('World transform changed for ' + obj.name)
scene['movable_asset_audit'] = 'scenes/scan-movable-assets.csv'
scene['movable_asset_note'] = 'Select a mesh in 05 MOVABLE ASSETS - scan study to move it independently.'
with csv_path.open('w', newline='', encoding='utf-8') as f:
    writer = csv.DictWriter(f, fieldnames=['asset_id','category','object','collection','parent','note'])
    writer.writeheader()
    writer.writerows(rows)
bpy.ops.wm.save_as_mainfile(filepath=str(out))
print('MOVABLE_RESULT', len(rows), dict(Counter(r['category'] for r in rows)), 'transforms preserved')
