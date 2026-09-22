"""Normalize the preserved Huijiwiki Repentance+ snapshots. No live scraping."""
import json, re, urllib.request
from pathlib import Path
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]
SPRITES = {'Collectibles': 'collectibles', 'Trinket': 'trinkets', 'Cards': 'cards', 'Runes': 'runes'}
PREFIX = {'passive': 'C', 'active': 'C', 'trinket': 'T', 'card': 'K'}

def clean(html):
    soup = BeautifulSoup(html, 'html.parser')
    for n in soup.select('.dif-cell'):
        if not {'dif-rp', 'dif-rpp'}.intersection(n.get('class', [])): n.decompose()
    for n in soup.select('script,style,svg,.mw-editsection'): n.decompose()
    return soup

def text(n):
    if n is None: return ''
    return re.sub(r'\s+', ' ', n.get_text('', strip=False)).strip()

def main():
    raw = json.loads((ROOT/'data/raw/items.json').read_text())
    entries = []
    for e in raw['entries']:
        e = dict(e)
        e['key'] = PREFIX[e['category']] + str(e['id'])
        e['quality'] = {None: 0, 'I': 1, 'II': 2, 'III': 3, 'IV': 4}[e.get('quality')] if e['category'] in ('passive','active') else None
        sprite = next(v for k,v in SPRITES.items() if k+'_sprite' in e['icon']['url'])
        e['icon'] = {'file': 'assets/'+sprite+'.png', 'position': e['icon']['position']}
        e['aliases'] = []
        entries.append(e)
    for i, s in enumerate(json.loads((ROOT/'data/raw/sets.json').read_text())['entries'], 1):
        sections = {a['title']: clean(a['html']) for a in s['sections']}
        effect_list = sections['效果'].find('ul', recursive=False)
        effects = [text(n) for n in effect_list.find_all('li', recursive=False)] if effect_list else []
        if not effects: effects = [text(sections['效果'])]
        related = sections['相关物品']
        components = {}
        for a in related.select('a[href]'):
            m = re.fullmatch(r'/wiki/([CTKP]\d+)',a['href'])
            if m and text(a):
                components[m[1]] = {'key': m[1], 'name': text(a), 'source': 'https://isaac.huijiwiki.com'+a['href']}
        for table in related.select('table'): table.decompose()
        title = s['title'].splitlines()
        image = None
        if s.get('image'):
            ext = '.gif' if s['image'].endswith('.gif') else '.png'
            image = f'assets/set-{i}{ext}'
            path = ROOT/'web'/image
            if not path.exists():
                with urllib.request.urlopen(s['image'],timeout=30) as response: path.write_bytes(response.read())
        entries.append({'key': f'S{i}', 'id': None, 'category':'set', 'name':title[0], 'en': title[-1],
            'aliases':[s['name']], 'quote':s['name'], 'effect':'\n'.join(effects), 'effects':effects,
            'condition':text(related), 'components':list(components.values()), 'source':s['url'],
            'quality':None, 'tags':[], 'image':image,
            'icon':next(e['icon'] for e in entries if e['key']=='C302') if not image else None})
    entries.sort(key=lambda e: ({'active':0,'passive':1,'card':2,'set':3,'trinket':4}[e['category']],e['id'] or int(e['key'][1:])))
    counts = {c:sum(e['category']==c for e in entries) for c in ['active','passive','card','set','trinket']}
    assert counts=={'active':170,'passive':551,'card':97,'set':16,'trinket':188},counts
    assert len({e['key'] for e in entries})==len(entries)
    assert all(e['name'] and e['effect'] and e['source'] for e in entries)
    data = {'schemaVersion':1,'gameVersion':'Repentance+','snapshotDate':raw['date'], 'counts':counts,
        'source':'以撒的结合中文维基 · 灰机wiki','entries':entries}
    encoded = json.dumps(data, ensure_ascii=False, separators=(',',':'))
    (ROOT/'web/data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2))
    (ROOT/'web/data.js').write_text('window.ISAAC_DATA = '+encoded+';\n')
    print('Built:',counts,'total',len(entries))

if __name__=='__main__': main()
