"""Export explicit glTF groups from the organized Blender scan study.

The source .blend is never saved or modified. Source names and world transforms
are transferred to temporary export-only objects under named group nodes.
"""
import bpy
import json
from pathlib import Path
from mathutils import Vector

root = Path(__file__).resolve().parent
if Path(bpy.data.filepath).name != 'venue-rooms-opening-candidate.blend':
    raise RuntimeError('Open the grouped venue file first')
source_scene = bpy.data.scenes['Scan proportion study - provisional']
bpy.context.window.scene = source_scene
bpy.context.view_layer.update()
structure = bpy.data.collections['ARCHITECTURE | building structure']
furniture = bpy.data.collections['FURNITURE | movable objects']
group_names = {
    'Architecture | walls and joints': ('Architecture', 'Architecture_Walls'),
    'Architecture | floors': ('Architecture', 'Architecture_Floors'),
    'Architecture | doors and windows': ('Architecture', 'Architecture_Openings'),
    'Architecture | ceilings': ('Architecture', 'Architecture_Ceilings'),
    '03 Provisional roof trusses': ('Architecture', 'Architecture_RoofTrusses'),
    'Furniture | tables': ('Furniture', 'Furniture_Tables'),
    'Furniture | chairs': ('Furniture', 'Furniture_Chairs'),
    'Furniture | sofas and armchairs': ('Furniture', 'Furniture_Sofas'),
    'Furniture | storage': ('Furniture', 'Furniture_Storage'),
}
records = []
for parent in (structure, furniture):
    for collection in parent.children:
        if collection.name not in group_names: raise RuntimeError('Unknown collection: ' + collection.name)
        for obj in collection.objects:
            if obj.type != 'MESH': raise RuntimeError('Unexpected object: ' + obj.name)
            world = obj.matrix_world.copy()
            coords = [world @ vertex.co for vertex in obj.data.vertices]
            converted = [(v.x, v.z, -v.y) for v in coords]
            bounds = [[min(v[i] for v in converted) for i in range(3)],
                      [max(v[i] for v in converted) for i in range(3)]]
            records.append({'name': obj.name, 'object': obj, 'world': world,
                            'parent': group_names[collection.name][0],
                            'group': group_names[collection.name][1],
                            'hidden_in_preview': bool(obj.hide_render or collection.hide_render),
                            'category': obj.get('asset_category', ''), 'bounds': bounds})
if len(records) != 125 or len({r['name'] for r in records}) != 125:
    raise RuntimeError('Unexpected source inventory')
# Blender datablock names are global; free the source names only in memory.
for obj in list(bpy.data.objects): obj.name = '__source__' + obj.name
export_scene = bpy.data.scenes.new('Venue GLB export (temporary)')
bpy.context.window.scene = export_scene

def group(name, parent=None):
    obj = bpy.data.objects.new(name, None)
    export_scene.collection.objects.link(obj)
    obj.parent = parent
    return obj
parents = {name: group(name) for name in ('Architecture', 'Furniture')}
subgroups = {}
for parent, name in group_names.values():
    if name not in subgroups: subgroups[name] = group(name, parents[parent])
for r in records:
    obj = bpy.data.objects.new(r['name'], r['object'].data)
    export_scene.collection.objects.link(obj)
    obj.parent = subgroups[r['group']]
    obj.matrix_world = r['world']
    obj['asset_id'] = r['name']
    obj['asset_group'] = r['parent']
    if r['category']: obj['asset_category'] = r['category']
    r['export_object'] = obj
bpy.context.view_layer.update()
for r in records:
    delta = max(abs(r['export_object'].matrix_world[i][j] - r['world'][i][j]) for i in range(4) for j in range(4))
    if delta > 1e-5: raise RuntimeError('Changed world transform: ' + r['name'])
for variant in ('cutaway', 'complete'):
    path = root / ('venue-rooms-opening-threejs-' + variant + '.glb')
    if path.exists(): raise RuntimeError('Refusing to overwrite ' + str(path))
    bpy.ops.object.select_all(action='DESELECT')
    for o in list(parents.values()) + list(subgroups.values()): o.select_set(True)
    for r in records:
        if variant == 'complete' or not r['hidden_in_preview']:
            r['export_object'].select_set(True)
    bpy.ops.export_scene.gltf(filepath=str(path), export_format='GLB', use_selection=True,
        use_active_scene=True, export_yup=True, export_extras=True,
        export_cameras=False, export_lights=False, export_animations=False)
manifest = [{'name': r['name'], 'group': r['group'], 'root': r['parent'],
             'hidden_in_preview': r['hidden_in_preview'], 'category': r['category'], 'bounds': r['bounds']}
            for r in records]
(root / 'opening-threejs-manifest.json').write_text(json.dumps(manifest, indent=2) + '\n', encoding='utf-8')
print('EXPORTED',len(records),'meshes; cutaway excluded',sum(r['hidden_in_preview'] for r in records))
