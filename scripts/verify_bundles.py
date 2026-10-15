"""Verify APK/HAP ZIP integrity and bundled web resources against current source.

This checks resource bytes, not the APK/HAP cryptographic signature. Run the
platform signing tool separately before distributing an installation package.
"""
import argparse
import hashlib
import json
from pathlib import Path
import zipfile

from sync_harmony_web import expected_files

ROOT = Path(__file__).resolve().parents[1]


def verify_resources(bundle, expected, prefix):
    """Reject duplicate, missing, stale, corrupt, or changed packaged resources."""
    bundle = Path(bundle)
    with zipfile.ZipFile(bundle) as archive:
        names = archive.namelist()
        if len(names) != len(set(names)):
            raise ValueError('Duplicate ZIP member names')
        damaged = archive.testzip()
        if damaged:
            raise ValueError('Corrupt ZIP member: ' + damaged)
        actual = {
            name[len(prefix):]: name for name in names
            if name.startswith(prefix) and not name.endswith('/')
        }
        expected = {str(path): content for path, content in expected.items()}
        missing, stale = sorted(expected.keys() - actual.keys()), sorted(actual.keys() - expected.keys())
        changed = sorted(name for name in expected.keys() & actual.keys()
                         if archive.read(actual[name]) != expected[name])
        if missing or stale or changed:
            raise ValueError(f'Resource mismatch: missing={missing}, stale={stale}, changed={changed}')
    return {
        'file': bundle.name,
        'resources': len(expected),
        'bytes': bundle.stat().st_size,
        'sha256': hashlib.sha256(bundle.read_bytes()).hexdigest(),
    }


def verify_bundle(bundle):
    bundle = Path(bundle)
    if bundle.suffix.lower() == '.apk':
        expected = {path.relative_to(ROOT / 'web'): path.read_bytes()
                    for path in (ROOT / 'web').rglob('*') if path.is_file()}
        return verify_resources(bundle, expected, 'assets/')
    if bundle.suffix.lower() == '.hap':
        return verify_resources(bundle, expected_files(), 'resources/rawfile/')
    raise ValueError('Expected an .apk or .hap bundle')


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('bundles', type=Path, nargs='+')
    args = parser.parse_args()
    try:
        reports = [verify_bundle(bundle) for bundle in args.bundles]
    except (OSError, ValueError, zipfile.BadZipFile, RuntimeError) as error:
        parser.exit(1, f'Bundle verification failed: {error}\n')
    print(json.dumps(reports, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
