"""Copy the shared offline UI into the HarmonyOS rawfile bundle."""
from pathlib import Path
import argparse
import shutil
import sys

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'web'
TARGET = ROOT / 'harmony/entry/src/main/resources/rawfile'
INJECTION = b'<script src="app.js" defer></script>'


def expected_files():
    contents = {
        source.relative_to(SOURCE): source.read_bytes()
        for source in SOURCE.rglob('*') if source.is_file()
    }
    index = contents[Path('index.html')]
    assert index.count(INJECTION) == 1, 'Cannot find app.js in web/index.html'
    contents[Path('index.html')] = index.replace(
        INJECTION, b'<script src="platform.js" defer></script>\n  ' + INJECTION
    )
    contents[Path('platform.js')] = (ROOT / 'harmony/platform.js').read_bytes()
    return contents


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--check', action='store_true', help='fail if rawfile differs from web/')
    args = parser.parse_args()
    expected = expected_files()
    actual = {path.relative_to(TARGET): path for path in TARGET.rglob('*') if path.is_file()}
    stale = sorted(set(actual) - set(expected))
    changed = sorted(rel for rel, content in expected.items()
                     if rel not in actual or actual[rel].read_bytes() != content)
    if args.check:
        if stale or changed:
            sys.exit(f'rawfile out of sync: changed={changed}, stale={stale}')
    else:
        for rel in stale:
            actual[rel].unlink()
        for rel in changed:
            destination = TARGET / rel
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(expected[rel])
    print(f'Harmony rawfile: {len(expected)} files, {len(changed)} updated, {len(stale)} stale')


if __name__ == '__main__':
    main()
