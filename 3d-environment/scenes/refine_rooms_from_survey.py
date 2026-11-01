"""Build a new visual survey revision from the current site-map blockout.

All heights in this revision are visual placeholders, not measurements.
Texture images are original procedural assets; no photographs are used.
"""
import bpy
from pathlib import Path
import math
from mathutils import Vector

ROOT = str(Path(__file__).resolve().parent.parent)
if bpy.context.scene.name != 'Venue - site map blockout':
    raise RuntimeError('Open the site-map blockout scene first.')
bpy.ops.scene.new(type='FULL_COPY')
scene=bpy.context.scene
scene.name='Venue - photo survey revision'
scene['measurement_status']='All heights and door dimensions are provisional; calibrate to scan or tape measurements.'
scene['sources']='Reference index IMG_0249–IMG_0324; site map; see REFERENCE_SURVEY.md.'
scene['cutaway']='Camera-facing walls and roof surfaces omitted or reduced for visibility.'

def find_collection(prefix):
    return next(c for c in scene.collection.children if c.name.startswith(prefix))
floors=find_collection('01 Floor plan')
walls=find_collection('02 Brick and concrete architecture')
photo=find_collection('04 Photo backdrop')
stage=find_collection('03 Stage and demo room')
roof=bpy.data.collections.new('09 Hacking skylight and roof frame - approximate')
scene.collection.children.link(roof)
details=bpy.data.collections.new('10 Survey details - provisional')
scene.collection.children.link(details)

def mat(name,color,metal=0,rough=.8):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF'); n.inputs['Base Color'].default_value=(*color,1)
    n.inputs['Metallic'].default_value=metal; n.inputs['Roughness'].default_value=rough
    return m

def texture_material(name,path,rough=.9):
    image=bpy.data.images.load(path,check_existing=True); image.pack()
    m=mat(name,(.5,.5,.5),rough=rough); nodes=m.node_tree.nodes
    tex=nodes.new('ShaderNodeTexImage'); tex.image=image; tex.extension='REPEAT'
    m.node_tree.links.new(tex.outputs['Color'],nodes.get('Principled BSDF').inputs['Base Color'])
    return m

brick=texture_material('Original generated brick',ROOT+'/scenes/assets/brick-generated.png')
concrete=texture_material('Original generated concrete',ROOT+'/scenes/assets/concrete-generated.png')
steel=mat('Survey dark steel',(.045,.052,.055),.35,.48)
white=mat('Survey painted roof trusses',(.67,.69,.68),.12,.55)
glass=mat('Survey skylight glass',(.69,.78,.8),.05,.34)
green=mat('Food sliding door muted green',(.20,.36,.33),.22,.65)
black=mat('Window frame',(.05,.055,.06),.2,.55)

def relink(o,target):
    for c in list(o.users_collection): c.objects.unlink(o)
    target.objects.link(o)
def cube(name,loc,size,material,target,rotation=0):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=name
    o.dimensions=size; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    o.rotation_euler.z=rotation; relink(o,target); o.data.materials.append(material); return o
def rod(name,a,b,r,material,target,vertices=8):
    a=Vector(a); b=Vector(b); v=b-a
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=v.length,location=(a+b)/2)
    o=bpy.context.object; o.name=name; o.rotation_euler=v.to_track_quat('Z','Y').to_euler()
    relink(o,target); o.data.materials.append(material); return o
S=8/1078
def p(x,y,z): return ((x-746)*S,(565-y)*S,z)

def set_wall_uv(o,material):
    if o.type!='MESH': return
    mesh=o.data
    uv=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        normal=poly.normal
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            if abs(normal.z)>.5: a,b=co.x,co.y
            elif abs(normal.y)>.5: a,b=co.x,co.z
            else: a,b=co.y,co.z
            uv.data[li].uv=(a/1.0,b/1.0)
    mesh.materials.clear(); mesh.materials.append(material)

def set_floor_uv(o):
    if o.type!='MESH': return
    mesh=o.data; uv=mesh.uv_layers.active or mesh.uv_layers.new(name='UVMap')
    for poly in mesh.polygons:
        for li in poly.loop_indices:
            co=mesh.vertices[mesh.loops[li].vertex_index].co
            uv.data[li].uv=(co.x/1.7,co.y/1.7)
    mesh.materials.clear(); mesh.materials.append(concrete)

# Flat, locally authored texture approximations. These are not photo textures.
for o in walls.objects:
    if o.type=='MESH' and o.data.materials and o.data.materials[0] and o.data.materials[0].name.startswith('Warm industrial brick'):
        set_wall_uv(o,brick)
for o in floors.objects:
    if not o.name.startswith('Courtyard'): set_floor_uv(o)

# The screen belongs on the audience-facing side of the curtain, not behind it.
backdrop=next(o for o in stage.objects if o.name.startswith('Stage backdrop black curtain'))
backdrop.dimensions.z=2.05; backdrop.location.z=1.16
screen=next(o for o in stage.objects if o.name.startswith('Stage screen'))
screen.location.y-=20*S; screen.location.z=1.28

# Move the temporary backdrop toward the opening to the hacking room. Shorten
# the model along the wall so it doesn't obstruct both doorways or the table.
old=Vector(p(380,463,0)); new=Vector(p(620,490,0))
for o in photo.objects:
    delta=o.location-old
    o.location=new+Vector((delta.x,delta.y*.53,delta.z))
    o.scale.y*=.53

# The photos show the food-side green sliding door at the stage-room opening.
# It is parked at one jamb to preserve a visible opening in this cutaway.
pp=p(695,246,0)
cube('Food doorway green sliding leaf',(pp[0]+.035,pp[1],.79),(.055,.35,1.46),green,details)
for z in (.18,.83,1.46): cube('Sliding door horizontal metal rail',(pp[0]-.002,pp[1],z),(.025,.36,.025),white,details)
cube('Food doorway lintel',p(695,262,1.57),(.16,.48,.10),steel,details)
cube('Hacking doorway lintel',p(695,383,1.78),(.16,.44,.10),steel,details)

# Distinctive long, pitched roof of the hacking room: retain the skeletal
# white trusses and two narrow rear skylight strips, leaving the roof open.
eave=2.45; ridge=3.03
for x in (760,870,980,1090,1200,1260):
    a=p(x,286,eave); b=p(x,386,ridge); c=p(x,490,eave)
    rod('Hacking roof truss near',a,b,.016,white,roof)
    rod('Hacking roof truss far',b,c,.016,white,roof)
    rod('Hacking roof truss tie',a,c,.012,white,roof)
    rod('Hacking roof truss upright',p(x,386,eave),b,.009,white,roof)
for y,z in ((286,eave),(386,ridge),(490,eave)):
    rod('Hacking longitudinal roof beam',p(705,y,z),p(1270,y,z),.022,steel,roof)
for y,z in ((306,2.58),(325,2.69)):
    rod('Skylight edge',p(710,y,z),p(1265,y,z),.013,white,roof)

# High multi-pane factory windows on the surviving far end of the hacking room.
for x in (1090,1160,1230):
    center=p(x,274,1.55)
    cube('Hacking industrial window',center,(.42,.025,.94),glass,details)
    for dx in (-.21,0,.21):
        cube('Hacking window upright',(center[0]+dx,center[1]-.02,center[2]),(.027,.025,.98),black,details)
    for z in (1.09,1.55,2.01):
        cube('Hacking window crossbar',(center[0],center[1]-.02,z),(.44,.025,.027),black,details)

# Short dark structural beams communicate the higher stage/demo ceiling while
# maintaining the cutaway and avoiding a solid roof over the pet area.
for x in (345,470,600):
    rod('Demo ceiling beam',p(x,225,2.45),p(x,365,2.45),.025,steel,details)

path=ROOT+'/scenes/venue-photo-survey-draft.blend'
bpy.ops.wm.save_as_mainfile(filepath=path)
result={'file':path,'scene':scene.name,'objects':len(scene.objects),'height_status':scene['measurement_status']}
