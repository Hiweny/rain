# rain · 听雨

一个像 [Rainy Mood](https://rainymood.com/) 一样简洁宁静的雨滴主页：全屏 WebGL 雨珠玻璃效果、液态玻璃时钟、靠底部的玻璃播放条，可在「雨声 / 网易云歌单」之间切换，移动优先、PC 适配。打开它，坐在雨窗旁听雨、听歌，或者只是发呆、学习。

## 功能

- **雨珠玻璃**：[`raindrop-fx`](https://github.com/SardineFish/raindrop-fx)（WebGL2，Rainy Mood 首页同款）。远程背景统一 `fetch → ImageBitmap` 后作为纹理，避免跨域污染；按设备能力自动分级，手机端更省电流畅。
- **液态玻璃时钟**：[`liquid-glass-react`](https://github.com/rdev/liquid-glass-react)（Apple Liquid Glass，SVG 位移 + 背景模糊），显示时分秒、星期、日期，配色随背景主色智能变化。
- **播放条**：借鉴 [`Mineradio`](https://github.com/XxHuberrr/Mineradio) 的底部悬浮玻璃条（只取 UI 布局，粒子/3D/节拍均不做、代码自写）。所有控制都收进面板：音源切换、歌单 ID、音量、背景切换/换一张、显示秒、全屏、固定、播放模式、收起（只留时钟）；未固定时播放一段时间后自动收成小圆钮。
- **音乐**：参考 [`StudyWithMiku`](https://github.com/shshouse/StudyWithMiku)，输入网易云歌单 ID，经 Meting 兼容接口（多源回退）拉取并顺序/随机/单曲循环播放，失效音源自动跳过。**每次打开都会重新拉取歌单**：只要歌单 ID 不变、你在网易云更新了歌单，刷新/重进网站后会自动同步（同一页面不关闭时用当次缓存）。
- **雨声**：循环播放 Rainy Mood 的雨声音频，与歌单二选一，各自记忆音量。
- **背景两套**：
  - 雨窗（默认）：12 张绿色雨窗图，每次刷新轮流切换；
  - 动漫：随机图接口，优先 [LoliAPI](https://www.loliapi.com/)（横/竖屏自适应、全链路 CORS 友好），其后 `t.alcy.cc`、`moe.jitsu.top` 作尽力回退；全部失败时自动退回本地雨窗图，绝不黑屏。
- 偏好（音源、音量、背景、歌单 ID、固定、显示秒等）存于 localStorage。

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
  components/  RainCanvas（雨效/背景）、GlassClock（液态玻璃时钟）、PlayerBar（播放条/面板）
  hooks/       useClock、useRainAudio（雨声 + 歌单双音频队列）
  lib/         backgrounds（图源/轮换/CORS）、meting（歌单接口）、color（主色提取）、icons、storage
public/assets/bz/  12 张雨窗背景
```

## 说明与许可

- 雨声音频与 12 张雨窗图来自 Rainy Mood，仅作个人学习/自用演示，版权归原作者，请勿商用或再分发。
- 第三方库遵循各自许可：`raindrop-fx`、`liquid-glass-react` 为 MIT；StudyWithMiku、Mineradio 为 GPL-3.0，本项目仅借鉴思路与界面布局，未拷贝其代码或素材。
- 歌单由公共 Meting 兼容接口实时获取，可用性取决于第三方接口与网易云，失效时会自动切换备用源。
