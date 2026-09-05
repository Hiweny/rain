# rain · 听雨

一个像 [Rainy Mood](https://rainymood.com/) 一样简洁宁静的雨滴主页：全屏 WebGL 雨珠玻璃效果、顶部锁屏风的衬线时钟与一句古诗词、底部通透磨砂播放条，可在「雨声 / 网易云歌单」之间切换，移动优先、PC 适配。打开它，坐在雨窗旁听雨、听歌，或者只是发呆、学习。

- 在线体验：https://hiweny.github.io/rain/

## 功能

- **雨珠玻璃**：[`raindrop-fx`](https://github.com/SardineFish/raindrop-fx)（WebGL2，Rainy Mood 首页同款），参数与官网保持一致（库默认值），还原大颗立体透镜水珠。
- **时钟与诗词（纯文字）**：靠上的手机锁屏风时钟，只显示时:分、星期、日期，数字使用 Rainy Mood 官网同款 **Marcellus SC**（自托管），中文用 Noto Serif SC；下方一句古诗词，每 24 秒淡入轮换（Hitokoto）。
- **播放条**：借鉴 [`Mineradio`](https://github.com/XxHuberrr/Mineradio) 的强磨砂通透胶囊（只取质感，粒子/3D 均不做）。默认常驻，可手动收成一个播放键，点页面底部任意位置唤起。
- **音乐**：参考 [`StudyWithMiku`](https://github.com/shshouse/StudyWithMiku)，输入网易云歌单 ID 即播；支持顺序/随机/单曲循环、**标准 / 高音质 / 无损三档音质**、会员歌曲完整播放（见下）；**进度与当前曲目本地记忆，刷新后续播**；每次进入重新拉取歌单，歌单 ID 不变即在网易云更新后自动同步。
- **雨声**：循环播放 Rainy Mood 雨声音频，与歌单二选一、各自记忆音量与进度；首次触摸页面时无感解锁自动播放。
- **背景两套**：雨窗（默认，12 张绿色雨窗图刷新轮换）/ 动漫随机图（LoliAPI 优先，多源回退）。动漫背景是「阅图模式」：可开关雨滴、调亮度、18 秒**交叉淡入**轮播。
- 主题强调色随背景主色智能变化；偏好存于 localStorage。

---

## 雨滴效果 + 雨窗背景是怎么实现的（可复用）

这部分是项目的精髓，单独讲清楚，方便搬到别处。

### 1. 雨珠玻璃的原理（raindrop-fx）

库用 WebGL2 在一张**模糊背景**上模拟「隔着沾雨的玻璃看窗外」：

1. 先把背景图做几级降采样，得到一张模糊金字塔（`backgroundBlurSteps`），这是「被雨水晕开的窗外」；
2. 每颗雨滴是一个带**法线贴图**的小透镜，片元着色器里按法线对模糊背景做**折射采样（refract）**，再叠高光（specular），于是水珠有了立体通透感；
3. 模拟器持续生成小水滴（mist/droplets），它们会随机长大、相邻融合、到一定尺寸后沿玻璃滑落，留下水痕。

**最关键的一条经验：Rainy Mood 官网几乎全部使用库的默认参数。** 扒它首页内联代码就是 `new RaindropFX({ canvas, background: '/i/bz/6.jpg' }).start()`。想要「官网那味」，不要乱调参数，直接用默认值即可，尤其注意选项名是 **`dropletsPerSeconds`（带 s）**，拼错会被静默忽略。

### 2. 首帧不黑屏、加载不闪烁

库每帧会用**不透明黑色清屏**，如果背景还没解码好，屏幕就是纯黑；而先空背景 `start()` 再 `setBackground()` 还会把昂贵的模糊金字塔算两遍。本项目的做法：

```ts
// 1) canvas 下面垫一张同图的静态 CSS 图层，解码期间先用它铺满，眼睛根本等不到黑屏
// 2) 先把图片解码成 ImageBitmap，再【直接传进构造函数】，首帧就带背景
const bitmap = await createImageBitmap(await fetchBlob(url))
const fx = new RaindropFX({ canvas, background: bitmap, dropletsPerSeconds: 500 })
await fx.start()
```

- `.bg-photo` 静态层固定在 canvas 下方，带一点 `blur()/saturate()`，与 WebGL 的模糊背景观感一致；
- body 底色用深绿而非纯黑，极端情况下也不刺眼。

### 3. 远程图片为什么要先 fetch 成 ImageBitmap

库内部是用 `new Image()` 加载背景的，**不带 `crossOrigin`**。直接把跨域动漫图 URL 喂给它，画布会被「污染」（tainted），WebGL 直接报错。统一走一遍：

```ts
const blob = await fetch(url, { mode: 'cors' }).then((r) => r.blob())
const bitmap = await createImageBitmap(blob)   // 同源化，纹理安全
const objectURL = URL.createObjectURL(blob)    // 同一份数据同时给静态图层，保证两层是同一张图
```

### 4. 轮播交叉淡入，遮住重建闪烁

`setBackground()` 要重建模糊金字塔，瞬间会闪。做法是在 canvas **上方**放一个交叉过渡层：换图前把「当前旧画面」定格在这层，底层换成新图、同时重建 WebGL，再让旧层用 ~0.95s 缓慢淡出，肉眼看到的就是平滑的交叉溶解（见 `RainCanvas.tsx` 的 `crossfadeTo`）。

### 5. 性能分级与尺寸

- DPR 封顶（桌面 2、触屏/低端 1.5），`spawnLimit`、`dropletsPerSeconds` 在低端机下调；
- 监听 `resize/orientationchange` 调 `fx.resize()`，切后台 `stop()`、回前台 `start()`；
- WebGL2 不可用时降级为静态模糊图（阅图模式）。

### 6. 雨窗背景素材

12 张绿色雨窗图放在 `public/assets/bz/1..12.jpg`，用 `localStorage` 记一个游标，每次刷新轮流切换；因为是同源本地图，可直接作为纹理，也是首帧兜底图。

---

## 会员歌曲为什么能完整播放 + 音质档位

直连网易 CDN 的 Meting 源，对会员歌曲往往只返回约 30~60 秒的**试听片段**（实测多首被截到固定的 721023 字节）。StudyWithMiku 用的后端 `api.qijieya.cn` 返回的是**经服务器代理的 `type=url` 流式地址**，会员歌曲也能取到完整文件。本项目把它设为首选源、其余源回退。

音质就是请求里的 `br`（码率上限，单位 kbps，网易云的约定值）：

| 档位 | br | 形态 | 适用 |
| :-- | --: | :-- | :-- |
| 标准 | 320 | 320k mp3 | 省流 / 弱网 |
| 高音质 | 740 | 高码率 | 手机默认 |
| 无损 | 2000 | FLAC，单首常 20~60MB | 桌面 / Wi‑Fi 默认 |

首次进入按 `navigator.connection`（saveData / effectiveType / cellular）与是否触屏**自适应选档**，之后以用户手动选择为准并持久化；切换音质会用新码率重新拉取歌单并尽量续播当前曲目。

## 技术栈

React 19 + Vite + TypeScript，纯静态构建，GitHub Actions 部署到 GitHub Pages（`base: /rain/`）。

## 本地开发

```bash
npm install
npm run dev       # 开发预览
npm run build     # 类型检查 + 产出 dist/
npm run preview   # 预览构建产物（/rain/）
```

## 目录

```
src/
  components/  RainCanvas（雨效/背景/交叉过渡/阅图）、Clock（时钟+诗词）、PlayerBar（播放条/面板）
  hooks/       useClock、useQuote、useRainAudio（雨声+歌单双音频队列/进度记忆/音质）
  lib/         backgrounds（图源/轮换/CORS）、meting（歌单接口/音质/VIP 源）、quote、color、icons、storage
public/assets/bz/   12 张雨窗背景
public/fonts/       自托管 Marcellus SC
```

## 说明与许可

- 雨声音频、12 张雨窗图与 Marcellus SC 字体来自/同源于 Rainy Mood，仅作个人学习/自用演示，版权归原作者，请勿商用或再分发；Marcellus SC 以 SIL OFL 授权。
- 第三方库遵循各自许可：`raindrop-fx` 为 MIT；StudyWithMiku、Mineradio 为 GPL-3.0，本项目仅借鉴思路与界面布局，未拷贝其代码或素材。
- 歌单由公共 Meting 兼容接口实时获取，可用性取决于第三方接口与网易云，失效时自动切换备用源。
