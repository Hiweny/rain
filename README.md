# rain · 宁静雨滴主页

一个像 [Rainy Mood](https://rainymood.com/) 一样简洁宁静的雨滴主页：全屏 WebGL 雨珠玻璃效果、液态玻璃时钟、可在「雨声 / 网易云歌单」之间切换的优雅播放器。

## 组成

- **雨滴效果**：[`raindrop-fx`](https://github.com/SardineFish/raindrop-fx)（WebGL2，Rainy Mood 首页同款）。
- **液态玻璃**：[`liquid-glass-react`](https://github.com/rdev/liquid-glass-react)（Apple Liquid Glass，用于时钟与播放条容器）。
- **歌单音乐**：参考 [`StudyWithMiku`](https://github.com/shshouse/StudyWithMiku) 的做法，输入歌单 id，经 Meting 兼容接口取歌并播放。
- **播放条外观**：借鉴 [`Mineradio`](https://github.com/XxHuberrr/Mineradio) 的底部悬浮玻璃播放条（只取 UI，不含粒子/3D/节拍）。
- **雨声**：本地音频循环（`public/audio/rain.*`），与歌单音乐二选一或各自调音量。

## 技术栈

React 18 + Vite + TypeScript，纯静态构建，GitHub Actions 部署到 GitHub Pages。

## 状态

调研与设计阶段，见 [`docs/DESIGN.md`](docs/DESIGN.md)。

## 本地开发

```bash
npm install
npm run dev      # 本地预览
npm run build    # 产出 dist/
npm run preview  # 预览构建产物
```

## 许可

第三方库遵循其各自许可（raindrop-fx / liquid-glass-react 为 MIT；StudyWithMiku、Mineradio 为 GPL-3.0，仅借鉴思路与界面布局，不拷贝其代码/素材）。
