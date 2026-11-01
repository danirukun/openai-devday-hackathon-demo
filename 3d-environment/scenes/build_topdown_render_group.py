"""Create a top-down render setup in a new copy of the scan-style study.

Run once from the open scan study. Source geometry is not moved or deleted.
The two room-detail cameras are visual crops, not surveyed room boundaries.
"""
import bpy
from mathutils import Vector
from pathlib import Path

root = Path('/Users/yewenjin/projects/openai-devday/hackathon-demo/3d-environment')
candidate = root / 'scenes/venue-topdown-render-group.blend'
scene = bpy.context.scene
if scene.name != 'Scan proportion study - provisional':
    raise RuntimeError('Open the scan proportion study before running this script')
if candidate.exists() or bpy.data.collections.get('04 Top-down render group'):
    raise RuntimeError('Render group already exists; refusing to overwrite')

bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
group = bpy.data.collections.new('04 Top-down render group')
scene.collection.children.link(group)
group['purpose'] = 'Top-down overview, detail cameras, and soft directional light'
scene['topdown_note'] = 'Roof trusses hidden for a readable plan; geometry remains in scene.'
scene['scope_note'] = 'Scan proportions and room identities remain unverified; see SCAN_STYLE_STUDY.md.'

# Keep roof elements in the editable model while clearing sight lines in renders.
trusses = bpy.data.collections.get('03 Provisional roof trusses')
if trusses:
    trusses.hide_render = True
softbox = bpy.data.objects.get('Study | large softbox')
if softbox:
    softbox.hide_render = True

def material(name, color, roughness=.85):
    mat = bpy.data.materials.new(name)
    mat.diffuse_color = (*color, 1)
    mat.use_nodes = True
    shader = mat.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Roughness'].default_value = roughness
    return mat

colors = {
    'tables': material('Top-down | honey wood', (.53, .30, .16)),
    'chairs': material('Top-down | deep blue-green', (.15, .29, .27)),
    'sofas': material('Top-down | muted raspberry', (.49, .18, .22)),
    'cabinet': material('Top-down | soft sage', (.36, .51, .40)),
}
for obj in scene.objects:
    if obj.type != 'MESH':
        continue
    name = obj.name.lower()
    kind = ('tables' if name.startswith('table_') else
            'chairs' if name.startswith('chair_') else
            'sofas' if name.startswith('sofa_') else
            'cabinet' if name.startswith('storage_') else None)
    if kind:
        obj.data.materials.clear()
        obj.data.materials.append(colors[kind])
        for face in obj.data.polygons:
            face.material_index = 0

world = bpy.data.worlds.new('Top-down | pale mint background')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.75, .88, .82, 1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .65
scene.world = world

sun_data = bpy.data.lights.new('Top-down | soft sun', 'SUN')
sun = bpy.data.objects.new('Top-down | soft sun', sun_data)
group.objects.link(sun)
sun.rotation_euler = (Vector((0, 0, 0))-Vector((-14, -18, 35))).to_track_quat('-Z', 'Y').to_euler()
sun_data.energy = 2.0
sun_data.angle = .18

def camera(name, x, y, scale):
    data = bpy.data.cameras.new(name)
    obj = bpy.data.objects.new(name, data)
    group.objects.link(obj)
    obj.location = (x, y, 90)
    obj.rotation_euler = (0, 0, 0)
    data.type = 'ORTHO'
    data.ortho_scale = scale
    data.clip_end = 300
    return obj

overview = camera('Top-down | whole footprint', .2, 0, 33.5)
camera('Top-down | wider area', 1.1, 11.3, 23.0)
camera('Top-down | long area', .4, -9.8, 24.5)
scene.render.engine = 'CYCLES'
scene.cycles.samples = 32
scene.cycles.use_denoising = True
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.camera = overview
scene.render.resolution_x = 1200
scene.render.resolution_y = 1800
scene.render.filepath = str(root / 'renders/venue-topdown-overview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(candidate))

for label, camera_name in [
    ('overview', 'Top-down | whole footprint'),
    ('wider-area', 'Top-down | wider area'),
    ('long-area', 'Top-down | long area'),
]:
    scene.camera = bpy.data.objects[camera_name]
    scene.render.resolution_y = 1800 if label == 'overview' else 1200
    scene.render.filepath = str(root / f'renders/venue-topdown-{label}.png')
    bpy.ops.render.render(write_still=True)

scene.camera = overview
scene.render.resolution_y = 1800
scene.render.filepath = str(root / 'renders/venue-topdown-overview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(candidate))
print('Saved top-down render group:', candidate)
