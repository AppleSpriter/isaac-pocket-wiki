"""Local preview plus a loopback-only browser snapshot import form."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import parse_qs
import json

ROOT = Path(__file__).resolve().parents[1]

class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT / 'web'), **kwargs)

    def do_GET(self):
        if self.path == '/import':
            body = '<!doctype html><meta charset="utf-8"><title>Local Wiki Import</title><h1>本地资料导入</h1><form method="post" action="/import"><label>数据 JSON<textarea name="data" rows="12" cols="80"></textarea></label><button>保存快照</button></form>'.encode()
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers(); self.wfile.write(body)
        else: super().do_GET()

    def do_POST(self):
        if self.path != '/import': self.send_error(404); return
        size = int(self.headers.get('Content-Length', '0'))
        if size > 10_000_000: self.send_error(413); return
        try:
            payload = json.loads(parse_qs(self.rfile.read(size).decode())['data'][0])
            if not isinstance(payload, dict) or payload.get('kind') not in ['items','sets']: raise ValueError('Invalid snapshot')
            (ROOT / 'data/raw' / (payload['kind'] + '.json')).write_text(json.dumps(payload,ensure_ascii=False,indent=2))
            self.send_response(200); self.send_header('Content-Type','text/html; charset=utf-8'); self.end_headers()
            self.wfile.write(f'<h1>已保存 {len(payload["entries"])} 条记录</h1><a href="/import">继续导入</a>'.encode())
        except (ValueError, KeyError): self.send_error(400)

if __name__ == '__main__':
    print('Preview: http://127.0.0.1:8765', flush=True)
    ThreadingHTTPServer(('127.0.0.1',8765),Handler).serve_forever()
