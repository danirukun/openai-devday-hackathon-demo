"""Group the scan-study scene into architecture and movable furniture collections.

Run with venue-topdown-movable-assets.blend open. No geometry or transforms are
changed; imported parent objects remain in their original hierarchy collection.
"""
import bpy
import csv
from collections import Counter
from pathlib import Path

root = Path(__file__).resolve().parent
scene = bpy.context.scene
if scene.name != 'Scan proportion study - provisional':
    raise RuntimeError('Expected the scan study scene')
if Path(bpy.data.filepath).name != 'venue-topdown-movable-assets.blend':
    raise RuntimeError('Open the movable assets source file first')
output = root / 'venue-architecture-furniture-grouped.blend'
if output.exists():
    raise RuntimeError('Refusing to overwrite ' + str(output))
source = bpy.data.collections['01 Polycam geometry - unregistered']
moves = bpy.data.collections['05 MOVABLE ASSETS - scan study']
trusses = bpy.data.collections['03 Provisional roof trusses']
bpy.context.view_layer.update()
before = {o.name: o.matrix_world.copy() for o in scene.objects}
scene_objects = set(scene.objects)
architecture = bpy.data.collections.new('ARCHITECTURE | building structure')
scene.collection.children.link(architecture)
furniture = bpy.data.collections.new('FURNITURE | movable objects')
scene.collection.children.link(furniture)

def sub(parent, name):
    c = bpy.data.collections.new(name)
    parent.children.link(c)
    return c

structural = {
    'walls': sub(architecture, 'Architecture | walls and joints'),
    'floors': sub(architecture, 'Architecture | floors'),
    'openings': sub(architecture, 'Architecture | doors and windows'),
    'ceilings': sub(architecture, 'Architecture | ceilings'),
}
asset_groups = {
    'Table': sub(furniture, 'Furniture | tables'),
    'Chair': sub(furniture, 'Furniture | chairs'),
    'Sofa / armchair': sub(furniture, 'Furniture | sofas and armchairs'),
    'Storage cabinet': sub(furniture, 'Furniture | storage'),
}
for obj in list(source.objects):
    if obj.type != 'MESH':
        continue
    if obj.name.startswith(('Wall_', 'Joint_')): key = 'walls'
    elif obj.name.startswith('Floor_'): key = 'floors'
    elif obj.name.startswith(('Door_', 'Window_')): key = 'openings'
    elif obj.name.startswith('Ceiling_'): key = 'ceilings'
    else: raise RuntimeError('Unclassified scan mesh: ' + obj.name)
    structural[key].objects.link(obj)
    source.objects.unlink(obj)
for obj in list(moves.objects):
    category = obj.get('asset_category')
    if category not in asset_groups:
        raise RuntimeError('Unclassified movable object: ' + obj.name)
    asset_groups[category].objects.link(obj)
    moves.objects.unlink(obj)
# Preserve the original hidden-for-render setting of the roof collection.
architecture.children.link(trusses)
scene.collection.children.unlink(trusses)
scene.collection.children.unlink(moves)
source.name = 'Scan | original transform hierarchy'
source['purpose'] = 'Original Polycam transform parents retained for scene fidelity.'
scene['asset_organization'] = 'Architecture and furniture are separately grouped by type; see scenes/GROUPED_ASSETS.md'
bpy.context.view_layer.update()
assert set(scene.objects) == scene_objects
for o in scene.objects:
    delta = max(abs(o.matrix_world[i][j] - before[o.name][i][j]) for i in range(4) for j in range(4))
    if delta > 1e-6: raise RuntimeError('Changed world transform: ' + o.name)
rows = []
for group_name, parent in [('Architecture', architecture), ('Furniture', furniture)]:
    for child in parent.children:
        for obj in child.objects:
            if obj.type == 'MESH':
                rows.append({'group': group_name, 'collection': child.name, 'object': obj.name,
                             'category': obj.get('asset_category', ''),
                             'parent': obj.parent.name if obj.parent else ''})
rows.sort(key=lambda r: (r['group'], r['collection'], r['object']))
with (root / 'grouped-assets.csv').open('w', encoding='utf-8', newline='') as f:
    writer = csv.DictWriter(f, fieldnames=['group', 'collection', 'object', 'category', 'parent'])
    writer.writeheader(); writer.writerows(rows)
bpy.ops.wm.save_as_mainfile(filepath=str(output))
print('GROUPED', len(rows), dict(Counter(r['collection'] for r in rows)), 'total scene objects', len(scene.objects))
