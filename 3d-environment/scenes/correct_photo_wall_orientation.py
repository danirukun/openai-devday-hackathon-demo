"""Apply the owner's 90-degree photo-wall correction in a new draft scene."""
import bpy
from pathlib import Path
import math
from mathutils import Vector, Matrix

ROOT = str(Path(__file__).resolve().parent.parent)
if bpy.context.scene.name!='Venue - photo survey revision':
    raise RuntimeError('Open the photo-survey draft scene before running this script.')
bpy.ops.scene.new(type='FULL_COPY')
scene=bpy.context.scene
scene.name='Venue - corrected photo wall'
photo=next(c for c in scene.collection.children if c.name.startswith('04 Photo backdrop'))
scale=8/1078
pivot=Vector(((620-746)*scale,(565-490)*scale,0))
turn=Matrix.Rotation(-math.pi/2,4,'Z')
for obj in photo.objects:
    obj.location=pivot+(turn.to_3x3() @ (obj.location-pivot))
    obj.rotation_euler=(turn.to_3x3() @ obj.rotation_euler.to_matrix()).to_euler()
    obj['position_basis']='Owner correction: rotate backdrop 90 degrees; pivot remains provisional.'
scene['measurement_status']='Camera metadata inventoried; camera poses, lens distortion and metric dimensions are not solved.'
scene['photo_wall_status']='Owner-supplied 90-degree orientation correction; position provisional.'
path=ROOT+'/scenes/venue-camera-review-draft.blend'
bpy.ops.wm.save_as_mainfile(filepath=path)
result={'file':path,'scene':scene.name,'rotated_objects':len(photo.objects),'rotation_degrees':-90}
