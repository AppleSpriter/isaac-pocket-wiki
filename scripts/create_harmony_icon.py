"""Render the existing book-and-star launcher mark as a portable PNG."""
from pathlib import Path
import struct
import zlib

ROOT = Path(__file__).resolve().parents[1]
SIZE = 512
SCALE = SIZE / 108
pixels = bytearray(bytes.fromhex('251e20') * SIZE * SIZE)


def polygon(points, color):
    vertices = [(x * SCALE, y * SCALE) for x, y in points]
    rgb = bytes.fromhex(color)
    for y in range(SIZE):
        py = y + .5
        xs = []
        for (x1, y1), (x2, y2) in zip(vertices, vertices[1:] + vertices[:1]):
            if (y1 <= py < y2) or (y2 <= py < y1):
                xs.append(x1 + (py - y1) * (x2 - x1) / (y2 - y1))
        xs.sort()
        for left, right in zip(xs[::2], xs[1::2]):
            for x in range(max(0, int(left)), min(SIZE, int(right + .5))):
                pos = (y * SIZE + x) * 3
                pixels[pos:pos + 3] = rgb


polygon([(24, 19), (76, 19), (84, 25), (84, 86), (76, 90), (24, 90)], 'b38954')
polygon([(32, 20), (77, 20), (84, 27), (84, 78), (32, 78)], 'e8ddc5')
polygon([(57, 29), (64, 44), (80, 51), (64, 58), (57, 73), (50, 58), (34, 51), (50, 44)], 'a74941')
polygon([(57, 43), (60, 49), (66, 51), (60, 54), (57, 60), (54, 54), (48, 51), (54, 49)], 'dfb96e')
for top in (81, 85):
    polygon([(34, top), (76, top), (76, top + 2), (34, top + 2)], '765d46')


def chunk(kind, data):
    return struct.pack('>I', len(data)) + kind + data + struct.pack('>I', zlib.crc32(kind + data))


scanlines = b''.join(b'\0' + pixels[y * SIZE * 3:(y + 1) * SIZE * 3] for y in range(SIZE))
png = (b'\x89PNG\r\n\x1a\n' + chunk(b'IHDR', struct.pack('>2I5B', SIZE, SIZE, 8, 2, 0, 0, 0)) +
       chunk(b'IDAT', zlib.compress(scanlines, 9)) + chunk(b'IEND', b''))
for relative in ('harmony/AppScope/resources/base/media/icon.png',
                 'harmony/entry/src/main/resources/base/media/icon.png'):
    path = ROOT / relative
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(png)
    print(path)
