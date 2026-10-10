# 以撒口袋图鉴

面向 Android 与 HarmonyOS 的《以撒的结合：忏悔+ / Repentance+》离线中文图鉴。Android 与鸿蒙测试版本均为 **0.5.0**。

## Android 安装与使用

测试安装包：`output/isaac-pocket-0.5.0-debug.apk`；已公开发布的版本可从 [GitHub Releases](https://github.com/AppleSpriter/isaac-pocket-wiki/releases) 下载。将 APK 传到 Android 手机上打开安装，系统提示时允许该文件管理器安装应用。支持 **Android 8.0（API 26）及以上**，使用系统 Android WebView。安装包沿用已有本地调试签名，可以覆盖安装旧版。

首次启动无需下载资料，也不需要登录；应用不申请互联网或存储权限。

- 170 个主动道具、551 个被动道具、97 个卡牌/符文/魂石、16 个套装、188 个饰品，共 1022 条。
- 搜索中文名、英文名、编号、效果、标签。`C118`、`T1`、`K1` 精确指定分类编号；纯数字同时匹配当前分类中该编号，选择“全部”可以跨分类查询。
- 按品质筛选、按编号/品质/中文名排序。“全部”按编号排序时，主被动道具统一按 C1、C2… 的游戏编号混排，不再主动优先；空号跳过。
- 详情包含图标、编号（物品）、中英文名、游戏内介绍、效果摘要、相关套装。
- 套装详情包含获得条件和相关组件；组件中的主被动道具可以离线跳转。范围外的胶囊组件提供 Wiki 链接。
- 收藏和最近 60 条查看记录保存在本机；卸载或清除数据会移除记录。
- 详情页附有原条目链接；联网访问完整 Wiki 会交给系统浏览器。
- 图鉴、背词、详情及关于页边缘显示 `Applespriter` 水印；关于页也有制作署名。
- 首次默认选中“全部”；此后记住上次分类、品质、排序和各分类的浏览位置，切换标签或重启后继续沿用。卸载或清除应用数据会重置记录。
- 图鉴每页 48 条，支持上一页、下一页和直接输入页码。搜索唯一结果后会记住目标；清空搜索、从搜索详情返回或点“定位到列表”，都可从目标所在页继续查看前后的条目。
- “图标总览”使用本地图标显示当前分类的完整图，支持双指缩放、拖动、缩放按钮/滑条；点击图标后跳到完整列表中对应的卡片。

## 鸿蒙版安装与测试

Mate 60 / HarmonyOS 7 调试包：`output/isaac-pocket-harmony-0.5.0-mate60-debug.hap`，APK/HAP 校验值见 `output/SHA256SUMS-0.5.0.txt`。包名为 `com.applespriter.isaacpocket`，版本号 0.5.0 / versionCode 9。该 HAP 使用为当前测试机生成的调试 Profile，**不适用于其他未注册设备，也不是面向应用市场的发布签名**。

鸿蒙版包含与 Android 相同的 1022 条离线图鉴资料、1006 条背词题目、分页定位、总览图、收藏与最近查看，以及 Applespriter 水印。华为阅读在部分 Mate 60 / HarmonyOS 7 设备上支持眼动翻页，但当前公开 SDK 未提供本应用可用的眼动事件接口；**本应用暂不支持眼动触发**，底部提示也说明了这一点。

鸿蒙保留 0.4.4 新增的跨应用入口：`startAbility({ bundleName: 'com.applespriter.isaacpocket', abilityName: 'EntryAbility', parameters: { item: 'C12' } })`。`item` 为图鉴条目 key（字母 + 数字，如 `C12`、`T1`），格式不符时忽略；冷启动直接进入详情，已运行时切换到该条目。「押注自己」的道具收藏用它跳转。0.5.0 从入口详情返回后定位到对应列表页。

0.5.0 已完成本地自动化、独立浏览器回归、APK/HAP 构建与签名/资源校验，**尚未由用户真机测试**。安装后重点检查：C600 搜索后清空及详情返回的列表位置、主动分类在切换标签和重启后保留、总览双指缩放/拖动/点选、从其他应用打开条目后的返回。原有离线查询、背词、收藏保存和系统手势区域也需安装后检查。

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

资料快照日期 **2026-09-22**。物品来自灰机wiki查询工具的“忏悔+”筛选结果；套装来自 16 个套装页面。保存的是列表中的效果摘要与游戏内介绍，不是全量 Wiki 文章。详细协同、解锁条件、漏洞等尚未离线收录。

`data/raw/items.json` 和 `data/raw/sets.json` 保留来源与原始资料；`scripts/build_data.py` 将其规范化为 `web/data.json` 和 `web/data.js`。套装历史版本差异选取忏悔及忏悔+适用分支，数据中没有虚构套装游戏编号。`S1` 等仅为内部键。

## 本地预览与检查

无需安装前端依赖：

```sh
python3 scripts/preview.py
```

打开 `http://127.0.0.1:8765/`。预览服务仅监听本机地址。`/import` 是开发时使用的本地原始快照导入页，不会打包进入 APK。

```sh
npm test
```

13 组测试覆盖分类数量、唯一键、本地图标、精确编号、名称/效果搜索、品质与收藏组合过滤、套装关系，以及高编号分页定位、分类状态恢复、损坏记录回退和总览所有键的定位。

如环境已提供 Playwright，并已启动预览服务，可运行 `npm run test:ui`。浏览器回归覆盖搜索定位、分类重载记忆、双指缩放及点选、入口返回与窄屏布局；它不能替代手机上的 WebView/ArkWeb 测试。

重新生成数据（已生成的数据可直接用于构建，无需此步骤）：

```sh
python3 -m venv .tools/venv
.tools/venv/bin/pip install -r scripts/requirements.txt
.tools/venv/bin/python scripts/build_data.py
```

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

- 已完成 APK 编译、zipalign 和 APK v2/v3 签名验证。
- 已完成本地搜索/数据测试和浏览器手机尺寸功能检查。
- 尚未连接 Android 真机或模拟器；系统返回键、不同系统 WebView、软键盘与安全区域仍需安装后实际检查。

## 来源与许可

资料来自[以撒的结合中文维基 · 灰机wiki](https://isaac.huijiwiki.com/wiki/道具)，作者为站点全体贡献者。感谢原站维护工作。每条数据保留原始页面链接。本项目对资料进行了字段提取、格式整理、版本差异筛选，未获得或声称获得官方背书。

- 原站原创内容按 [CC BY-NC-SA 3.0](https://creativecommons.org/licenses/by-nc-sa/3.0/deed.zh) 分享。
- 原站注明来自英文 Wiki 的翻译内容按 [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/deed.zh) 分享。
- 本项目对应资料的整理改编沿用原许可；游戏名称、商标及图像素材归原权利人所有。
- 初版为非官方、非商业参考工具。第三方资料不适用本项目自行创造的代码许可。

开发进度、下一步工作及已知问题见 `AGENT.md`。
