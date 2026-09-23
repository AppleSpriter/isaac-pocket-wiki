# 以撒口袋 Wiki — 进度与接续记录

更新时间：2026-09-23。用户要求优先维护本文件；以后每完成一个阶段，都更新完成状态、实际验证范围和待办。

## 当前状态

**0.4.2 已提交至 GitHub `main` 并发布为最新 Release，APK 附件可下载且与本地构建逐字节一致。Android 真机试用仍待进行。**

- APK：`output/isaac-pocket-0.4.2-debug.apk`，608,380 字节，约 594 KiB。
- SHA-256：`082b07587b8b754c30bbe033f3c3ee2d5341a6ecf2e96ce1c387617cd40422ab`，另存 `output/SHA256SUMS.txt`。
- 包名：`wiki.isaac.pocket`；版本 0.4.2 / versionCode 6。
- Android 8.0+（minSdk 26）、targetSdk 35；APK 使用本地测试签名。
- 尚未连接 Android 真机/模拟器，不能声称已在真实 Android 设备上启动测试。

## 已确认的用户需求

- 制作可安装 APK 的手机版以撒 Wiki，数据随安装包存到本地。
- 用户明确选定版本：**忏悔+ / Repentance+**。
- 初版包括被动道具、卡牌、套装、饰品；支持查询并显示编号、作用和介绍。
- 来源参考：https://isaac.huijiwiki.com/wiki/道具 。
- 用户要求创建并优先更新 `AGENT.md`，记录进度与待办。
- 2026-09-23 用户要求在应用里加入 `Applespriter` 水印，并上传最新 GitHub Release。仓库为 `git@github.com:AppleSpriter/isaac-pocket-wiki.git`；开始时线上最新 Release 为 `v0.4.1`，本地 `main` 工作区干净。

## 0.4.2 当前阶段（2026-09-23）

- 基线：仓库 `main` 为 `bcc0154`，GitHub `v0.4.1` 附件是 `isaac-pocket-0.4.1-debug.apk`，SHA-256 `1192b5764550ffbb3e095ab60fb36b162b60f00bc9181fa0323f1e545d94d0b8`。
- 已实现：全局页面右侧留白处固定显示 `Applespriter` 水印，关于页增加制作署名；版本号与 README 更新为 0.4.2。构建脚本从 Manifest 读取版本号生成 APK 文件名，避免以后手工文件名与版本不一致。
- 已验证：7 组自动化测试通过、JS/Python 语法检查通过；浏览器 390px 图鉴/背词和 320px 关于/详情视觉检查，320px 无横向溢出；APK v2/v3 签名、zipalign、ZIP 完整性通过，25 个网页资源与源码逐字节一致；新旧 APK 签名证书 SHA-256 相同；Manifest 没有声明权限。
- GitHub：源码提交 `4718f7e`，标签 `v0.4.2`，Release https://github.com/AppleSpriter/isaac-pocket-wiki/releases/tag/v0.4.2 。该 Release 已被标记为 Latest。
- APK 与 `SHA256SUMS.txt` 附件状态均为 `uploaded`。从公开下载链接取回两者，与本地文件逐字节一致；APK SHA-256 与上方记录相同。
- 待办：用户安装后进行 Android 真机验证。浏览器检查不等于 Android 真机验证。

## 已完成

### 本地数据

- **170 主动道具 + 551 被动道具 + 97 卡牌/符文/魂石 + 16 套装 + 188 饰品 = 1022 条**。
- 来源快照日期：2026-09-22；物品通过 Wiki 查询器“忏悔+”筛选提取。
- `data/raw/items.json`：1006 条物品原始快照，包括主动/被动分类、编号、中英文名、介绍、效果摘要、品质、标签、来源、精灵图位置；`data/raw/active.json` 保存本次 170 条主动道具的独立来源快照。
- `data/raw/sets.json`：16 套装页面的效果、相关物品和注意事项原始 HTML，附页面链接和图像 URL。
- `scripts/build_data.py`：生成 `web/data.json` 与 `web/data.js`；筛选套装版本差异、提取获得条件与组件、下载对应图像。
- 4 张本地精灵图（道具、饰品、卡牌、符文）和 15 张套装图；肆意践踏使用相关狮子座道具图标。
- 套装 `S1` 等是内部键，未虚构套装游戏编号。
- 初版物品详情是列表的介绍与效果摘要，**没有离线复制完整 Wiki 文章的协同、解锁条件、漏洞等**。

### UI 与 Android

- `web/index.html`、`style.css`、`app.js`：手机双列图鉴，桌面自适应布局。
- 全部/主动道具/被动道具/卡牌/套装/饰品切换；中文/英文/编号/效果/标签查询。主动和被动均显示游戏 C 编号，内部 key 仍保持唯一。
- 精确编号支持 C/T/K 前缀、全角输入、补零；品质 0–4 筛选，编号/品质/名称排序。
- 详情、套装组件及反向关联、收藏、最近 60 条记录、本地持久化、空结果状态、分批加载。
- 来源与许可、版本及快照日期在详情和关于页中显示。
- `android/app/src/main/java/wiki/isaac/pocket/MainActivity.java`：原生 WebView 容器，以受限 HTTPS 虚拟域名加载本地 assets，不开放文件访问或 JS 原生桥。
- APK 不申请网络/存储权限；外部链接由系统浏览器打开。
- 处理安全区域、软键盘 inset、返回键；暂时关闭预测性返回以使用已实现的 Activity 返回回调。
- `scripts/build_apk.py`：aapt2 → javac → D8 → zipalign → apksigner；不依赖 Gradle 或前端 npm 构建。
- `README.md`：安装、范围、预览、数据生成、APK 构建、测试、来源与许可。

## 已验证（不要扩大这些结论）

- `npm test`：**5 组全部通过**，检查分类数量/唯一键/资源、精确编号、中文英文效果查询、品质收藏组合、套装版本与忏悔+新增套装关系。
- `node --check web/app.js` 和 `node --check web/search.js` 通过。
- 编译 APK 成功，zipalign 成功，apksigner 的 **v2/v3 签名验证通过**。
- aapt2 确认包名、版本、启动 Activity、minSdk/targetSdk，未声明权限。
- APK 中的所有网页资源与 `web/` 源文件逐字节一致。
- 浏览器验证 C118、K1、T1 精确查询、无结果状态、品质4筛选（28项）、收藏重载后保留、返回、套装组件跳转。
- 390px 手机详情视觉检查通过；320px 窄屏未出现横向溢出；桌面四列布局已查看。
- 浏览器控制台未发现错误或警告。
- **尚未真机/模拟器安装测试**。浏览器验证不能替代 Android WebView/系统操作验证。
- 主动道具采集验证：通过用户可见的受控 Chrome CDP 会话，从 Wiki “忏悔+ / 主动道具”筛选结果 11 页采集 170 条；唯一 ID、字段完整性和本地精灵图引用校验通过。

## 接续优先级

1. 用户安装 APK 后反馈：检查启动、离线搜索、系统返回键、键盘、安全区域、收藏重启保存，记录手机型号与 Android/WebView 版本。
2. 若出现安装或运行问题，先复现并修复，不要把浏览器测试等同于真机通过。
3. 根据用户反馈扩展完整详情（数值、解锁、协同）、俗称/拼音搜索、图片辨识、数据更新等；这些尚未获得额外明确范围，不预先声称完成。
4. 当前 GitHub Release 沿用本地测试签名以支持从 v0.4.1 覆盖安装。未来若改用独立发布签名，须先设计已安装用户的迁移方式；遵守对应数据及素材许可。
5. 若刷新数据，重新采集原始快照、更新数量测试与快照日期、执行数据生成及测试、重新构建 APK。

## 常用命令

```sh
python3 scripts/preview.py          # http://127.0.0.1:8765/
npm test
.tools/venv/bin/python scripts/build_data.py
python3 scripts/build_apk.py
```

构建路径：`.tools/jdk-17.0.20.1+1/Contents/Home`、`.tools/android-sdk/platforms/android-35`、`.tools/android-sdk/build-tools/35.0.0`。其他机器可设置 `ISAAC_JAVA_HOME` 和 `ANDROID_SDK_ROOT`。

调试密钥为 `.tools/isaac-debug.keystore`，已忽略。保留它用于同签名覆盖安装；不是正式发布密钥。`.tools/`、`output/`、`android/**/build/` 已忽略。

## 数据采集及历史问题

- 直接 HTTP 请求 Wiki 页面/API 返回 403；内置浏览器可正常读。采集过程没有绕过站点挑战。
- Wiki 查询间隔必须 ≥500ms；之前采用 700–750ms 并等待当前页按钮切换，再提取16条列表结果。
- 饰品页默认“忏悔”，必须切换“忏悔+”；卡牌链接可能先进入实体页，需进入“卡牌效果总览”。
- 套装页面同时显示历史版本，不能简单复制所有纯文本。原始 `.dif-cell` 旧版分支已在生成过程中剔除，猫套的 66% 效果有测试。
- 上一轮自动审批曾因工作区额度不足拒绝套装本地导入。用户要求继续后，使用同一本地导入流程重试，**现已成功保存16条，阻塞已解除**。
- 本地预览旧进程曾无响应，已停止并恢复。预览地址为 loopback，`/import` 只用于开发，不在 APK 内。
- sdkmanager 官方脚本对带空格路径出错；直接 Java 调用后又遇到远程清单下载失败。最终根据 Google 官方 repository XML 下载并解压 platform 35 与 Build Tools 35.0.0，现已完成构建。

## 来源与许可

资料署名：以撒的结合中文维基全体贡献者及灰机wiki。原创内容 CC BY-NC-SA 3.0，原站标注的英文 Wiki 翻译 CC BY-SA 3.0；整理后的对应资料沿用原许可。游戏图像、商标等归原权利人。初版是非官方、非商业参考工具；未声称获得 Wiki 或游戏官方背书。

## 0.4.0 饰品纳入背词题库（2026-09-22）

- 底部新增“背词”入口；展示图标、中英文名与编号，从四个效果摘要中选择答案。
- 当前题库 1006 条：170 主动 + 551 被动 + 97 卡牌/符文/魂石 + 188 饰品；套装不进入背词题库。
- 选项从同分类抽取，去除相同文本，Fisher–Yates 洗牌，不连续重复同一题；对错反馈、锁定重复提交、下一题及本次会话计分。当前不是间隔复习系统，未持久化学习成绩。
- 验证：原有 5 组测试通过；Chrome 自动化连续 20 题覆盖正确/错误反馈、计分、4 个唯一选项、下一题与 Back JS 回调；320/390/768px 无横向溢出，无 pageerror。390px 截图已目视检查。
- 0.4.0 APK 的 v2/v3 签名验证成功，SHA-256：`4aa80a7eff373ec439dae5a41d3e7d4c1f7f1acd4771a58eab7f94983cbfadea`。
- 0.4.1 修复排序并通过 v2/v3 签名验证，SHA-256：`1192b5764550ffbb3e095ab60fb36b162b60f00bc9181fa0323f1e545d94d0b8`。没有 Android 真机/模拟器验证。
- 饰品纳入题库后通过 6 组自动化测试；数据统计为 1006 条题目，套装仍不进入题库。

## 0.4.1 编号排序修复（2026-09-22）

- “全部图鉴”按编号排序时，主动和被动道具按共同的游戏 C 编号混排，从 C1、C2、C3 递增；不再因分类排序把主动道具整体置前。
- 新增回归测试覆盖混排顺序、空号跳过和各分类内部编号排序。
- 新 APK：`output/isaac-pocket-0.4.1-debug.apk`，SHA-256：`1192b5764550ffbb3e095ab60fb36b162b60f00bc9181fa0323f1e545d94d0b8`。
