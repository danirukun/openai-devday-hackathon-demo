import bpy
s=bpy.data.scenes['Scan proportion study - provisional']; bpy.context.window.scene=s; bpy.context.view_layer.update()
for name in ['Floor_Living_Room','Floor_Other_2','Floor_Other_1','Floor_Dining_Room_1','Floor_Dining_Room_2','Wall_0','Wall_5','Wall_16','Wall_17','Wall_21','Wall_22','Wall_26','Joint_0','Joint_1','Joint_18','Joint_19']:
 o=bpy.data.objects[name]; print('\nOBJECT',name)
 for p in o.data.polygons:
  coords=[o.matrix_world@o.data.vertices[i].co for i in p.vertices]
  print('FACE',p.index,[(round(v.x,2),round(v.y,2),round(v.z,2)) for v in coords])
