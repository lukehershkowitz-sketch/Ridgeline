# Converts the Stark Temper .blend set into a game-ready GLB split into rig parts.
# Usage: python export_bike.py <main.blend> <out.glb>
import bpy, bmesh, sys, math, json
from mathutils import Vector, Matrix

SRC, OUT = sys.argv[1], sys.argv[2]
WHEEL_R_GAME = 0.37          # game physics wheel radius
SEAT_DROP = 0.17             # metres (model units) to slam the seat post
TARGET_TRIS = {'frame': 17000, 'front': 12000, 'wheelF': 8000, 'wheelR': 8000, 'crank': 3000, 'pedalL': 700, 'pedalR': 700}
CRANK = {'Circle.034', 'Circle.023', 'Circle.033', 'Circle.022', 'Circle.024', 'Circle.026', 'Circle.027', 'Circle.016', 'Circle.032', 'Circle.031', 'Circle.029'}
PALETTE = ['paint', 'black', 'rubber', 'silver', 'darkMetal', 'saddle', 'white', 'amber', 'red']

def palette_for(name):
    n = name.lower()
    if 'yellow' in n: return 'amber'
    if 'red-plastic' in n: return 'red'
    if 'frame-blue' in n or 's-logo' in n: return 'paint'
    if 'tire' in n or 'rubber' in n or 'grips' in n or 'brake-pads' in n: return 'rubber'
    if 'saddle' in n: return 'saddle'
    if 'white' in n or 'light-grey' in n or 'clear' in n: return 'white'
    if 'chain' in n and 'ring' not in n: return 'darkMetal'
    if 'dark' in n and 'metal' in n: return 'darkMetal'
    if 'metal-darker' in n or 'derailleur' in n or 'sprocket' in n or 'shimano-mf' in n: return 'darkMetal'
    for k in ('chrome', 'metal', 'alumin', 'silver', 'chainring', 'braking-surface', 'pins', 'screw', 'hub', 'quick-release', 'washer', 'brass', 'spring', 'weld', 'spoke', 'cable-caps'):
        if k in n:
            return 'paint' if 'frame-weld' in n else 'silver'
    return 'black'

bpy.ops.wm.open_mainfile(filepath=SRC)
scene = bpy.context.scene

# Slam the seat post down its tube so the rider can stand over the saddle.
seat = bpy.data.objects['stark-temper-seat']
seat_axis = Vector((0, -0.17, 0.43)).normalized()   # seat tube direction (up/back), measured from the frame
seat.location = seat.location - seat_axis * SEAT_DROP

# Chain: the linked chain is 45k triangles of individual links; use a thin band along its path instead.
for o in bpy.data.objects:
    if o.name == 'chain-curve' and o.type == 'CURVE':
        o.data.bevel_depth = 0.0045; o.data.bevel_resolution = 0; o.data.fill_mode = 'FULL'; o.data.resolution_u = 3
        o.hide_render = False; o.hide_viewport = False

bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get()

def bbox(me, M):
    mn = Vector((1e9,) * 3); mx = Vector((-1e9,) * 3)
    for v in me.vertices:
        p = M @ v.co
        for k in range(3): mn[k] = min(mn[k], p[k]); mx[k] = max(mx[k], p[k])
    return mn, mx

# Pass 1: gather instances in model space and find reference points.
items = []; ref = {}
for inst in dg.object_instances:
    o = inst.object
    if o.type not in ('MESH', 'CURVE'): continue
    top = inst.parent.name if inst.is_instance and inst.parent else None
    if top is None or 'cables' in top: continue
    name = o.original.name
    if o.type == 'CURVE' and name != 'chain-curve': continue
    if name in ('chain-outer-link', 'chain-inner-link'): continue
    me = o.to_mesh()
    if not me or not len(me.polygons): o.to_mesh_clear(); continue
    me = me.copy(); o.to_mesh_clear()
    M = inst.matrix_world.copy()
    mn, mx = bbox(me, M)
    slots = [s.material.name if s.material else 'black' for s in o.material_slots] or ['black']
    if name == 'chain-curve': slots = ['chain']
    items.append(dict(name=name, top=top, me=me, M=M, mn=mn, mx=mx, slots=slots))
    c = (mn + mx) / 2
    if 'kenda-tire' in name: ref['axleR' if 'rear' in top else 'axleF'] = c
    if top.endswith('drivetrain') and name == 'Circle.032': ref['bb'] = c
    if top.endswith('drivetrain') and name == 'Plane.008': ref['pedalA'] = c
    if top.endswith('drivetrain') and name == 'Plane.007': ref['pedalB'] = c
    if top.endswith('handlebar') and name in ('Plane.019', 'Plane.018'): ref['grip+' if c.x > 0 else 'grip-'] = c
    if top.endswith('seat') and name == 'Plane': ref['saddle'] = Vector((0, (mn.y + mx.y) / 2, mx.z))
    if top.endswith('frame') and name == 'front-tube':
        pts = [M @ v.co for v in me.vertices]
        cen = sum(pts, Vector()) / len(pts)
        # principal axis of the head tube
        cov = Matrix(((0,) * 3,) * 3)
        for p in pts:
            d = p - cen
            for i in range(3):
                for j in range(3): cov[i][j] += d[i] * d[j]
        ax = Vector((0, -0.3, 1)).normalized()
        for _ in range(60): ax = (cov @ ax).normalized()
        if ax.z < 0: ax = -ax
        ts = [(p - cen).dot(ax) for p in pts]
        ref['steerTop'] = cen + ax * max(ts); ref['steerBot'] = cen + ax * min(ts)

print('REF', {k: tuple(round(x, 4) for x in v) for k, v in ref.items()})
wheel_r = (ref['axleR'].z)  # tyre rests on z = 0
s = WHEEL_R_GAME / wheel_r
mid_y = (ref['axleR'].y + ref['axleF'].y) / 2
# Model space (x right, y forward, z up) -> export space, such that after the glTF
# Y-up conversion the bike faces +Z with +X to its left, wheels on y = 0, centred near z = 0.01.
G = Matrix.Translation((0, 0.01, 0)) @ Matrix.Rotation(math.pi, 4, 'Z') @ Matrix.Scale(s, 4) @ Matrix.Translation((0, -mid_y, 0))
# (rotation about Z flips x and y: forward becomes -Y in Blender, which exports as +Z)
P = {k: (G @ v) for k, v in ref.items()}

def part_of(it):
    top, name = it['top'], it['name']
    if 'rear-wheel' in top: return 'wheelR'
    if 'front-wheel' in top: return 'wheelF'
    if top.endswith('handlebar') or top.endswith('fork'): return 'front'
    if top.startswith('v-brakes'): return 'front' if (it['mn'].y + it['mx'].y) / 2 > mid_y else 'frame'
    if top.endswith('drivetrain'):
        if name in CRANK: return 'crank'
        if name == 'Plane.008': return 'pedalA'
        if name == 'Plane.007': return 'pedalB'
    return 'frame'

pedal_names = {}
for k in ('pedalA', 'pedalB'): pedal_names[k] = 'pedalL' if P[k].x > 0 else 'pedalR'
pivots = {'frame': Vector((0, 0, 0)), 'front': P['steerTop'], 'wheelF': P['axleF'], 'wheelR': P['axleR'],
          'crank': Vector((0, P['bb'].y, P['bb'].z)), pedal_names['pedalA']: P['pedalA'], pedal_names['pedalB']: P['pedalB']}

mats = {}
for n in PALETTE:
    m = bpy.data.materials.new(n); mats[n] = m

bms = {k: bmesh.new() for k in pivots}
skipped = 0
for it in items:
    if (it['mx'] - it['mn']).length * s < 0.016: skipped += 1; continue
    part = part_of(it); part = pedal_names.get(part, part)
    me = it['me']; M = G @ it['M']
    remap = [PALETTE.index(palette_for(n)) for n in it['slots']]
    for p in me.polygons: p.material_index = remap[min(p.material_index, len(remap) - 1)]
    me.transform(Matrix.Translation(-pivots[part]) @ M)
    if M.determinant() < 0: me.flip_normals()
    bms[part].from_mesh(me)
print('skipped tiny parts:', skipped)

for o in list(bpy.data.objects): bpy.data.objects.remove(o)
col = scene.collection
stats = {}
for part, bm in bms.items():
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=2e-5)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    me = bpy.data.meshes.new(part); bm.to_mesh(me); bm.free()
    for n in PALETTE: me.materials.append(mats[n])
    ob = bpy.data.objects.new(part, me); col.objects.link(ob); ob.location = pivots[part]
    before = len(me.polygons)
    ratio = min(1, TARGET_TRIS[part] / max(1, before))
    if ratio < 1:
        mod = ob.modifiers.new('dec', 'DECIMATE'); mod.ratio = ratio
        bpy.context.view_layer.update()
        ev = ob.evaluated_get(bpy.context.evaluated_depsgraph_get())
        new = bpy.data.meshes.new_from_object(ev)
        ob.modifiers.clear(); ob.data = new; me = new
    # smooth shading with hard edges kept where the surface really turns
    bm = bmesh.new(); bm.from_mesh(me)
    for f in bm.faces: f.smooth = True
    for e in bm.edges:
        e.smooth = not (len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(38))
    bm.to_mesh(me); bm.free()
    stats[part] = (before, len(me.polygons))
print('TRIS', stats, 'total', sum(v[1] for v in stats.values()))

P['axleFront'] = P['axleF']; P['axleRear'] = P['axleR']
P[pedal_names['pedalA'] + 'Pivot'] = P['pedalA']; P[pedal_names['pedalB'] + 'Pivot'] = P['pedalB']
for name in ('steerTop', 'steerBot', 'saddle', 'bb', 'axleFront', 'axleRear', 'pedalLPivot', 'pedalRPivot'):
    e = bpy.data.objects.new(name, None); e.location = P[name]; col.objects.link(e)
for src, name in (('grip+', 'gripL'), ('grip-', 'gripR')):
    # after the half-turn about Z, model +x (rider's right) is export -x
    e = bpy.data.objects.new('gripL' if P[src].x > 0 else 'gripR', None); e.location = P[src]; col.objects.link(e)

bpy.ops.export_scene.gltf(filepath=OUT, export_format='GLB', export_yup=True, export_texcoords=False,
                          export_normals=True, export_materials='EXPORT', export_apply=False,
                          export_animations=False, export_cameras=False, export_lights=False)
print('POINTS(export space, z-up)', {k: tuple(round(x, 4) for x in v) for k, v in P.items()}, 'scale', round(s, 4))
