"""Local preview plus a loopback-only browser snapshot import form."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs
from html import escape
from threading import Lock
import argparse, json, re

ROOT = Path(__file__).resolve().parents[1]
SNAPSHOT_LOCK = Lock()

def save_snapshot(payload, root=ROOT):
    """Merge independently collected article batches without discarding prior work."""
    with SNAPSHOT_LOCK:
        return write_snapshot(payload, root)

def write_snapshot(payload, root):
    if not isinstance(payload, dict) or payload.get('kind') not in ['items', 'sets', 'articles', 'achievements']:
        raise ValueError('Invalid snapshot kind')
    kind = payload['kind']
    entries = payload.get('entries')
    if not isinstance(entries, list) or not all(isinstance(e, dict) for e in entries):
        raise ValueError('Invalid entries')
    if not re.fullmatch(r'\d{4}-\d{2}-\d{2}', str(payload.get('date', ''))):
        raise ValueError('Invalid date')
    path = root / 'data/raw' / (kind + '.json')
    if kind in ['articles', 'achievements']:
        field = 'key' if kind == 'articles' else 'id'
        def key(entry):
            value = entry.get(field)
            if kind == 'articles' and not re.fullmatch(r'[CTKS]\d+', str(value)):
                raise ValueError('Invalid article key')
            if kind == 'achievements' and (type(value) is not int or not 0 < value < 10000):
                raise ValueError('Invalid achievement ID')
            return value
        previous = json.loads(path.read_text()) if path.exists() else {'entries': []}
        merged = {key(e): e for e in previous['entries']}
        merged.update((key(e), e) for e in entries)
        payload = {**payload, 'entries': list(merged.values())}
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(payload, ensure_ascii=False, indent=2))
    temporary.replace(path)
    return len(payload['entries'])

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'web'), **kwargs)

    def do_GET(self):
        if self.path in ['/import', '/collect']:
            data = json.loads((ROOT / 'web/data.json').read_text())
            targets = escape(json.dumps([{'key': e['key'], 'source': e['source']} for e in data['entries']], ensure_ascii=False))
            body = ('<!doctype html><meta charset="utf-8"><title>Local Wiki Import</title><h1>本地资料导入</h1>'
                f'<label>文章目标<textarea id="targets" rows="4" cols="80" readonly>{targets}</textarea></label>'
                '<form method="post" action="/import"><label>数据 JSON<textarea name="data" rows="12" cols="80"></textarea></label><button>保存快照</button></form>').encode()
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers(); self.wfile.write(body)
        else: super().do_GET()

    def do_POST(self):
        if self.path != '/import': self.send_error(404); return
        try: size = int(self.headers.get('Content-Length', '0'))
        except ValueError: self.send_error(400); return
        if size <= 0 or size > 100_000_000: self.send_error(413); return
        try:
            payload = json.loads(parse_qs(self.rfile.read(size).decode())['data'][0])
            total = save_snapshot(payload)
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers()
            self.wfile.write(f'<h1>已导入 {len(payload["entries"])} 条，本地共 {total} 条记录</h1><a href="/collect">继续导入</a>'.encode())
        except (ValueError, KeyError, TypeError, UnicodeError): self.send_error(400)

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--port', type=int, default=8765)
    args = parser.parse_args()
    print(f'Preview: http://127.0.0.1:{args.port}', flush=True)
    ThreadingHTTPServer(('127.0.0.1',args.port),Handler).serve_forever()
