"""Render a temporary Blender re-import of the cutaway GLB for a visual check."""
import bpy
from pathlib import Path
root = Path(__file__).resolve().parent
source = bpy.data.scenes['Scan proportion study - provisional']
camera = bpy.data.objects['Top-down | whole footprint']
light = bpy.data.objects['Top-down | soft sun']
scene = bpy.data.scenes.new('Temporary GLB review')
bpy.context.window.scene = scene
bpy.ops.import_scene.gltf(filepath=str(root / 'venue-threejs-cutaway.glb'))
scene.collection.objects.link(camera)
scene.collection.objects.link(light)
scene.camera = camera
scene.world = source.world
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.cycles.use_denoising = True
scene.render.resolution_x = 600
scene.render.resolution_y = 900
scene.render.resolution_percentage = 100
scene.view_settings.view_transform = 'Standard'
scene.render.image_settings.file_format = 'PNG'
scene.render.filepath = str(root.parent / 'renders/venue-threejs-cutaway-review.png')
bpy.ops.render.render(write_still=True)
print('REVIEW_RENDER', scene.render.filepath)
