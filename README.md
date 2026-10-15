# 以撒口袋图鉴

面向 Android 与 HarmonyOS 的《以撒的结合：忏悔+ / Repentance+》离线中文图鉴。当前版本 **0.6.1** 已包含全部 1022 条图鉴的 Wiki 正文及 641 项成就，完成本地构建与校验；真机测试由用户安装后进行。

## Android 安装与使用

本版构建输出为 `output/isaac-pocket-0.6.1-debug.apk`；已公开发布的版本可从 [GitHub Releases](https://github.com/AppleSpriter/isaac-pocket-wiki/releases) 下载。将 APK 传到 Android 手机上打开安装，系统提示时允许该文件管理器安装应用。支持 **Android 8.0（API 26）及以上**，使用系统 Android WebView。安装包沿用已有本地调试签名，可以覆盖安装旧版。

首次启动无需下载资料，也不需要登录；应用不申请互联网或存储权限。

- 170 个主动道具、551 个被动道具、97 个卡牌/符文/魂石、16 个套装、188 个饰品，共 1022 条。
- 搜索中文名、英文名、编号、效果、标签。`C118`、`T1`、`K1` 精确指定分类编号；纯数字同时匹配当前分类中该编号，选择“全部”可以跨分类查询。
- 按品质筛选、按编号/品质/中文名排序。“全部”按编号排序时，主被动道具统一按 C1、C2… 的游戏编号混排，不再主动优先；空号跳过。
- 详情包含图标、编号（物品）、中英文名、游戏内介绍、效果摘要、相关套装；0.6.0 增加原 Wiki 页面已有的详细资料、技巧、轶事、协同、解锁等正文分节，具体内容随条目而异。
- 新增 641 项成就的离线列表与详情，支持 A 编号、名称、条件与奖励查询。道具可以跳转解锁它的成就，成就也可跳转所解锁的物品；达成条件涉及的物品另作相关项显示。
- 套装详情包含获得条件和相关组件；组件中的主被动道具可以离线跳转。范围外的胶囊组件提供 Wiki 链接。
- 收藏和最近 60 条查看记录保存在本机；卸载或清除数据会移除记录。
- 底栏为“图鉴、成就、背词、我的”；“我的”中提供收藏、最近、设置、关于四个标签。
- Wiki 章节可一键“展开全部 / 收起全部”。在“我的 → 设置”开启“默认展开全部资料”后，新打开的详情自动全部展开，偏好在重启后保留；从关联条目返回仍恢复原阅读状态。
- 详情页附有原条目链接；联网访问 Wiki 原页和未收录的站外资料会交给系统浏览器。
- 图鉴、背词、详情及关于页边缘显示 `Applespriter` 水印；关于页也有制作署名。
- 首次默认选中“全部”；此后记住上次分类、品质、排序和各分类的浏览位置，切换标签或重启后继续沿用。卸载或清除应用数据会重置记录。
- 图鉴每页 48 条，支持上一页、下一页和直接输入页码。搜索唯一结果后会记住目标；清空搜索、从搜索详情返回或点“定位到列表”，都可从目标所在页继续查看前后的条目。
- “图标总览”使用本地图标显示当前分类的完整图，支持双指缩放、拖动、缩放按钮/滑条；点击图标后跳到完整列表中对应的卡片。

## 鸿蒙版安装与测试

公开 Release 提供 `isaac-pocket-harmony-0.6.1-unsigned.hap`（未签名），需要使用自己的 DevEco 调试签名后安装。它不含设备注册信息、证书或 Profile。下面的 Mate 60 专用签名包仅保留在本机，公开附件不包含此包。

本版 Mate 60 / HarmonyOS 7 调试包为 `output/isaac-pocket-harmony-0.6.1-mate60-debug.hap`。包名为 `com.applespriter.isaacpocket`，版本号 0.6.1 / versionCode 11；构建、签名和资源校验已通过，校验值见 `AGENT.md` 与 `output/SHA256SUMS-0.6.1.txt`。该 HAP 使用为当前测试机生成的调试 Profile，**不适用于其他未注册设备，也不是面向应用市场的发布签名**。

鸿蒙版与 Android 共用 1022 条离线图鉴资料、1006 条背词题目、分页定位、总览图、收藏与最近查看，以及新增的 Wiki 正文和 641 项成就资料，并保留 Applespriter 水印。华为阅读在部分 Mate 60 / HarmonyOS 7 设备上支持眼动翻页，但当前公开 SDK 未提供本应用可用的眼动事件接口；**本应用暂不支持眼动触发**，底部提示也说明了这一点。

鸿蒙保留 0.4.4 新增的跨应用入口：`startAbility({ bundleName: 'com.applespriter.isaacpocket', abilityName: 'EntryAbility', parameters: { item: 'C12' } })`。`item` 为条目 key（字母 + 数字，如 `C12`、`T1`、`A1`），格式不符时忽略；冷启动直接进入详情，已运行时切换到该条目。「押注自己」的道具收藏用它跳转。从入口详情返回后定位到对应列表页。

真机测试由用户进行，助手不操作手机。安装本版后重点检查：飞行模式下查看技巧、轶事和长表格；道具 → 解锁成就 → 奖励物品的跳转与逐级返回；搜索 `A641`、无结果及成就翻页；从其他应用打开道具或成就后返回相应列表。原有 C600 搜索定位、分类重启保留、总览缩放拖动、背词、收藏保存和系统手势区域也需复查。

可提交的 ArkTS 工程在 `harmony/`，网页资源由 `python3 scripts/sync_harmony_web.py` 同步到 `rawfile`。DevEco Studio 不接受路径中含空格的工程；请将 `harmony/` 复制到任意无空格路径作为本机工作副本。本机调试签名配置、证书和密钥**不得提交到 Git**。仓库中的 `harmony/build-profile.json5` 不含签名材料。在 DevEco 配好目标设备的调试签名后，可用本机 DevEco 自带工具构建：

```sh
export NODE_HOME=/Applications/DevEco-Studio.app/Contents/tools/node
export DEVECO_SDK_HOME=/Applications/DevEco-Studio.app/Contents/sdk
export JAVA_HOME=/Applications/DevEco-Studio.app/Contents/jbr/Contents/Home
export ISAAC_HARMONY_PROJECT=/path/to/IsaacWikiHarmony
cd "$ISAAC_HARMONY_PROJECT"
/Applications/DevEco-Studio.app/Contents/tools/hvigor/bin/hvigorw assembleHap --mode module -p product=default -p buildMode=debug --no-daemon
```

成功后生成 `entry/build/default/outputs/default/entry-default-signed.hap`。换其他鸿蒙设备测试时，需要重新为该设备配置调试 Profile。

## 背词模式

底部“背词”入口提供看图和名称选四选一效果。答后显示正确答案，统计本次会话答对数。当前题库为 170 主动道具 + 551 被动道具 + 97 卡牌/符文/魂石 + 188 饰品，共 1006 条。题干不显示效果，干扰选项来自同分类的其他效果摘要；学习计分不跨应用重启保存。

## 数据范围

物品列表的效果摘要、游戏内介绍和套装基础资料快照日期为 **2026-09-22**；新增 Wiki 正文与成就列表的快照日期为 **2026-10-15**。两者独立保留日期，正文较新不代表已经重新采集所有列表摘要。基础物品来自灰机wiki查询工具的“忏悔+”筛选结果；套装来自 16 个套装页面。

`data/raw/items.json` 和 `data/raw/sets.json` 保留基础来源与原始资料，`data/raw/articles.json` 保留按条目采集的正文分节，`data/raw/achievements.json` 保留 641 项成就的名称、条件、奖励与图标位置。原始记录来自正常浏览器可见的公开 Wiki 页面；直接 HTTP/API 当前返回 403，不绕过站点挑战。`scripts/preview.py` 的本地导入页可合并分批快照；目前不提供无人值守的完整重采集脚本。

`scripts/build_data.py` 与 `scripts/wiki_data.py` 将已有快照转换为 `web/data.json` 和 `web/data.js`。正文按分节保留，版本差异选择可识别的最新适用分支；无法明确处理的分支记录在对应条目的提示中。清理脚本、表单、远程图片和页面布局属性，仅保留受限的文字、表格和链接。图册保留可读文字或图片说明，动画与原图请打开 Wiki 原页查看。已收录物品和成就链接转换为本地跳转；其他链接仍指向原站，不复制整个 Wiki 的所有页面和媒体。

成就的“解锁奖励”和“达成条件涉及的物品”分别建关系，不能仅因正文提到某件道具就认定它由该成就解锁。成就 `A1` 等对应 Wiki 成就编号；套装 `S1` 等仅为内部键，没有虚构套装游戏编号。完整度校验会在任一图鉴条目缺少正文时中止发布用的数据生成。

## 本地预览与检查

无需安装前端依赖：

```sh
python3 scripts/preview.py
```

打开 `http://127.0.0.1:8765/`；端口被占用时可用 `python3 scripts/preview.py --port 8766`，然后打开 `http://127.0.0.1:8766/`。预览服务仅监听本机地址。`/import` 和 `/collect` 是开发时使用的本地原始快照导入页，不会打包进入 APK/HAP。

```sh
npm test
.tools/venv/bin/python -m unittest discover -s tests -p '*_test.py'
```

JavaScript 测试覆盖分类数量、唯一键、本地图标、精确编号、名称/效果搜索、品质与收藏组合过滤、套装关系，以及高编号分页定位、分类状态恢复、损坏记录回退和总览所有键的定位。Python 测试覆盖正文清理、版本差异、成就奖励与条件关系，以及快照批次合并；使用下方创建的虚拟环境运行。

如环境已提供 Playwright，并已启动预览服务，可运行 `npm run test:ui`。使用其他端口时设置 `ISAAC_PREVIEW_URL=http://127.0.0.1:8766/`。浏览器回归覆盖搜索定位、分类重载记忆、双指缩放及点选、入口返回与窄屏布局；它不能替代手机上的 WebView/ArkWeb 测试。

重新生成数据（已生成的数据可直接用于构建，无需此步骤）：

```sh
python3 -m venv .tools/venv
.tools/venv/bin/pip install -r scripts/requirements.txt
.tools/venv/bin/python scripts/build_data.py --require-complete
python3 scripts/sync_harmony_web.py
python3 scripts/sync_harmony_web.py --check
```

`--require-complete` 要求所有图鉴条目均有 Wiki 正文，且成就编号恰好覆盖 1–641，避免把采集中途的数据误打包。整理批次期间可省略该参数预览已有资料，但不能把这种预览当作完整交付。

## 构建 APK

采用 Android 原生 Activity + 本地 WebView，不依赖 Node 构建框架或 Gradle。SDK 工具来自 Google，JDK 来自 Eclipse Temurin。

当前机器构建环境已准备在 `.tools/`。运行：

```sh
python3 scripts/build_apk.py
```

脚本依次执行 aapt2、javac、D8、zipalign、apksigner，输出安装包和 `output/SHA256SUMS.txt`。在其他机器上准备 JDK 17、Android platform 35、Build Tools 35.0.0，并指定：

```sh
export ISAAC_JAVA_HOME=/path/to/jdk17
export ANDROID_SDK_ROOT=/path/to/android-sdk
python3 scripts/build_apk.py
```

当前脚本验证于 macOS。`.tools/isaac-debug.keystore` 用于本地测试签名，密码采用标准调试值，已被 Git 忽略。保留它可用相同签名覆盖安装；正式发布需要独立的发布签名与版本管理。

## 验证范围

0.6.0 已通过 1022 条正文和 641 项成就的严格完整度校验、13 组 JavaScript 与 14 组 Python 测试；全量检查本地链接、解锁/条件关系、正文安全转换。浏览器验证了成就互联与阅读位置恢复、成就分页/冷启动定位、原有分类记忆及 320px 长表格布局。APK/HAP 的平台签名、ZIP 和资源字节一致性校验通过；安装包信息记录在 `AGENT.md`。

0.6.1 另通过“我的”分组导航、默认展开偏好重载、详情全部展开/收起与历史章节状态恢复的浏览器验证；两个平台安装包重新构建并通过签名和资源一致性校验。

浏览器测试不代表 Android WebView 或 HarmonyOS ArkWeb 真机通过。系统返回键、不同系统内核、软键盘、手势区域和长正文交互由用户安装后实际检查。

构建后可核对安装包 ZIP 完整性、网页资源与当前源码逐字节一致性，并输出 SHA-256：

```sh
python3 scripts/verify_bundles.py output/isaac-pocket-0.6.1-debug.apk output/isaac-pocket-harmony-0.6.1-mate60-debug.hap
```

该脚本不验证平台签名；APK 的 `apksigner verify` 与 HAP 的 `verify-app` 仍需分别执行。

## 来源与许可

资料来自[以撒的结合中文维基 · 灰机wiki](https://isaac.huijiwiki.com/wiki/道具)，作者为站点全体贡献者。感谢原站维护工作。每条数据保留原始页面链接。本项目对资料进行了字段提取、格式整理、版本差异筛选，未获得或声称获得官方背书。

- 原站原创内容按 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh) 分享。
- 原站注明来自英文 Wiki 的翻译内容按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.zh) 分享。
- 本项目对应资料的整理改编沿用原许可；游戏名称、商标及图像素材归原权利人所有。
- 初版为非官方、非商业参考工具。第三方资料不适用本项目自行创造的代码许可。

开发进度、下一步工作及已知问题见 `AGENT.md`。
