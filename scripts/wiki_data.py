"""Convert preserved Wiki articles to a small, offline-safe HTML vocabulary."""
import re
from urllib.parse import unquote, urljoin, urlparse
from bs4 import BeautifulSoup, Comment, NavigableString

WIKI = 'https://isaac.huijiwiki.com'
VERSIONS = ['dif-rb', 'dif-ab', 'dif-abp', 'dif-rp', 'dif-rpp']
VERSION_NAMES = ['重生', '胎衣', '胎衣†', '忏悔', '忏悔+']
HEART_LABELS = {'Red 0': '空心之容器', 'Red 1': '半颗红心', 'Red 2': '红心',
    'Soul 1': '半颗魂心', 'Soul 2': '魂心', 'Black 1': '半颗黑心', 'Black 2': '黑心',
    'Eternal Left': '永恒之心', 'Eternal Right': '永恒之心', 'Rotten': '腐心',
    'Bone 0': '空骨心', 'Bone 1': '半满骨心', 'Bone 2': '骨心', 'Broken': '碎心'}
ALLOWED = {'p', 'ul', 'ol', 'li', 'div', 'span', 'b', 'strong', 'i', 'em', 's', 'del',
    'sup', 'sub', 'blockquote', 'pre', 'code', 'table', 'thead', 'tbody', 'tfoot',
    'tr', 'th', 'td', 'caption', 'br', 'hr', 'a', 'small', 'h3', 'h4', 'h5', 'h6',
    'dl', 'dt', 'dd', 'ruby', 'rt', 'rp'}

def plain(value):
    if value is None: return ''
    return re.sub(r'\s+', ' ', value.get_text(' ', strip=True)).strip()

def normalize_versions(soup, issues=None):
    """Each .dif is a set of alternatives; select the newest available branch."""
    issues = issues if issues is not None else []
    parents, seen = [], set()
    for cell in soup.select('.dif-cell'):
        identity = id(cell.parent)
        if identity not in seen:
            seen.add(identity)
            parents.append(cell.parent)
    for parent in parents:
        cells = parent.find_all(class_='dif-cell', recursive=False)
        if not cells: continue
        def rank(node):
            value = max((VERSIONS.index(v) for v in node.get('class', []) if v in VERSIONS), default=-1)
            for badge in node.find_all(title=True):
                if badge.find_parent(class_='dif-cell') is not node: continue
                title = badge['title']
                removed = re.search(r'在(.+?)版本被移除', title)
                if removed and removed[1] in VERSION_NAMES:
                    cutoff = VERSION_NAMES.index(removed[1]) - 1
                    value = min(value, cutoff) if value >= 0 else cutoff
                elif value < 0:
                    introduced = next((i for i, name in reversed(list(enumerate(VERSION_NAMES))) if title.startswith(name + '，') or title == name + '新增'), -1)
                    value = introduced
            return value
        ranked = [(rank(node), node) for node in cells]
        rank = max(r for r, _ in ranked)
        if rank < 0:
            # .dif is also used for ordinary side-by-side cases such as damage
            # thresholds or keyboard actions. Without version markers, keep all.
            if not any(any(v.startswith('dif-') and v != 'dif-cell' for v in node.get('class', [])) or node.find(title=re.compile('版本|新增')) for node in cells):
                continue
            issues.append('无法识别的版本分支，未纳入离线正文')
            for _, node in ranked: node.decompose()
            continue
        selected = [node for r, node in ranked if r == rank]
        if len(selected) > 1: issues.append('同一版本有多个并列分支，保留原文供核对')
        for r, node in ranked:
            if r != rank: node.decompose()
    return soup

def math_text(node):
    if isinstance(node, NavigableString): return str(node)
    children = [math_text(n) for n in node.children if not (isinstance(n, NavigableString) and not n.strip())]
    if node.name == 'mfrac' and len(children) == 2: return '(' + children[0] + ')/(' + children[1] + ')'
    if node.name in ['msup', 'msub'] and len(children) == 2:
        return children[0] + ('^' if node.name == 'msup' else '_') + '(' + children[1] + ')'
    if node.name == 'msqrt': return '√(' + ''.join(children) + ')'
    return ''.join(children)

class WikiHTML:
    def __init__(self, entries, achievement_ids=()):
        self.keys = {e['key'] for e in entries} | {'A' + str(n) for n in achievement_ids}
        self.labels = {e['key']: e['name'] for e in entries}
        self.names = {}
        aliases = {}
        for entry in entries:
            path = unquote(urlparse(entry['source']).path)
            self.names[path.removeprefix('/wiki/')] = entry['key']
            for alias in [entry['name']] + entry.get('aliases', []): aliases.setdefault(alias, set()).add(entry['key'])
        for alias, keys in aliases.items():
            if len(keys) == 1 and alias not in self.names: self.names[alias] = next(iter(keys))

    def local_key(self, href):
        if not isinstance(href, str): return None
        if href.startswith('#') and href[1:] in self.keys: return href[1:]
        url = urlparse(urljoin(WIKI, href))
        if url.hostname != 'isaac.huijiwiki.com': return None
        title = unquote(url.path).removeprefix('/wiki/').replace('_', ' ')
        achievement = re.fullmatch(r'成就/(\d+)', title)
        key = 'A' + str(int(achievement[1])) if achievement else title.upper()
        if key in self.keys: return key
        return self.names.get(title)

    def infobox(self, html, source, issues):
        soup = BeautifulSoup(html or '', 'html.parser')
        for node in soup.select('.chara-target-tabs,.collectiblepos'):
            node.decompose()
        for node in list(soup.find_all(style=True)):
            if node.parent and 'position:absolute' in node.get('style', '').replace(' ', ''): node.decompose()
        for row in soup.select('tr'):
            if plain(row) == '角色形象': row.decompose()
        # The Wiki renders pool membership as colored cells. Preserve the current
        # links as readable text instead of copying five historical color columns.
        for table in reversed(soup.find_all('table')):
            heading = plain(table.find('tr'))
            if '重生' not in heading or '忏悔+' not in heading: continue
            links = [a for a in table.select('a[href]') if '/道具池/' in unquote(a['href'])]
            if not links: continue
            if not any('忏悔+' in unquote(a['href']) for a in links): continue
            current = [a for a in links if '/道具池/忏悔+/' in unquote(a['href'])]
            if not current: continue
            paragraph = soup.new_tag('p')
            for index, link in enumerate(current):
                if index: paragraph.append('、')
                anchor = soup.new_tag('a', href=link['href'])
                anchor.string = unquote(link['href']).split('/')[-1]
                paragraph.append(anchor)
            table.replace_with(paragraph)
        return self.sanitize(str(soup), source, issues)

    def sanitize(self, html, source=WIKI, issues=None):
        issues = issues if issues is not None else []
        soup = BeautifulSoup(html or '', 'html.parser')
        for navigation in list(soup.select('.box-outer')):
            if navigation.parent: navigation.decompose()
        for navigation in list(soup.select('.navbox,.navbox-inner,.tnavbar,.mw-collapsible-toggle,nav,[role="navigation"],.catlinks,.printfooter')):
            if navigation.parent: navigation.decompose()
        normalize_versions(soup, issues)
        for badge in list(soup.find_all(title=re.compile('在.+版本被移除的特性'))):
            if not badge.parent: continue
            removed = re.search(r'在(.+?)版本被移除', badge['title'])
            cutoff = VERSION_NAMES.index(removed[1]) if removed and removed[1] in VERSION_NAMES else len(VERSION_NAMES)
            siblings = list(badge.next_siblings)
            replacement = next((n for n in siblings if not isinstance(n, NavigableString) and
                any(n.get('title', '').startswith(name + '，') for name in VERSION_NAMES[cutoff:])), None)
            if replacement is not None:
                # Some older templates use badge / badge within a single li,
                # rather than wrapping the alternatives in .dif-cell elements.
                for node in [badge] + siblings:
                    if node is replacement: break
                    node.extract()
                continue
            block = badge.find_parent(['li', 'p'])
            prefix = ''.join(str(n) if isinstance(n, NavigableString) else n.get_text('', strip=True) for n in badge.previous_siblings).strip()
            if block and not prefix:
                block.decompose()
            elif siblings and not isinstance(siblings[0], NavigableString) and 'item' in siblings[0].get('class', []):
                # An explicitly removed inline item is a bounded fragment (for
                # example the old Mr. Boom prerequisite of achievement 268).
                previous = badge.previous_sibling
                if isinstance(previous, NavigableString):
                    previous.replace_with(re.sub(r'[和及或、/]\s*$', '', str(previous)))
                siblings[0].decompose()
                badge.decompose()
            else:
                issues.append('含已移除特性的混合内容，保留版本标记供核对')
        for node in soup.find_all(string=lambda n: isinstance(n, Comment)): node.extract()
        for node in soup.select('script,style,svg,iframe,object,embed,form,input,button,select,textarea,video,audio,canvas,.mw-editsection,.noprint,.navbox,.toc,.reference,.anm2player,.chara-target-tabs,.anm2-tab-group-select-panel-container'):
            if node.parent: node.decompose()
        for node in list(soup.find_all(style=True)):
            if node.parent and re.search(r'display\s*:\s*none', node.get('style', ''), re.I): node.decompose()
        for node in list(soup.select('mjx-container')):
            if not node.parent: continue
            formula = node.find('math')
            node.replace_with(NavigableString(math_text(formula) if formula else node.get_text('', strip=True)))
        for node in list(soup.find_all('math')):
            node.replace_with(NavigableString(math_text(node)))
        for node in list(soup.find_all(string=True)):
            if '\\(' not in node and '\\[' not in node: continue
            def variable(match):
                value = (match[1] or match[2]).strip()
                if re.fullmatch(r'[A-Za-z]+(?:_\{[^{}]+\})?', value):
                    return re.sub(r'_\{([^{}]+)\}', r'_(\1)', value)
                issues.append('保留未转换的原始公式，请结合原文核对')
                return match[0]
            node.replace_with(NavigableString(re.sub(r'\\\((.*?)\\\)|\\\[(.*?)\\\]', variable, str(node), flags=re.S)))
        for white in list(soup.find_all('img', alt=re.compile(r'^Health Eternal (?:Left|Right)\.png$'))):
            if white.parent and white.parent.parent:
                heart = white.parent.parent
                if heart.parent and heart.find('img', alt='Health Red 0.png'):
                    heart.replace_with(NavigableString('〔永恒之心〕'))
        for image in list(soup.find_all('img')):
            label = image.get('alt', '').strip()
            if label.startswith('DLC'):
                title = image.parent.get('title', '') if image.parent else ''
                # Version badges are represented as text; no remote images remain.
                label = title if title else ''
            elif re.search(r'\.(?:png|jpe?g|gif|webp)$', label, re.I):
                heart = re.fullmatch(r'Health (.+)\.png', label)
                anchor = image.find_parent('a')
                link_title = anchor.get('title', '') if anchor else ''
                label = HEART_LABELS.get(heart[1], '') if heart else ''
                if not label and link_title and not link_title.startswith(('文件:', 'File:', '帮助:')) and not plain(anchor):
                    label = link_title
            elif image.get('width') == '1' and image.get('height') == '1':
                label = ''
            if image.parent and image.parent.name == 'a':
                sibling = image.parent.find_next_sibling('a')
                if sibling and sibling.get('href') == image.parent.get('href') and plain(sibling): label = ''
            image.replace_with(NavigableString('〔' + label + '〕' if label else ''))
        for node in list(soup.find_all(True)):
            if not node.parent: continue
            if node.name not in ALLOWED:
                node.unwrap()
                continue
            attrs = {}
            if node.name == 'a':
                href = node.get('href', '')
                key = self.local_key(href)
                absolute = urljoin(source, href)
                if key:
                    attrs['href'] = '#' + key
                    if not plain(node):
                        duplicated = any(a is not node and plain(a) and self.local_key(a.get('href', '')) == key for a in node.parent.find_all('a'))
                        if not duplicated: node.string = self.labels.get(key, '成就 ' + key[1:])
                elif href and urlparse(absolute).scheme in ['https', 'http']: attrs['href'] = absolute
                if node.get('title'): attrs['title'] = node['title'][:200]
            elif node.name in ['td', 'th']:
                for field in ['colspan', 'rowspan']:
                    value = str(node.get(field, ''))
                    if value.isdigit() and 1 <= int(value) <= 100: attrs[field] = value
            node.attrs = attrs
        # Empty sprite anchors and layout wrappers carry no readable article content.
        for node in reversed(list(soup.find_all(['a', 'span', 'div', 'p', 'li', 'table', 'tr']))):
            if node.parent and not node.get_text(strip=True) and not node.find(['br', 'table', 'ul', 'ol']): node.decompose()
        return ''.join(str(n) for n in soup.contents).strip()

    def keys_in(self, html):
        return list(dict.fromkeys(key for a in BeautifulSoup(html or '', 'html.parser').select('a[href]') if (key := self.local_key(a['href']))))

def load_achievements(raw, renderer):
    result = []
    for entry in sorted(raw.get('entries', []), key=lambda e: e['id']):
        issue = []
        parts = {field: renderer.sanitize(entry.get(field + 'Html', ''), issues=issue) for field in ['name', 'description', 'condition', 'reward']}
        names = BeautifulSoup(parts['name'], 'html.parser').get_text('\n', strip=True).splitlines()
        name = names[0] if names else '成就 ' + str(entry['id'])
        en = ' '.join(names[1:])
        key = 'A' + str(entry['id'])
        renderer.labels[key] = name
        reward_keys = [k for k in renderer.keys_in(parts['reward']) if not k.startswith('A')]
        related_keys = [k for k in renderer.keys_in(parts['condition']) if not k.startswith('A') and k not in reward_keys]
        achievement = {'key': key, 'id': entry['id'], 'name': name, 'en': en,
            'version': entry.get('version', ''), 'source': WIKI + '/wiki/成就/' + str(entry['id']),
            'date': raw.get('date'), 'rewardKeys': reward_keys, 'relatedKeys': related_keys}
        for field in ['description', 'condition', 'reward']:
            achievement[field] = plain(BeautifulSoup(parts[field], 'html.parser'))
            achievement[field + 'Html'] = parts[field]
        if not achievement['condition']: issue.append('源站快照未提供解锁条件')
        if entry.get('icon'):
            icon = entry['icon']
            position = icon.get('position', '')
            width, height = str(icon.get('width', 64)).removesuffix('px'), str(icon.get('height', 64)).removesuffix('px')
            if re.fullmatch(r'-?\d+(?:\.\d+)?px -?\d+(?:\.\d+)?px', position) and width == '64' and height == '64':
                achievement['icon'] = {'file': 'assets/achievements.jpg', 'position': position, 'width': 64, 'height': 64}
        if issue: achievement['issues'] = list(dict.fromkeys(issue))
        result.append(achievement)
    return result

def enrich(entries, raw_articles, raw_achievements):
    renderer = WikiHTML(entries, (e['id'] for e in raw_achievements.get('entries', [])))
    achievements = load_achievements(raw_achievements, renderer)
    by_key = {e['key']: e for e in entries}
    articles = {e['key']: e for e in raw_articles.get('entries', [])}
    for entry in entries:
        entry['unlockAchievements'] = []
        entry['relatedAchievements'] = []
        article = articles.get(entry['key'])
        if not article: continue
        issues, sections = [], []
        infobox = renderer.infobox(article.get('infoboxHtml', ''), entry['source'], issues)
        if plain(BeautifulSoup(infobox, 'html.parser')): sections.append({'title': '详细资料', 'html': infobox})
        for section in article.get('sections', []):
            title = plain(BeautifulSoup(section.get('title', ''), 'html.parser'))
            html = renderer.sanitize(section.get('html', ''), entry['source'], issues)
            if title and plain(BeautifulSoup(html, 'html.parser')): sections.append({'title': title, 'html': html})
        entry['wiki'] = {'date': raw_articles.get('date'), 'sections': sections}
        if issues: entry['wiki']['issues'] = list(dict.fromkeys(issues))
        for section in sections:
            entry['relatedAchievements'].extend(k for k in renderer.keys_in(section['html']) if k.startswith('A'))
    for achievement in achievements:
        for key in achievement['rewardKeys']: by_key[key]['unlockAchievements'].append(achievement['key'])
        for key in achievement['relatedKeys']: by_key[key]['relatedAchievements'].append(achievement['key'])
    for entry in entries:
        entry['unlockAchievements'] = list(dict.fromkeys(entry['unlockAchievements']))
        entry['relatedAchievements'] = [k for k in dict.fromkeys(entry['relatedAchievements']) if k not in entry['unlockAchievements']]
    achievement_by_key = {a['key']: a for a in achievements}
    for entry in entries:
        for key in entry['relatedAchievements']:
            related = achievement_by_key[key]['relatedKeys']
            if entry['key'] not in related: related.append(entry['key'])
    return achievements
