"""Build the item picker data: src/items.js (names) + src/items/*.png (icons).

Sources, in priority order for each item:
  1. Hypixel SkyBlock resource pack (custom textures, e.g. Hyperion)
  2. Player-head skins from textures.minecraft.net (e.g. Crown of Avarice) -> face crop
  3. Vanilla textures from a Minecraft client jar (e.g. Griffin Feather -> feather)

Usage (needs Pillow):
  python build_items.py <NEU-REPO dir> <resource pack dir> <minecraft.jar> <skin cache dir> <app/src dir>
"""
import base64, hashlib, io, json, os, re, sys, time, urllib.request, zipfile
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

neu, pack, jar_path, cache, out = sys.argv[1:6]
jar = zipfile.ZipFile(jar_path)
jar_names = set(jar.namelist())
os.makedirs(cache, exist_ok=True)
os.makedirs(os.path.join(out, 'items'), exist_ok=True)

strip = lambda s: re.sub('§.', '', s or '').strip()


def first_frame(img):
    img = img.convert('RGBA')
    w, h = img.size
    return img.crop((0, 0, w, w)) if h > w else img  # animated strips: keep frame 1


def jar_texture(name):  # "minecraft:item/feather" or "feather"
    name = name.split(':')[-1]
    for p in ([f'assets/minecraft/textures/{name}.png'] if '/' in name else
              [f'assets/minecraft/textures/item/{name}.png', f'assets/minecraft/textures/block/{name}.png',
               f'assets/minecraft/textures/block/{name}_side.png', f'assets/minecraft/textures/block/{name}_front.png']):
        if p in jar_names:
            return first_frame(Image.open(io.BytesIO(jar.read(p))))
    return None


def pack_texture(model):  # "hypixel_skyblock:item/uncategorized/hyperion"
    path = os.path.join(pack, 'assets/hypixel_skyblock/models', model.split(':', 1)[1] + '.json')
    try:
        tex = json.load(open(path, encoding='utf-8')).get('textures', {})
    except (OSError, ValueError):
        return None
    ref = tex.get('layer0') or next(iter(tex.values()), None)
    if not ref:
        return None
    if ref.startswith('hypixel_skyblock:'):
        p = os.path.join(pack, 'assets/hypixel_skyblock/textures', ref.split(':', 1)[1] + '.png')
        return first_frame(Image.open(p)) if os.path.exists(p) else None
    return jar_texture(ref)


def leather(model, color):
    base, over = jar_texture(model), jar_texture(model + '_overlay')
    if base is None:
        return None
    r, g, b = (color >> 16) & 255, (color >> 8) & 255, color & 255
    px = base.load()
    for x in range(base.width):
        for y in range(base.height):
            v = px[x, y]
            px[x, y] = (v[0] * r // 255, v[1] * g // 255, v[2] * b // 255, v[3])
    if over is not None:
        base.alpha_composite(over)
    return base


def skin_face(hash_):
    p = os.path.join(cache, hash_ + '.png')
    if not os.path.exists(p):
        req = urllib.request.Request('https://textures.minecraft.net/texture/' + hash_, headers={'User-Agent': 'skyblock-tracker-item-builder'})
        for attempt in range(3):
            try:
                data = urllib.request.urlopen(req, timeout=20).read()
                break
            except Exception:
                time.sleep(2 * (attempt + 1))
        else:
            return None
        open(p, 'wb').write(data)
    skin = Image.open(p).convert('RGBA')
    face = skin.crop((8, 8, 16, 16))
    if skin.height >= 32:
        face.alpha_composite(skin.crop((40, 8, 48, 16)))  # hat layer
    return face


# ---- collect items
entries, heads = [], {}
for f in sorted(os.listdir(neu)):
    try:
        j = json.load(open(os.path.join(neu, f), encoding='utf-8'))
    except (OSError, ValueError):
        continue
    iid, name, nbt = j.get('internalname', ''), strip(j.get('displayname')), j.get('nbttag', '')
    if not name or re.search(r'_(NPC|MONSTER|MOB|BOSS)$', iid):
        continue
    name = re.sub(r'^\[Lvl \{LVL\}\] (.*)$', r'\1 Pet', name)
    model = (re.search(r'ItemModel:"([^"]+)"', nbt) or [None, ''])[1]
    e = {'id': iid, 'name': name, 'model': model}
    if not model.startswith('hypixel_skyblock:') and 'SkullOwner' in nbt:
        v = re.search(r'Value:"([A-Za-z0-9+/=]+)"', nbt)
        if v:
            h = re.search(r'textures\.minecraft\.net/texture/(\w+)', base64.b64decode(v[1] + '==').decode('utf-8', 'ignore'))
            if h:
                e['skin'] = h[1]
                heads[h[1]] = None
    c = re.search(r'color:(\d+)', nbt)
    if c:
        e['color'] = int(c[1])
    entries.append(e)

print(f'{len(entries)} items, downloading {len(heads)} head skins (cached in {cache})...', flush=True)
with ThreadPoolExecutor(6) as pool:  # a few at a time, it's a public CDN
    for h, img in zip(heads, pool.map(skin_face, heads)):
        heads[h] = img

# ---- render, dedupe images by content
seen_names, rows, written, missing = set(), [], {}, 0
for e in entries:
    if e['name'].lower() in seen_names:
        continue
    m = e['model']
    if m.startswith('hypixel_skyblock:'):
        img = pack_texture(m)
    elif 'skin' in e:
        img = heads[e['skin']]
    elif 'color' in e and 'leather' in m:
        img = leather(m.split(':')[-1], e['color'])
    else:
        img = jar_texture(m) if m else None
    file = ''
    if img is not None:
        buf = io.BytesIO()
        img.save(buf, 'PNG', optimize=True)
        digest = hashlib.sha1(buf.getvalue()).hexdigest()[:12]
        file = digest + '.png'
        if digest not in written:
            open(os.path.join(out, 'items', file), 'wb').write(buf.getvalue())
            written[digest] = 1
    else:
        missing += 1
    seen_names.add(e['name'].lower())
    rows.append([e['name'], file])

rows.sort(key=lambda r: r[0].lower())
with open(os.path.join(out, 'items.js'), 'w', encoding='utf-8') as fh:
    fh.write('// Item picker data: [name, icon file in items/ ("" = none)].\n')
    fh.write('// Generated by tools/build_items.py from NEU-REPO, the Hypixel SkyBlock pack, Minecraft textures and player-head skins.\n')
    fh.write('const ITEMS = ' + json.dumps(rows, ensure_ascii=False, separators=(',', ':')) + ';\n')
print(f'{len(rows)} items, {len(written)} unique icons, {missing} without icon')
