"""Make a provisional through-opening through the two modeled partition layers."""
import bpy
from pathlib import Path
from mathutils import Vector

root=Path(__file__).resolve().parents[2]
scene=bpy.data.scenes['Scan proportion study - provisional']
bpy.context.window.scene=scene
if Path(bpy.data.filepath).name!='venue-architecture-furniture-grouped.blend': raise RuntimeError('Wrong source')
out=root/'scenes/venue-rooms-opening-candidate.blend'
if out.exists(): raise RuntimeError('Refusing to overwrite candidate')
# Placement is inferred from the source mesh topology; photograph-to-scan
# registration and metric scale are not established.
x0,x1=-3.35,-1.45
y0,y1=1.12,2.20
z0,z1=-.2,2.75
bpy.ops.mesh.primitive_cube_add(size=1, location=((x0+x1)/2,(y0+y1)/2,(z0+z1)/2))
cutter=bpy.context.object
cutter.name='Temporary opening cutter'
cutter.dimensions=(x1-x0,y1-y0,z1-z0)
bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
for name in ('Wall_17','Wall_22'):
    obj=bpy.data.objects[name]
    obj.data=obj.data.copy()
    before=len(obj.data.polygons)
    bpy.ops.object.select_all(action='DESELECT'); obj.select_set(True); bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Provisional rectangular connecting opening','BOOLEAN')
    modifier.operation='DIFFERENCE'; modifier.solver='EXACT'; modifier.object=cutter
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    if len(obj.data.polygons)==before: raise RuntimeError('No change to '+name)
    obj['opening_status']='Provisional interpretation; photo-to-scan registration and scale unverified.'
    obj['opening_sources']='IMG_0273.HEIC; IMG_0274.HEIC; IMG_0315.HEIC; IMG_0320.HEIC; IMG_0324.jpg; devday-sitemap.png'
    obj['opening_note']='Aligned rectangular passage cut through both scan partition layers; exact placement and size inferred.'
bpy.data.objects.remove(cutter,do_unlink=True)
bpy.context.view_layer.update()
# Test actual mesh intersections over a grid through both partition layers.
obstacles=[o for o in scene.objects if o.type=='MESH' and any(c.name in ('Architecture | walls and joints','Architecture | doors and windows') for c in o.users_collection)]
for x in (-3.25,-2.85,-2.4,-1.95,-1.55):
 for z in (.2,.8,1.5,2.5):
    origin=Vector((x,.9,z)); direction=Vector((0,1,0)); length=1.55
    for obj in obstacles:
        inv=obj.matrix_world.inverted()
        start=inv@origin; endpoint=inv@(origin+direction*length)
        vec=endpoint-start
        hit,loc,normal,face=obj.ray_cast(start,vec.normalized(),distance=vec.length)
        if hit: raise RuntimeError('Passage obstructed by %s at x=%s z=%s'%(obj.name,x,z))
# At the center above the opening, each wall retains a lintel.
for name in ('Wall_17','Wall_22'):
    obj=bpy.data.objects[name]; inv=obj.matrix_world.inverted()
    a=inv@Vector((-2.4,.9,3.0)); b=inv@Vector((-2.4,2.45,3.0)); v=b-a
    hit,*_=obj.ray_cast(a,v.normalized(),distance=v.length)
    if not hit: raise RuntimeError('Header missing from '+name)
scene['opening_review']='scenes/openings-review/OPENING_REPORT.md'
scene['opening_basis']='One provisional through-opening, inferred from modeled partition and photo context; dimensions are not surveyed.'
bpy.ops.wm.save_as_mainfile(filepath=str(out))
print('SAVED CANDIDATE',out,'clear sampled passage x',x0,x1,'z top',z1)

# Diagnostic review views: unsaved cameras and no scene-visibility changes.
from mathutils import Vector

def camera(name,location,target,ortho=False,scale=8):
    data=bpy.data.cameras.new(name); obj=bpy.data.objects.new(name,data); scene.collection.objects.link(obj)
    obj.location=location; obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
    if ortho: data.type='ORTHO'; data.ortho_scale=scale
    else: data.lens=25
    return obj
scene.render.engine='CYCLES'; scene.cycles.samples=24; scene.cycles.use_denoising=True
scene.render.resolution_percentage=100; scene.render.resolution_x=1200; scene.render.resolution_y=900
scene.render.image_settings.file_format='PNG'; scene.view_settings.view_transform='Standard'
for label,cam in [
 ('plan',camera('Review plan',(-2.4,1.6,13),(-2.4,1.6,0),True,8)),
 ('long-room',camera('Review from long room',(-2.4,-4,1.8),(-2.4,1.8,1.45))),
 ('wide-room',camera('Review from wide room',(-2.4,7,1.8),(-2.4,1.5,1.45)))]:
 scene.camera=cam; scene.render.filepath=str(root/'renders'/('venue-opening-'+label+'.png')); bpy.ops.render.render(write_still=True)
