import json
from pathlib import Path
import sys
import tempfile
import unittest
import warnings
import zipfile

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from verify_bundles import verify_resources


class BundleResourceTests(unittest.TestCase):
    def write_bundle(self, directory, files):
        bundle = Path(directory) / 'test.apk'
        with zipfile.ZipFile(bundle, 'w') as archive:
            for name, value in files:
                archive.writestr(name, value)
        return bundle

    def test_exact_resources_and_non_web_members(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = self.write_bundle(directory, [('assets/index.html', b'page'), ('classes.dex', b'dex')])
            report = verify_resources(bundle, {Path('index.html'): b'page'}, 'assets/')
            self.assertEqual(report['resources'], 1)
            self.assertEqual(report['file'], 'test.apk')
            self.assertEqual(len(report['sha256']), 64)
            self.assertNotIn(str(Path(directory)), json.dumps(report))

    def test_missing_stale_and_changed_are_rejected(self):
        expected = {'index.html': b'page'}
        cases = [[], [('assets/index.html', b'old')],
                 [('assets/index.html', b'page'), ('assets/old.js', b'stale')]]
        for files in cases:
            with self.subTest(files=files), tempfile.TemporaryDirectory() as directory:
                bundle = self.write_bundle(directory, files)
                with self.assertRaisesRegex(ValueError, 'Resource mismatch'):
                    verify_resources(bundle, expected, 'assets/')

    def test_duplicate_archive_member_is_rejected(self):
        with tempfile.TemporaryDirectory() as directory, warnings.catch_warnings():
            warnings.simplefilter('ignore', UserWarning)
            bundle = self.write_bundle(directory, [('assets/index.html', b'page'), ('assets/index.html', b'page')])
            with self.assertRaisesRegex(ValueError, 'Duplicate ZIP'):
                verify_resources(bundle, {'index.html': b'page'}, 'assets/')

    def test_harmony_rawfile_prefix(self):
        with tempfile.TemporaryDirectory() as directory:
            bundle = self.write_bundle(directory, [('resources/rawfile/platform.js', b'harmony')])
            report = verify_resources(bundle, {'platform.js': b'harmony'}, 'resources/rawfile/')
            self.assertEqual(report['resources'], 1)


if __name__ == '__main__':
    unittest.main()
