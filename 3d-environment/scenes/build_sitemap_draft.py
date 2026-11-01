"""Build a new editable cutaway from the supplied venue site map.

The site-map coordinates are approximate traced positions, not a survey.
The previous scene is retained and copied station objects stay separately named.
"""
import bpy
from pathlib import Path
import math
from mathutils import Vector, Matrix

ROOT = str(Path(__file__).resolve().parent.parent)
source=bpy.data.scenes.get('Venue Draft - equipment detail')
if source is None:
    raise RuntimeError('Open venue-draft-v2.blend first so its station details are available.')
scene=bpy.data.scenes.new('Venue - site map blockout')
bpy.context.window.scene=scene
scene.render.engine='BLENDER_EEVEE'
scene.render.resolution_x=1500; scene.render.resolution_y=1200; scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Venue daylight world'); scene.world.color=(.3,.3,.3)
scene.view_settings.view_transform='AgX'

def coll(name):
    c=bpy.data.collections.new(name); scene.collection.children.link(c); return c
floors=coll('01 Floor plan')
walls=coll('02 Brick and concrete architecture')
stage=coll('03 Stage and demo room')
photo=coll('04 Photo backdrop')
demo=coll('05 Drawing and sticker station')
food=coll('06 Food and coffee')
entry=coll('07 Entrance and support rooms')
lights=coll('08 Preview camera and lighting')

def mat(name,color,metal=0,rough=.8):
    m=bpy.data.materials.new(name); m.diffuse_color=(*color,1); m.use_nodes=True
    n=m.node_tree.nodes.get('Principled BSDF'); n.inputs['Base Color'].default_value=(*color,1); n.inputs['Metallic'].default_value=metal; n.inputs['Roughness'].default_value=rough
    return m
concrete=mat('Concrete floor',(0.42,.41,.385))
courtyard=mat('Courtyard paving',(.33,.34,.33))
brick=mat('Warm industrial brick',(.34,.17,.12))
mortar=mat('Brick mortar',(.48,.36,.30))
stone=mat('Concrete structure',(.50,.49,.46))
steel=mat('Steel and door frames',(.045,.052,.055),.25)
curtain=mat('Stage curtains',(.024,.026,.030))
window=mat('Daylit industrial window',(.51,.66,.69),.06,.4)
white=mat('Screen and papers',(.87,.87,.83))
wood=mat('Catering table wood',(.42,.28,.17))
blackcloth=mat('Table fabric',(.045,.046,.05))

# Map pixel frame: venue extends x=207..1285 and y=89..1040.
# Scale the longest horizontal world extent to eight units.
S=8/1078
def xy(x,y): return ((x-746)*S,(565-y)*S)
def point(x,y,z):
    a,b=xy(x,y); return (a,b,z)

def cube(name,loc,size,material,target):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc)
    o=bpy.context.object; o.name=name; o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for c in list(o.users_collection): c.objects.unlink(o)
    target.objects.link(o); o.data.materials.append(material); return o

def floor_shape(name,vertices,material):
    # A thin solid floor provides an actual lowest point at z=0.
    n=len(vertices); v=[(*xy(x,y),z) for z in (0,.055) for x,y in vertices]
    f=[tuple(reversed(range(n))),tuple(range(n,2*n))]+[(i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n)]
    mesh=bpy.data.meshes.new(name); mesh.from_pydata(v,[],f); mesh.update()
    ob=bpy.data.objects.new(name,mesh); floors.objects.link(ob); ob.data.materials.append(material)
    return ob

def wall(name,start,end,height=2.5,thickness=.10,material=brick,zbase=.055):
    a=Vector(xy(*start)); b=Vector(xy(*end)); delta=b-a
    o=cube(name,((a.x+b.x)/2,(a.y+b.y)/2,zbase+height/2),(delta.length,thickness,height),material,walls)
    o.rotation_euler.z=math.atan2(delta.y,delta.x)
    return o

def block_map(name,rect,height,material,target,z=.055):
    x1,y1,x2,y2=rect; a=xy(x1,y1); b=xy(x2,y2)
    return cube(name,((a[0]+b[0])/2,(a[1]+b[1])/2,z+height/2),(abs(b[0]-a[0]),abs(b[1]-a[1]),height),material,target)

# Zones traced directly from the drawing. The support and entrance areas keep
# their stepped/angled relationship instead of collapsing to a square room.
floor_shape('Demo and stage room',[(207,383),(285,383),(285,207),(546,207),(546,89),(695,116),(695,790),(530,790),(530,594),(207,594)],concrete)
floor_shape('Food room',[(695,116),(1060,180),(1060,277),(695,277)],concrete)
floor_shape('Hacking room',[(695,277),(1285,277),(1285,500),(695,500)],concrete)
floor_shape('Courtyard',[(695,500),(1035,500),(1035,570),(695,570)],courtyard)
floor_shape('Judges room',[(695,570),(854,570),(854,700),(695,700)],concrete)
floor_shape('Crew room',[(854,570),(1035,570),(991,730),(854,700)],concrete)
floor_shape('Connecting corridor',[(1035,500),(1118,500),(1118,570),(1012,790),(943,790),(991,730),(1035,570)],concrete)
floor_shape('Entrance welcome area',[(837,994),(1092,790),(1190,790),(1190,1040),(837,1040)],concrete)
floor_shape('Demo entrance connector',[(530,790),(1012,790),(1012,836),(837,994),(837,914),(695,914),(695,790)],concrete)

# Cutaway: retain far and left-hand walls; omit camera-facing near walls.
wall('Stage north wall', (285,207),(546,207),2.45)
wall('Stage left curtain wall',(285,207),(285,383),2.45,.12,curtain)
wall('Demo left brick wall',(207,383),(207,594),2.25)
wall('Demo return wall',(207,594),(530,594),1.45)
wall('Upper stage wing',(546,89),(695,116),2.45)
wall('North food wall',(695,116),(1060,180),2.45)
wall('North food window wall',(1060,180),(1060,277),2.1)
wall('North hacking wall',(1060,277),(1285,277),2.45)
wall('Hacking right wall return',(1285,277),(1285,370),1.25)

# Demo room / hacking partition with two visible openings. Shortened upper
# portion is a deliberate cutaway to preserve the isometric view.
for i,(ya,yb) in enumerate([(116,235),(290,355),(410,500)]):
    wall('Demo partition brick pier %d'%i,(695,ya),(695,yb),1.65,.10)
for y in (235,290,355,410):
    wall('Demo door frame %d'%y,(695,y-3),(695,y+3),1.78,.14,stone)
wall('Food room divider left',(695,277),(790,277),1.0,.09,stone)
wall('Food room divider right',(980,277),(1060,277),1.0,.09,stone)
wall('Judges and crew separator',(854,570),(854,700),.72,.07,stone)
wall('Entrance corridor edge',(530,594),(530,790),1.10,.09,brick)
wall('Entrance corridor south cutaway',(837,994),(1092,790),.32,.08,stone)
wall('Welcome outer wall',(837,994),(837,1040),.75,.09,brick)

# Steel frames, concrete supports, dark ceiling beam fragments and windows.
for x,y in [(285,207),(546,207),(695,116),(695,235),(695,355),(695,500),(1060,180),(1060,277),(1285,277)]:
    p=point(x,y,1.22); cube('Concrete column %d %d'%(x,y),p,(.13,.13,2.35),stone,walls)
wall('Steel beam over demo partition',(695,116),(695,500),.12,.16,steel,2.28)
wall('Steel beam over north food wall',(695,116),(1060,180),.12,.16,steel,2.28)
wall('Stage top beam',(285,207),(546,207),.12,.16,steel,2.28)

# Set window panels just in front of the north wall; mullions suggest the
# factory windows and skylight rhythm without closing the cutaway roof.
for x in (750,850,950):
    p=point(x,145+(x-695)*64/365,1.44)
    obj=cube('Food industrial window',p,(.52,.03,.75),window,walls)
    obj.rotation_euler.z=-math.atan2(64,365)
    for t in (-.25,0,.25):
        cube('Food window upright',(p[0]+t,p[1]-.035,p[2]),(.026,.035,.78),steel,walls)

# Stage screen and curtains occupy the mapped stage location, with a minimal
# stage lip. This is still a layout study, not a navigation mesh.
block_map('Stage riser', (313,239,607,360),.08,steel,stage)
block_map('Stage backdrop black curtain',(313,235,607,246),1.30,curtain,stage,z=.135)
block_map('Stage screen',(365,229,555,236),.70,white,stage,z=.53)

def copy_station(source_prefix,target,origin,target_center,angle=0,scale=1):
    source_coll=next(c for c in source.collection.children if c.name.startswith(source_prefix))
    rot=Matrix.Rotation(angle,4,'Z'); org=Vector(origin); dest=Vector(target_center)
    for ob in source_coll.objects:
        new=ob.copy(); new.data=ob.data.copy() if ob.data else None
        new.name=ob.name.split('.')[0]+' map'; target.objects.link(new)
        new.location=dest+(rot.to_3x3() @ ((ob.location-org)*scale))
        new.rotation_euler=(rot.to_3x3() @ ob.rotation_euler.to_matrix()).to_euler()
        new.scale=ob.scale*scale

# Between the two stage-right door openings, as specified by the user.
p=point(665,322,0)
copy_station('04 Demo table',demo,(1.45,3.49,0),p,-math.pi/2,.83)
# The backdrop sits in the demo room near the shared doorway; its design is
# original geometry and no reference photograph is embedded.
p=point(380,463,0)
copy_station('02 Photo wall',photo,(-3.76,-1.45,0),p,0,.72)

# Refreshments lie in the actual mapped food zone along the northern wall.
for i,(x,y) in enumerate([(805,180),(875,192),(945,204)]):
    p=point(x,y,.46); cube('Food table %d'%i,p,(.50,.28,.07),wood,food)
    for dx in (-.20,.20):
        for dy in (-.10,.10): cube('Food table leg',(p[0]+dx,p[1]+dy,.25),(.025,.025,.40),steel,food)
    cube('Food tray',(p[0],p[1],.52),(.32,.18,.025),white,food)

def add_area(name,loc,energy,size,color):
    data=bpy.data.lights.new(name,'AREA'); data.energy=energy; data.shape='DISK'; data.size=size; data.color=color
    o=bpy.data.objects.new(name,data); lights.objects.link(o); o.location=loc
    o.rotation_euler=(Vector((0,0,0))-o.location).to_track_quat('-Z','Y').to_euler()
add_area('Daylight',(2,-2,8),1800,8,(.88,.94,1))
add_area('Warm stage fill',(-3,2,4),350,4,(1,.72,.5))
add_area('Blue and magenta accents',(-3,0,3),100,3,(.38,.35,1))
camera_data=bpy.data.cameras.new('Site map isometric camera'); camera=bpy.data.objects.new('Site map isometric camera',camera_data); lights.objects.link(camera)
camera.location=(10,-13,11); camera.rotation_euler=(Vector((0,0,0.6))-camera.location).to_track_quat('-Z','Y').to_euler(); camera_data.type='ORTHO'; camera_data.ortho_scale=12.8; scene.camera=camera
path=ROOT+'/scenes/venue-site-map-draft.blend'; bpy.ops.wm.save_as_mainfile(filepath=path)
result={'file':path,'scene':scene.name,'collections':[c.name for c in scene.collection.children],'object_count':len(scene.objects)}
