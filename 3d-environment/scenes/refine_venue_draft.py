"""Refine the active venue scene into a separately saved review copy."""
import bpy
from pathlib import Path
import math
from mathutils import Vector

ROOT = str(Path(__file__).resolve().parent.parent)
if not bpy.context.scene.name.startswith('Venue Draft'):
    raise RuntimeError('Open the venue draft scene before running this script.')

# Keep the original scene and any unsaved work intact in the new .blend file.
bpy.ops.scene.new(type='FULL_COPY')
scene = bpy.context.scene
scene.name = 'Venue Draft - equipment detail'
demo = next(c for c in scene.collection.children if c.name.startswith('04 Demo table'))
photo = next(c for c in scene.collection.children if c.name.startswith('02 Photo wall'))

def material(name, color, metallic=0.0, roughness=0.65):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    p=m.node_tree.nodes.get('Principled BSDF')
    p.inputs['Base Color'].default_value=(*color,1)
    p.inputs['Metallic'].default_value=metallic
    p.inputs['Roughness'].default_value=roughness
    return m

dark=material('Demo matte black',(0.025,0.028,0.035))
cloth=material('Demo table black fabric',(0.035,0.037,0.043))
silver=material('Plotter brushed metal',(0.47,0.52,0.55),.75,.3)
wood=material('Plotter wood board',(0.46,0.28,0.14))
cream=material('Paper and printer case',(0.88,0.86,0.78))
ink=material('Dark graphic marks',(0.035,0.035,0.045))
white=material('Light graphic marks',(0.92,0.92,0.87))
screen=material('Laptop screen',(0.045,0.075,0.10),.1,.4)

def move_to(obj, collection):
    for c in list(obj.users_collection): c.objects.unlink(obj)
    collection.objects.link(obj)

def box(name, loc, dims, mat, target, bevel=0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=dims
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    move_to(o,target); o.data.materials.append(mat)
    if bevel:
        mod=o.modifiers.new('Rounded edges','BEVEL'); mod.width=bevel; mod.segments=2
        o.modifiers.new('Weighted corners','WEIGHTED_NORMAL')
    return o

def rod(name,a,b,r,mat,target,vertices=10):
    a,b=Vector(a),Vector(b); d=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices, radius=r, depth=d.length, location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=d.to_track_quat('Z','Y').to_euler()
    move_to(o,target); o.data.materials.append(mat); return o

def disk(name,loc,radius,depth,mat,target,axis='Y'):
    rot=(math.pi/2,0,0) if axis=='Y' else (0,math.pi/2,0)
    bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=radius,depth=depth,location=loc,rotation=rot)
    o=bpy.context.object; o.name=name; move_to(o,target); o.data.materials.append(mat); return o

# Replace only the equipment placeholders on the copied demo collection.
for o in list(demo.objects):
    if o.name.startswith(('Drawing plotter base','Plotter paper','Plotter gantry','Plotter pen carriage','Sticker printer','Camera stand','Demo camera')):
        bpy.data.objects.remove(o,do_unlink=True)
top=next(o for o in demo.objects if o.name.startswith('Demo table top'))
top.data.materials.clear(); top.data.materials.append(cloth)
box('Black draped table front',(1.45,3.255,.43),(1.25,.02,.66),cloth,demo)
box('Black draped table left',(.835,3.49,.43),(.02,.48,.66),cloth,demo)
box('Black draped table right',(2.065,3.49,.43),(.02,.48,.66),cloth,demo)

# Photo reference: wood drawing board, open mechanism, pivoting aluminium arms,
# and pen held above a small white card.
box('Plotter wooden drawing board',(1.17,3.45,.825),(.54,.34,.035),wood,demo,.008)
box('Plotter motor base',(.98,3.53,.88),(.13,.14,.09),dark,demo,.008)
disk('Plotter motor hub',(.98,3.448,.91),.056,.035,silver,demo)
left=(.98,3.455,.91); elbow=(1.10,3.455,1.16); wrist=(1.31,3.455,.97)
for offset in (-.025,.025):
    a=(left[0],left[1]+offset,left[2]); b=(elbow[0],elbow[1]+offset,elbow[2]); c=(wrist[0],wrist[1]+offset,wrist[2])
    rod('Plotter rising arm',a,b,.012,silver,demo)
    rod('Plotter descending arm',b,c,.012,silver,demo)
for i,p in enumerate((left,elbow,wrist)):
    disk('Plotter pivot %d'%i,(p[0],p[1]-.037,p[2]),.022,.012,dark,demo)
box('Drawing card',(1.34,3.39,.85),(.16,.12,.007),cream,demo)
box('Plotter pen holder',(1.31,3.445,.94),(.09,.045,.04),silver,demo,.004)
rod('Drawing pen',(1.31,3.445,.96),(1.31,3.445,.86),.007,dark,demo)
for i in range(3): box('Stacked drawing paper',(1.49,3.40,.84+i*.006),(.12,.10,.004),cream,demo)

# Reference printer has a light case, dark front, and a slot.
box('Sticker printer white body',(1.82,3.49,.91),(.30,.27,.19),cream,demo,.016)
box('Sticker printer dark front',(1.82,3.345,.915),(.23,.012,.12),dark,demo,.004)
box('Sticker output slot',(1.82,3.335,.875),(.17,.008,.012),silver,demo)
box('Sticker emerging',(1.82,3.31,.86),(.12,.055,.004),cream,demo)
# Compact camera with lens aimed into the room and a small laptop.
box('Camera body',(1.56,3.46,.90),(.16,.10,.10),dark,demo,.012)
disk('Camera lens',(1.56,3.396,.90),.05,.04,dark,demo)
disk('Camera lens glass',(1.56,3.372,.90),.033,.006,screen,demo)
box('Laptop keyboard',(1.58,3.58,.83),(.25,.15,.015),dark,demo,.004)
box('Laptop screen',(1.58,3.65,.93),(.25,.018,.19),screen,demo,.004)

# Add simple original expressions to the existing color circles. They convey the
# reference's playful appearance without copying its event artwork verbatim.
circles=[o for o in photo.objects if o.name.startswith('Backdrop colored circle')]
for i,o in enumerate(circles):
    x=-3.689; y=o.location.y; z=o.location.z
    radius=o.dimensions.y/2
    mark=white if i%6==4 else ink
    for side in (-1,1):
        yy=y+side*radius*.40
        if i%3==0:
            rod('Backdrop eye', (x,yy-radius*.09,z+radius*.08),(x,yy+radius*.09,z+radius*.08),.007,mark,photo,6)
        elif i%3==1:
            rod('Backdrop eye', (x,yy,z-radius*.03),(x,yy,z+radius*.18),.007,mark,photo,6)
            rod('Backdrop eye', (x,yy-radius*.10,z+radius*.075),(x,yy+radius*.10,z+radius*.075),.007,mark,photo,6)
        else:
            disk('Backdrop dot eye',(x,yy,z+radius*.07),.012,.006,mark,photo,'X')

path=ROOT+'/scenes/venue-draft-v2.blend'
bpy.ops.wm.save_as_mainfile(filepath=path)
result={'file':path,'scene':scene.name,'objects':len(scene.objects),'demo_objects':len(demo.objects)}
