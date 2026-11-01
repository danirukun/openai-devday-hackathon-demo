"""Create independently movable groups and an exact inventory in a new draft.

Run inside Blender with the corrected photo-wall draft scene active. Geometry
and world-space transforms are preserved; source scenes are not overwritten.
"""
import bpy
from pathlib import Path
import csv
import re
from mathutils import Vector

ROOT = str(Path(__file__).resolve().parent.parent)
if bpy.context.scene.name != 'Venue - corrected photo wall':
    raise RuntimeError('Open the corrected photo-wall scene before running this script.')

bpy.ops.scene.new(type='FULL_COPY')
scene=bpy.context.scene
scene.name='Venue - movable assets audit'
def collection(prefix):
    matches=[c for c in scene.collection.children if c.name.startswith(prefix)]
    if len(matches)!=1: raise RuntimeError('Expected one collection: '+prefix)
    return matches[0]

photo=collection('04 Photo backdrop')
demo=collection('05 Drawing and sticker station')
food=collection('06 Food and coffee')
stage=collection('03 Stage and demo room')
architecture=collection('02 Brick and concrete architecture')
sources={o.name:o for c in (photo,demo,food,stage,architecture) for o in c.objects}
assignments={}
specs={}

def add(key,label,category,objects,note=''):
    objects=list(objects)
    if not objects: raise RuntimeError('Empty asset group: '+key)
    for obj in objects:
        if obj.name in assignments: raise RuntimeError('Duplicate assignment: '+obj.name)
        assignments[obj.name]=key
    specs[key]={'label':label,'category':category,'objects':objects,'note':note}

add('photo_wall_01','Photo wall','Backdrop',photo.objects,
    'Includes backdrop panel and separate graphic meshes; orientation corrected by owner.')

demo_objects=list(demo.objects)
rules=[
 ('demo_table_01','Demo table','Table',('Demo table top','Demo table leg','Black draped table')),
 ('plotter_01','Drawing plotter','Equipment',('Plotter ','Drawing pen')),
 ('drawing_card_01','Drawing card','Paper',('Drawing card',)),
 ('drawing_paper_01','Drawing paper stack','Paper',('Stacked drawing paper',)),
 ('sticker_printer_01','Sticker printer','Equipment',('Sticker printer','Sticker output slot')),
 ('sticker_01','Emerging sticker','Paper',('Sticker emerging',)),
 ('demo_camera_01','Demo camera','Equipment',('Camera body','Camera lens')),
 ('laptop_01','Demo laptop','Equipment',('Laptop keyboard','Laptop screen')),
]
for key,label,kind,prefixes in rules:
    add(key,label,kind,[o for o in demo_objects if o.name.startswith(prefixes)])
unassigned=[o.name for o in demo_objects if o.name not in assignments]
if unassigned: raise RuntimeError('Unclassified demo objects: '+str(unassigned))

tops=[]
for o in food.objects:
    match=re.match(r'^Food table ([012])(?:\.\d+)?$',o.name)
    if match: tops.append((int(match.group(1)),o))
tops.sort(key=lambda t:t[0])
if [i for i,_ in tops]!=[0,1,2]: raise RuntimeError('Could not identify three food table tops')
parts={i:[o] for i,o in tops}; trays={i:[] for i,_ in tops}
for o in food.objects:
    if o in [top for _,top in tops]: continue
    i,_=min(tops,key=lambda t:(t[1].location.xy-o.location.xy).length)
    if o.name.startswith('Food table leg'): parts[i].append(o)
    elif o.name.startswith('Food tray'): trays[i].append(o)
    else: raise RuntimeError('Unclassified food object: '+o.name)
for i,_ in tops:
    if len(parts[i])!=5 or len(trays[i])!=1:
        raise RuntimeError('Unexpected food table parts/trays: '+str((i,len(parts[i]),len(trays[i]))))
    add('food_table_%02d'%(i+1),'Food table %02d'%(i+1),'Table',parts[i])
    add('food_tray_%02d'%(i+1),'Food tray %02d'%(i+1),'Tray',trays[i])

add('stage_riser_01','Stage riser','Stage equipment',[o for o in stage.objects if o.name.startswith('Stage riser')])
add('stage_curtain_01','Stage backdrop curtain','Curtain',[o for o in stage.objects if o.name.startswith('Stage backdrop black curtain')])
add('stage_screen_01','Stage screen','Screen',[o for o in stage.objects if o.name.startswith('Stage screen')])
add('stage_side_curtain_01','Stage side curtain','Curtain',[o for o in architecture.objects if o.name.startswith('Stage left curtain wall')],
    'This was previously grouped with architecture, but represents a curtain.')
remaining_stage=[o.name for o in stage.objects if o.name not in assignments]
if remaining_stage: raise RuntimeError('Unclassified stage objects: '+str(remaining_stage))

# Record world matrices before parent changes; group roots have no geometry.
bpy.context.view_layer.update()
before={name:obj.matrix_world.copy() for name,obj in sources.items()}
main=bpy.data.collections.new('MOVABLE ASSETS'); scene.collection.children.link(main)
rows=[]
for key,spec in specs.items():
    sub=bpy.data.collections.new('Asset | '+spec['label']); main.children.link(sub)
    objects=spec['objects']
    if key=='photo_wall_01': anchor=next(o for o in objects if o.name.startswith('Photo backdrop'))
    elif key=='demo_table_01': anchor=next(o for o in objects if o.name.startswith('Demo table top'))
    elif key.startswith('food_table_'): anchor=next(o for o in objects if re.match(r'^Food table [012](?:\.\d+)?$',o.name))
    else: anchor=objects[0]
    pivot=anchor.matrix_world.translation.copy()
    root=bpy.data.objects.new('MOVE | '+spec['label'],None); sub.objects.link(root)
    root.location=pivot; root.empty_display_type='PLAIN_AXES'; root.empty_display_size=.12
    root['asset_id']=key; root['category']=spec['category']; root['purpose']='Move this root to move this asset as a group.'
    bpy.context.view_layer.update()
    for o in objects:
        world=before[o.name]
        for old in list(o.users_collection): old.objects.unlink(o)
        sub.objects.link(o)
        o.parent=root; o.matrix_world=world
        o['asset_id']=key
        rows.append({'asset_id':key,'asset':spec['label'],'category':spec['category'],
                     'group_root':root.name,'object':o.name,'type':o.type,'collection':sub.name})

bpy.context.view_layer.update()
errors=[]
for name,world in before.items():
    current=sources[name].matrix_world
    delta=max(abs(world[r][c]-current[r][c]) for r in range(4) for c in range(4))
    if delta>1e-5: errors.append((name,delta))
if errors: raise RuntimeError('World transforms changed: '+str(errors[:10]))

scene['movable_asset_audit']='scenes/movable-assets.csv'
scene['movable_asset_note']='Move a MOVE | root for a complete item; meshes remain separate.'
path=ROOT+'/scenes/venue-movable-assets-draft.blend'
bpy.ops.wm.save_as_mainfile(filepath=path)

csvpath=ROOT+'/scenes/movable-assets.csv'
with open(csvpath,'w',encoding='utf-8',newline='') as f:
    writer=csv.DictWriter(f,fieldnames=['asset_id','asset','category','group_root','object','type','collection'])
    writer.writeheader(); writer.writerows(rows)

mdpath=ROOT+'/scenes/MOVABLE_ASSETS.md'
with open(mdpath,'w',encoding='utf-8') as f:
    f.write('# Movable asset audit\n\n')
    f.write('Scene: `Venue - movable assets audit` in `venue-movable-assets-draft.blend`. ')
    f.write('The complete per-object inventory is [movable-assets.csv](movable-assets.csv).\n\n')
    f.write('In the Outliner, expand `%s`. Each asset has its own collection '%main.name)
    f.write('and a `MOVE | …` root. Select the root in Object mode to move or rotate the ')
    f.write('whole item; individual mesh components remain editable and separate. ')
    f.write('The plotter, printer, camera, laptop, papers and table are independent items.\n\n')
    f.write('| Asset ID | Item | Mesh objects | Notes |\n| --- | --- | ---: | --- |\n')
    for key,spec in specs.items():
        note=spec['note'].replace('|','/'); f.write('| `%s` | %s | %d | %s |\n'%(key,spec['label'],len(spec['objects']),note))
    f.write('\n**Not yet modeled:** chairs, freestanding softboxes, and food/coffee items. ')
    f.write('The food-area trays are present. The light and camera objects in the preview collection ')
    f.write('are scene helpers; the demo camera is a separately movable prop.\n\n')
    helpers=[o for o in scene.objects if o.type in {'CAMERA','LIGHT'}]
    f.write('Individually editable preview helpers: '+', '.join('`'+o.name+'`' for o in helpers)+'.\n\n')
    f.write('Architectural walls, floor, structural beams, windows and door assemblies remain ')
    f.write('separate from these assets. The stage riser, screen and curtains are treated as movable. ')
    f.write('No object positions were changed when creating the groups.\n')

result={'file':path,'audit':mdpath,'csv':csvpath,'assets':len(specs),'mesh_objects':len(rows),
        'world_transform_changes':len(errors),'groups':{k:len(v['objects']) for k,v in specs.items()}}
