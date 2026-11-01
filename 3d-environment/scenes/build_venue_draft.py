"""Build a local, editable venue draft; all objects are created in a new scene."""
import bpy
from pathlib import Path
import math
import random
from mathutils import Vector

ROOT = str(Path(__file__).resolve().parent.parent)
random.seed(8)
scene = bpy.data.scenes.new('Venue Draft')
bpy.context.window.scene = scene
scene.render.engine = 'BLENDER_EEVEE'
scene.render.resolution_x = 1400
scene.render.resolution_y = 1150
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('Venue ambient')
scene.world.color = (0.28, 0.28, 0.28)

def collection(name):
    c = bpy.data.collections.new(name)
    scene.collection.children.link(c)
    return c

architecture = collection('01 Architecture')
photo = collection('02 Photo wall')
stage = collection('03 Stage')
demo = collection('04 Demo table')
food = collection('05 Refreshments')
lighting = collection('06 Preview lights and camera')

def material(name, color, metallic=0.0, roughness=0.8):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    shader = m.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value = (*color, 1)
    shader.inputs['Metallic'].default_value = metallic
    shader.inputs['Roughness'].default_value = roughness
    return m

brick = material('Brick - warm red brown', (0.31, 0.145, 0.105))
mortar = material('Brick joints', (0.51, 0.40, 0.33))
floor = material('Worn concrete', (0.30, 0.29, 0.275))
concrete = material('Concrete pillars', (0.48, 0.46, 0.42))
black = material('Dark steel', (0.045, 0.048, 0.052), 0.2)
curtain = material('Black curtain', (0.025, 0.028, 0.032))
white = material('Warm white', (0.88, 0.87, 0.82))
wood = material('Natural wood', (0.40, 0.26, 0.15))
glass = material('Window soft blue', (0.48, 0.63, 0.68), 0.1, 0.35)
colors = [material('Backdrop '+n, c) for n,c in [
    ('blue',(0.11,0.34,0.70)), ('green',(0.37,0.63,0.14)),
    ('orange',(0.90,0.30,0.08)), ('purple',(0.37,0.25,0.58)),
    ('charcoal',(0.08,0.08,0.10)), ('gray',(0.67,0.63,0.61))]]

def box(name, loc, dims, mat, target, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    obj = bpy.context.object
    obj.name = name
    obj.dimensions = dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    for c in list(obj.users_collection): c.objects.unlink(obj)
    target.objects.link(obj)
    if mat: obj.data.materials.append(mat)
    if bevel:
        mod = obj.modifiers.new('Soft edges', 'BEVEL')
        mod.width = bevel
        mod.segments = 2
        mod.affect = 'EDGES'
        obj.modifiers.new('Weighted corners', 'WEIGHTED_NORMAL')
    return obj

def rod(name, a, b, radius, mat, target, vertices=8):
    a,b=Vector(a),Vector(b)
    direction=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=radius, depth=direction.length, location=(a+b)/2)
    obj=bpy.context.object
    obj.name=name
    obj.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
    for c in list(obj.users_collection): c.objects.unlink(obj)
    target.objects.link(obj)
    obj.data.materials.append(mat)
    return obj

# Floor is the lowest geometry; all fixed details stay at the perimeter.
box('Concrete floor', (0,0,0.025), (8,8,0.05), floor, architecture)
# Back walls. Door openings on the north wall flank the demo station.
box('West brick wall',(-3.94,0,1.60),(0.12,8,3.2),brick,architecture)
for index,(x,w) in enumerate([(-3.60,.68),(-1.42,1.18),(1.60,1.2),(3.62,.64)]):
    box('North brick section %02d'%index,(x,3.94,1.0),(w,.12,2.0),brick,architecture)
box('North wall above doors',(0,3.94,2.6),(8,.12,1.2),brick,architecture)
for x in (-2.72, .10, 2.55):
    box('Door dark recess %.2f'%x,(x,3.98,1.02),(1.05,.045,2.04),black,architecture)
    box('Door lintel %.2f'%x,(x,3.82,2.12),(1.25,.22,.19),concrete,architecture)
for x in (-3.75, -1.95, 1.0, 3.75):
    box('Concrete column %.2f'%x,(x,3.78,1.6),(.18,.22,3.2),concrete,architecture)
for y in (-3.65,-1.6,1.0,3.65):
    box('West column %.2f'%y,(-3.78,y,1.6),(.22,.18,3.2),concrete,architecture)

# Fine horizontal mortar reveals preserve brick rhythm with a low object count.
for side in ('north','west'):
    for row in range(16):
        z=.12+row*.19
        if side=='north':
            if z < 2.05: continue
            box('North mortar %02d'%row,(0,3.865,z),(7.8,.008,.012),mortar,architecture)
        else:
            box('West mortar %02d'%row,(-3.865,0,z),(.008,7.8,.012),mortar,architecture)

# Window on the west wall, facing the camera.
for y in (1.5,2.5):
    box('Industrial west window',(-3.855,y,2.02),(.03,.86,1.40),glass,architecture)
    for yy in (y-.43,y,y+.43): box('Window upright',(-3.83,yy,2.02),(.04,.035,1.45),black,architecture)
    for zz in (1.32,2.02,2.72): box('Window mullion',(-3.83,y,zz),(.04,.90,.04),black,architecture)
box('Rear ceiling beam', (0,3.8,3.18),(8,.16,.18),black,architecture)
box('West roof beam',(-3.8,0,3.18),(.16,8,.18),black,architecture)
# Partial beams rather than a roof keep the open floor visible.
for x in (-2.8,2.8): box('Short exposed roof beam',(x,2.95,3.17),(.12,1.65,.14),black,architecture)

# Photo wall: white freestanding panel and original colorful round graphics.
box('Photo backdrop',(-3.76,-1.45,1.15),(.10,2.9,2.2),white,photo,.02)
for row in range(4):
    for col in range(6):
        y=-2.64+col*.46+(row%2)*.10
        z=.38+row*.51
        radius=(.13,.18,.21,.15)[(row+col)%4]
        bpy.ops.mesh.primitive_cylinder_add(vertices=24, radius=radius, depth=.008, location=(-3.70,y,z), rotation=(0,math.pi/2,0))
        ob=bpy.context.object; ob.name='Backdrop colored circle'
        for c in list(ob.users_collection): c.objects.unlink(ob)
        photo.objects.link(ob); ob.data.materials.append(colors[(row*3+col)%len(colors)])

# Low stage treatment belongs against the perimeter; no platform in the pet area.
box('Stage black curtain',(-2.65,3.76,1.26),(1.85,.18,2.45),curtain,stage)
for i in range(9):
    box('Curtain fold %02d'%i,(-3.5+i*.21,3.65,1.26),(.055,.06,2.42),black,stage)
box('Stage screen',(-2.68,3.61,1.66),(1.25,.06,.75),white,stage,.02)

def table(name,x,y,width,depth,target):
    box(name+' top',(x,y,.77),(width,depth,.07),wood,target,.015)
    for dx in (-width*.42,width*.42):
        for dy in (-depth*.35,depth*.35):
            box(name+' leg',(x+dx,y+dy,.40),(.045,.045,.74),black,target)

# Combined demo, positioned in the wall bay between the two door openings.
table('Demo table',1.45,3.49,1.25,.48,demo)
box('Drawing plotter base',(1.23,3.47,.84),(.55,.31,.08),white,demo,.015)
box('Plotter paper',(1.23,3.44,.89),(.40,.23,.008),white,demo)
box('Plotter gantry',(1.23,3.52,.98),(.50,.035,.035),black,demo)
box('Plotter pen carriage',(1.25,3.52,.94),(.08,.06,.10),black,demo)
box('Sticker printer',(1.83,3.48,.94),(.30,.30,.25),white,demo,.02)
box('Sticker printer slot',(1.83,3.317,.95),(.20,.012,.025),black,demo)
rod('Camera stand',(0.97,3.55,.81),(0.97,3.55,1.24),.016,black,demo)
box('Demo camera',(0.97,3.48,1.25),(.13,.11,.09),black,demo,.01)

table('Refreshments',3.45,3.55,.68,.43,food)
for i in range(3):
    bpy.ops.mesh.primitive_cylinder_add(vertices=12, radius=.045, depth=.12, location=(3.25+i*.17,3.50,.87))
    ob=bpy.context.object; ob.name='Coffee cup'
    for c in list(ob.users_collection): c.objects.unlink(ob)
    food.objects.link(ob); ob.data.materials.append(white)

# Preview-only camera and lighting, easy to exclude from export.
def area(name, loc, energy, size, color):
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size; data.color=color
    ob=bpy.data.objects.new(name,data); lighting.objects.link(ob); ob.location=loc
    ob.rotation_euler=(Vector((0,0,0))-ob.location).to_track_quat('-Z','Y').to_euler()
area('Daylight',(1,-1,8),1300,8,(0.83,0.9,1))
area('Warm spots',(-1,3,4.5),350,4,(1,.68,.42))
area('Blue accent',(-3,-2,3),60,2,(.20,.25,1))
camera_data=bpy.data.cameras.new('Isometric camera')
camera=bpy.data.objects.new('Isometric camera',camera_data); lighting.objects.link(camera)
camera.location=(10,-13,11)
camera.rotation_euler=(Vector((0,0,1.0))-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.type='ORTHO'; camera_data.ortho_scale=12.7; scene.camera=camera
scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=ROOT+'/scenes/venue-draft.blend')
result={'file':ROOT+'/scenes/venue-draft.blend','scene':scene.name,'object_count':len(scene.objects)}
