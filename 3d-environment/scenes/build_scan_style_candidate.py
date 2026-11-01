"""Add a separate, provisional Polycam proportion study to the open venue file.

Run once from Blender after opening the existing venue draft. The original file
is left intact; its other scenes remain in the new candidate file.
"""
import bpy
from mathutils import Vector
from pathlib import Path

root = Path('/Users/yewenjin/projects/openai-devday/hackathon-demo/3d-environment')
candidate = root / 'scenes/venue-scan-style-candidate.blend'
source = root / '3D-model/intake-01/11_1_2026.glb'
if candidate.exists() or bpy.data.scenes.get('Scan proportion study - provisional'):
    raise RuntimeError('Candidate already exists; refusing to overwrite')
if not source.exists():
    raise RuntimeError('Polycam input not found')

# Save first so all subsequent edits belong to the candidate, not the source.
bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
scene = bpy.data.scenes.new('Scan proportion study - provisional')
bpy.context.window.scene = scene
scene['basis'] = 'Polycam GLB source geometry; no accepted photo registration or independent scale'
scene['coverage'] = 'GLB capture coverage and semantic labels are not independently verified'
scene['style_reference'] = 'reference-images/style.png; flat pastel low-poly materials and isometric view'
scene['view_note'] = 'Ceilings are retained but hidden for cutaway preview; no architectural deletion'
bpy.ops.import_scene.gltf(filepath=str(source))
imported = list(scene.objects)
collection = bpy.data.collections.new('01 Polycam geometry - unregistered')
scene.collection.children.link(collection)
for obj in imported:
    for c in tuple(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    obj['source'] = 'polycam-glb-11-1-2026 (SHA256 baa3ce1d148b6c2085b50d97091b7fee96f0c2e0c5e53948b6ba5bbd399e2adc)'
    obj['evidence_status'] = 'source geometry; position, category and dimensions unverified'

def material(name, color):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    p = m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value = (*color, 1)
    p.inputs['Roughness'].default_value = 0.85
    return m

palette = {
    'wall': material('Study | soft terracotta brick', (0.64, 0.33, 0.25)),
    'floor': material('Study | warm concrete', (0.67, 0.67, 0.61)),
    'window': material('Study | pale blue glass', (0.55, 0.72, 0.73)),
    'door': material('Study | sage door', (0.30, 0.43, 0.39)),
    'furniture': material('Study | warm wood and props', (0.58, 0.43, 0.33)),
    'ceiling': material('Study | light ceiling', (0.73, 0.75, 0.70)),
}
for obj in imported:
    if obj.type != 'MESH':
        continue
    n = obj.name.lower()
    category = ('ceiling' if n.startswith('ceiling') else
                'floor' if n.startswith('floor') else
                'window' if n.startswith('window') else
                'door' if n.startswith('door') else
                'wall' if n.startswith(('wall','joint')) else 'furniture')
    obj.data.materials.clear()
    obj.data.materials.append(palette[category])
    for polygon in obj.data.polygons:
        polygon.material_index = 0
        polygon.use_smooth = False
    if category == 'ceiling':
        obj.hide_render = True
        obj.hide_set(True)
        obj['cutaway'] = 'Ceiling retained but hidden in preview'

helpers = bpy.data.collections.new('02 Study cameras and lighting')
scene.collection.children.link(helpers)
world = bpy.data.worlds.new('Study | pale mint background')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (0.78, 0.87, 0.83, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = 0.8
scene.world = world
light_data = bpy.data.lights.new('Study | large softbox', 'AREA')
light = bpy.data.objects.new('Study | large softbox', light_data)
helpers.objects.link(light)
light.location = (12, -18, 32)
light.rotation_euler = (Vector((0, 0, 0)) - light.location).to_track_quat('-Z', 'Y').to_euler()
light_data.energy = 18000
light_data.shape = 'DISK'
light_data.size = 24

def camera(name, location, scale):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    helpers.objects.link(obj)
    obj.location = location
    obj.rotation_euler = (Vector((0, 0, 1.5)) - obj.location).to_track_quat('-Z', 'Y').to_euler()
    data.type = 'ORTHO'
    data.ortho_scale = scale
    data.clip_end = 500
    return obj

scene.camera = camera('Study | isometric', (49, -52, 49), 55)
camera('Study | plan', (0, 0, 90), 60)
camera('Study | opposite', (-49, 52, 49), 55)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.resolution_x = 1400
scene.render.resolution_y = 1100
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'AgX'
scene.render.image_settings.file_format = 'PNG'
bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
print('Candidate saved:', candidate, 'imported objects:', len(imported))
