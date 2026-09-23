# 以撒口袋图鉴

面向 Android 的《以撒的结合：忏悔+ / Repentance+》离线中文图鉴。当前版本 **0.4.2**。

## 安装与使用

安装包：`output/isaac-pocket-0.4.2-debug.apk`，也可从 [GitHub Releases](https://github.com/AppleSpriter/isaac-pocket-wiki/releases) 下载。将 APK 传到 Android 手机上打开安装，系统提示时允许该文件管理器安装应用。支持 **Android 8.0（API 26）及以上**，使用系统 Android WebView。安装包继续使用与 v0.4.1 相同的本地调试签名，可以覆盖安装旧版。

首次启动无需下载资料，也不需要登录；应用不申请互联网或存储权限。

- 170 个主动道具、551 个被动道具、97 个卡牌/符文/魂石、16 个套装、188 个饰品，共 1022 条。
- 搜索中文名、英文名、编号、效果、标签。`C118`、`T1`、`K1` 精确指定分类编号；纯数字同时匹配当前分类中该编号，选择“全部”可以跨分类查询。
- 按品质筛选、按编号/品质/中文名排序。“全部”按编号排序时，主被动道具统一按 C1、C2… 的游戏编号混排，不再主动优先；空号跳过。
- 详情包含图标、编号（物品）、中英文名、游戏内介绍、效果摘要、相关套装。
- 套装详情包含获得条件和相关组件；组件中的主被动道具可以离线跳转。范围外的胶囊组件提供 Wiki 链接。
- 收藏和最近 60 条查看记录保存在本机；卸载或清除数据会移除记录。
- 详情页附有原条目链接；联网访问完整 Wiki 会交给系统浏览器。
- 图鉴、背词、详情及关于页边缘显示 `Applespriter` 水印；关于页也有制作署名。

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

测试覆盖分类数量、唯一键、本地图标、精确编号（含前缀与全角输入）、名称/效果搜索、品质与收藏组合过滤、套装版本差异和新增套装组件。

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
