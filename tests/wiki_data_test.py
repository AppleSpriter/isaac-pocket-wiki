"""Regression fixtures for Wiki version selection, sanitization and relationships."""
import json
from pathlib import Path
import sys
import tempfile
import unittest

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / 'scripts'))
from bs4 import BeautifulSoup
from preview import save_snapshot
from wiki_data import WikiHTML, enrich


def item(key):
    return {'key': key, 'name': '物品' + key, 'source': 'https://isaac.huijiwiki.com/wiki/' + key}


class WikiDataTests(unittest.TestCase):
    def setUp(self):
        self.renderer = WikiHTML([item('C1'), item('C2'), item('T1')], [1, 2])

    def test_current_branch_is_selected_once_and_rp_is_fallback(self):
        html = '<div class="dif"><div class="dif-cell dif-rp">旧效果</div><div class="dif-cell dif-rpp">新效果</div></div>'
        self.assertEqual(BeautifulSoup(self.renderer.sanitize(html), 'html.parser').get_text(), '新效果')
        self.assertEqual(BeautifulSoup(self.renderer.sanitize(html + html), 'html.parser').get_text(), '新效果新效果')
        fallback = '<div class="dif"><div class="dif-cell dif-abp">历史</div><div class="dif-cell dif-rp">沿用效果</div></div>'
        self.assertEqual(BeautifulSoup(self.renderer.sanitize(fallback), 'html.parser').get_text(), '沿用效果')
        removed = '<ul><li><span title="在忏悔版本被移除的特性"><img alt="DLCR-.png"></span>已移除效果</li><li>有效效果</li></ul>'
        self.assertNotIn('已移除效果', self.renderer.sanitize(removed))
        # Real Wiki pages occasionally mark the old branch dif-rpp by mistake,
        # or omit version classes. The explicit badge still identifies its range.
        inconsistent = '<div class="dif"><div class="dif-cell dif-rpp"><span title="在忏悔+版本被移除的特性"></span>10秒</div><div class="dif-cell dif-rpp">至离开房间</div></div>'
        self.assertEqual(BeautifulSoup(self.renderer.sanitize(inconsistent), 'html.parser').get_text(), '至离开房间')
        unclassified = '<div class="dif"><div class="dif-cell"><span title="在忏悔版本被移除的特性"></span>80%</div><div class="dif-cell"><span title="忏悔，或忏悔版本新增特性"></span>200%</div></div>'
        self.assertEqual(BeautifulSoup(self.renderer.sanitize(unclassified), 'html.parser').get_text(), '200%')
        inline = '<ul><li><span title="在忏悔版本被移除的特性"></span>解锁全部旧成就。/<span title="忏悔，或忏悔版本新增特性"></span>解锁除本成就以外的其他任意402个成就。</li></ul>'
        result = self.renderer.sanitize(inline)
        self.assertIn('其他任意402个成就', result)
        self.assertNotIn('全部旧成就', result)
        prerequisite = '解锁<a href="/wiki/C1">当前道具</a>和<span title="在忏悔+版本被移除的特性"></span><span class="item"><a href="/wiki/C2">旧条件道具</a></span>。'
        result = self.renderer.sanitize(prerequisite)
        self.assertIn('当前道具', result)
        self.assertNotIn('旧条件道具', result)
        cases = '<div class="dif"><div class="dif-cell">攻击键：扔出</div><div class="dif-cell">使用键：放下</div></div>'
        result = self.renderer.sanitize(cases)
        self.assertIn('攻击键：扔出', result)
        self.assertIn('使用键：放下', result)

    def test_scripts_remote_media_attributes_and_unsafe_links_are_removed(self):
        html = '<script>alert(1)</script><style>x{}</style><iframe src="https://evil.invalid"></iframe><p onclick="x()" style="color:red">正文<img src="https://evil.invalid/x"><a href="javascript:alert(1)" onmouseover="x()">坏链接</a><a href="/wiki/C1">道具</a><a href="/wiki/%E6%88%90%E5%B0%B1/1">成就</a></p>'
        result = self.renderer.sanitize(html)
        soup = BeautifulSoup(result, 'html.parser')
        self.assertFalse(soup.select('script,style,iframe,img,[style],[onclick],[onmouseover]'))
        self.assertEqual([a.get('href') for a in soup.select('a')], [None, '#C1', '#A1'])
        self.assertIn('正文', result)
        sprite_only = self.renderer.sanitize('<p><a href="/wiki/C1"><span class="icons collectibles"></span></a></p>')
        self.assertIn('物品C1', sprite_only)
        duplicate = self.renderer.sanitize('<span class="item"><a href="/wiki/C1"><span class="icons collectibles"></span></a><span><a href="/wiki/C1">物品C1</a></span></span>')
        self.assertEqual(BeautifulSoup(duplicate, 'html.parser').get_text(), '物品C1')
        footer = '<p>真实正文</p><div><table class="navbox"><tr><td>v t e 整体导航<a href="/wiki/成就/1">导航成就</a></td></tr></table></div><div class="box-outer"><div class="nav-item-subtype">骰子图标列表</div></div><div class="box-outer"><div class="box-banner">饰品</div><div class="box-inner"><a href="/wiki/T1"><span class="icons trinket"></span></a></div></div>'
        result = self.renderer.sanitize(footer)
        self.assertEqual(result, '<p>真实正文</p>')
        ambiguous = WikiHTML([{**item('C1'), 'name': '同名道具'}, {**item('C2'), 'name': '同名道具'}])
        self.assertIsNone(ambiguous.local_key('/wiki/同名道具'))
        self.assertEqual(ambiguous.local_key('/wiki/C1'), 'C1')

    def test_mathml_preserves_fraction_and_exponent_without_svg(self):
        html = '<p>修正<mjx-container><svg>不可读</svg><mjx-assistive-mml><math><mfrac><mn>1</mn><mn>3</mn></mfrac><mo>+</mo><msup><mi>x</mi><mn>2</mn></msup></math></mjx-assistive-mml></mjx-container></p>'
        result = self.renderer.sanitize(html)
        self.assertIn('(1)/(3)+x^(2)', result)
        self.assertNotIn('svg', result)
        self.assertNotIn('不可读', result)
        self.assertIn('(1)/(3)', self.renderer.sanitize('<math><mfrac>\n<mn>1</mn>\n<mn>3</mn>\n</mfrac></math>'))
        self.assertEqual(self.renderer.sanitize(r'<p>设幸运为\(P_{幸运}\)，数量为\(N\)。</p>'), '<p>设幸运为P_(幸运)，数量为N。</p>')
        hearts = '<p>获得<img alt="Health Soul 2.png" src="https://example.invalid/heart">和<img alt="Health Black 1.png">。</p>'
        result = self.renderer.sanitize(hearts)
        self.assertIn('〔魂心〕', result)
        self.assertIn('〔半颗黑心〕', result)
        self.assertNotIn('<img', result)
        white = '<div><div><img alt="Health Red 0.png"></div><div><img alt="Health Eternal Right.png"></div></div>'
        self.assertEqual(self.renderer.sanitize(white), '〔永恒之心〕')

    def test_infobox_keeps_current_pools_as_text(self):
        html = '<table class="infobox"><tr><th>物品</th></tr><tr><td><table><tr><td>重生</td><td>忏悔+</td></tr><tr><td><a href="/wiki/道具池/重生/历史房间">历史</a></td><td><a href="/wiki/道具池/忏悔+/宝箱房"><div style="background:red"></div></a></td></tr></table></td></tr></table>'
        result = self.renderer.infobox(html, 'https://isaac.huijiwiki.com/wiki/C1', [])
        self.assertIn('物品', result)
        self.assertIn('宝箱房', result)
        self.assertNotIn('历史房间', result)
        self.assertNotIn('重生', result)

    def test_unlock_relationships_only_come_from_current_reward_links(self):
        entries = [item('C1'), item('C2'), item('T1')]
        achievement_raw = {'date': '2026-10-15', 'entries': [{'id': 1, 'nameHtml': '成就中文<br>English',
            'descriptionHtml': '介绍', 'conditionHtml': '<a href="/wiki/T1">用饰品达成</a>',
            'rewardHtml': '<div class="dif"><div class="dif-cell dif-rp"><a href="/wiki/C2">历史奖励</a></div><div class="dif-cell dif-rpp"><a href="/wiki/C1">当前奖励</a></div></div>',
            'icon': {'position': '0px -64px', 'width': '64px', 'height': '64px'}}]}
        article_raw = {'date': '2026-10-15', 'entries': [{'key': 'C2', 'sections': [{'title': '可解锁成就', 'html': '<div><a href="/wiki/成就/1"><span class="icons Achievement"></span></a><p>条件</p></div>'}]}]}
        achievements = enrich(entries, article_raw, achievement_raw)
        self.assertEqual(entries[0]['unlockAchievements'], ['A1'])
        self.assertEqual(entries[1]['unlockAchievements'], [])
        self.assertEqual(entries[1]['relatedAchievements'], ['A1'])
        self.assertEqual(entries[2]['relatedAchievements'], ['A1'])
        self.assertEqual(achievements[0]['rewardKeys'], ['C1'])
        self.assertEqual(achievements[0]['relatedKeys'], ['T1', 'C2'])
        self.assertEqual(achievements[0]['name'], '成就中文')
        self.assertEqual(achievements[0]['en'], 'English')
        self.assertEqual(achievements[0]['icon']['file'], 'assets/achievements.jpg')
        self.assertIn('href="#A1"', entries[1]['wiki']['sections'][0]['html'])

    def test_import_batches_merge_by_key_and_reject_invalid_records(self):
        with tempfile.TemporaryDirectory() as temporary:
            root = Path(temporary)
            save_snapshot({'kind': 'articles', 'date': '2026-10-15', 'entries': [{'key': 'C1', 'title': '旧'}, {'key': 'C2'}]}, root)
            total = save_snapshot({'kind': 'articles', 'date': '2026-10-15', 'entries': [{'key': 'C1', 'title': '新'}, {'key': 'T1'}]}, root)
            self.assertEqual(total, 3)
            data = json.loads((root / 'data/raw/articles.json').read_text())
            self.assertEqual(data['entries'][0]['title'], '新')
            with self.assertRaises(ValueError): save_snapshot({'kind': '../bad', 'date': '2026-10-15', 'entries': []}, root)
            with self.assertRaises(ValueError): save_snapshot({'kind': 'articles', 'date': '2026-10-15', 'entries': [{'key': '../../bad'}]}, root)
            self.assertEqual(json.loads((root / 'data/raw/articles.json').read_text()), data)


if __name__ == '__main__':
    unittest.main()
