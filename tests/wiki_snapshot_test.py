"""Validate the complete bundled snapshot, including navigable relationship edges."""
import json
from pathlib import Path
import unittest
from urllib.parse import urlparse
from bs4 import BeautifulSoup

ROOT = Path(__file__).resolve().parents[1]


class WikiSnapshotTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.data = json.loads((ROOT / 'web/data.json').read_text())
        cls.items = {e['key']: e for e in cls.data['entries']}
        cls.achievements = {e['key']: e for e in cls.data['achievements']}

    def test_every_entry_has_readable_article_body_beyond_infobox(self):
        self.assertEqual(self.data['schemaVersion'], 2)
        self.assertEqual(len(self.items), 1022)
        self.assertEqual(self.data['detailCoverage'], {'articles': 1022, 'total': 1022, 'missing': []})
        for key, item in self.items.items():
            sections = item.get('wiki', {}).get('sections', [])
            self.assertTrue(any(s['title'] != '详细资料' and BeautifulSoup(s['html'], 'html.parser').get_text(strip=True) for s in sections), key)

    def test_all_641_achievements_have_unique_ids_conditions_and_local_icons(self):
        entries = self.data['achievements']
        self.assertEqual(len(entries), 641)
        self.assertEqual({e['id'] for e in entries}, set(range(1, 642)))
        self.assertEqual(set(self.achievements), {'A' + str(n) for n in range(1, 642)})
        for achievement in entries:
            self.assertTrue(achievement['name'] and achievement['condition'] and achievement['description'], achievement['key'])
            self.assertEqual(achievement['key'], 'A' + str(achievement['id']))
            self.assertTrue((ROOT / 'web' / achievement['icon']['file']).is_file())
        self.assertIn('其他任意402个成就', self.achievements['A339']['condition'])

    def test_every_html_link_resolves_and_bundled_prose_has_no_active_or_remote_media(self):
        keys = set(self.items) | set(self.achievements)
        fragments = [(e['key'], s['html']) for e in self.items.values() for s in e.get('wiki', {}).get('sections', [])]
        fragments.extend((e['key'], e.get(field + 'Html', '')) for e in self.achievements.values() for field in ['condition', 'description', 'reward'])
        for key, html in fragments:
            soup = BeautifulSoup(html, 'html.parser')
            self.assertFalse(soup.select('script,style,img,svg,iframe,object,embed,form,video,audio,canvas'), key)
            for node in soup.find_all(True):
                self.assertFalse(any(attr == 'style' or attr.lower().startswith('on') or attr in ['src', 'srcset'] for attr in node.attrs), key)
            for anchor in soup.select('a[href]'):
                href = anchor['href']
                if href.startswith('#'): self.assertIn(href[1:], keys, (key, href))
                else: self.assertIn(urlparse(href).scheme, ['https', 'http'], (key, href))

    def test_reward_and_related_edges_are_mutual_and_mean_different_things(self):
        for key, item in self.items.items():
            unlock, related = item['unlockAchievements'], item['relatedAchievements']
            self.assertEqual(len(unlock), len(set(unlock)), key)
            self.assertEqual(len(related), len(set(related)), key)
            self.assertFalse(set(unlock) & set(related), key)
            for achievement in unlock: self.assertIn(key, self.achievements[achievement]['rewardKeys'])
            for achievement in related: self.assertIn(key, self.achievements[achievement]['relatedKeys'])
        for key, achievement in self.achievements.items():
            for item in achievement['rewardKeys']: self.assertIn(key, self.items[item]['unlockAchievements'])
            for item in achievement['relatedKeys']: self.assertIn(key, self.items[item]['relatedAchievements'])
        self.assertIn('A27', self.items['C33']['relatedAchievements'])
        self.assertNotIn('A27', self.items['C33']['unlockAchievements'])
        self.assertEqual(self.achievements['A27']['rewardKeys'], ['C101'])
        self.assertIn('C33', self.achievements['A27']['relatedKeys'])
        self.assertIn('A29', self.items['C105']['unlockAchievements'])
        self.assertEqual(self.achievements['A29']['rewardKeys'], ['C105'])
        self.assertIn('A378', self.items['C1']['relatedAchievements'])
        self.assertNotIn('A378', self.items['C1']['unlockAchievements'])


if __name__ == '__main__':
    unittest.main()
