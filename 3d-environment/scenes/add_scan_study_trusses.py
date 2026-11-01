"""Add photo-informed, approximate roof trusses to the scan study only."""
import bpy
from mathutils import Vector

scene = bpy.context.scene
if scene.name != 'Scan proportion study - provisional':
    raise RuntimeError('Open the scan study scene first')
if bpy.data.collections.get('03 Provisional roof trusses'):
    raise RuntimeError('Trusses already exist')
collection = bpy.data.collections.new('03 Provisional roof trusses')
scene.collection.children.link(collection)
mat = bpy.data.materials.new('Study | warm ivory steel')
mat.diffuse_color = (0.72, 0.75, 0.70, 1)
mat.use_nodes = True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value = mat.diffuse_color
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value = .8

def beam(name, a, b, radius=.065):
    a, b = Vector(a), Vector(b)
    direction = b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=radius, depth=direction.length, location=(a+b)*.5)
    obj = bpy.context.object
    obj.name = name
    obj.rotation_euler = direction.to_track_quat('Z', 'Y').to_euler()
    for c in tuple(obj.users_collection):
        c.objects.unlink(obj)
    collection.objects.link(obj)
    obj.data.materials.append(mat)
    obj['evidence_status'] = 'inferred repeated truss, not surveyed; scan ceiling and photos IMG_0310 and IMG_0317'
    return obj

# The GLB's long floor is x=-4..4.85, y=-20.94..1.26; its ceiling
# rises to ~5.68. Locations/count are stylised estimates, not measured.
for i, y in enumerate((-18.3, -13.7, -9.1, -4.5, .1), 1):
    left, ridge, right = (-3.85,y,4.20), (.25,y,5.55), (4.70,y,4.20)
    beam(f'Truss {i:02} | left slope', left, ridge)
    beam(f'Truss {i:02} | right slope', ridge, right)
    beam(f'Truss {i:02} | lower chord', left, right)
    beam(f'Truss {i:02} | centre', (.25,y,4.2), ridge, .045)
    beam(f'Truss {i:02} | diagonal L', (-2.0,y,4.2), ridge, .04)
    beam(f'Truss {i:02} | diagonal R', (2.35,y,4.2), ridge, .04)
beam('Longitudinal beam | left',(-3.85,-20.6,4.20),(-3.85,1.05,4.20),.095)
beam('Longitudinal beam | right',(4.70,-20.6,4.20),(4.70,1.05,4.20),.095)
scene['roof_trusses'] = 'Approximate stylisation informed by IMG_0310 / IMG_0317; location and count not registered.'
bpy.ops.wm.save_as_mainfile(filepath=bpy.data.filepath)
