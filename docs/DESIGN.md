# rain 技术设计与调研记录

> 目标：复刻 Rainy Mood 首页的「全屏雨珠玻璃」宁静感，去掉其下方所有推广内容；叠加液态玻璃时钟与播放器，支持雨声 / 歌单音乐切换。

## 1. 调研结论（已实测）

### 1.1 雨滴：raindrop-fx（Rainy Mood 用的就是它）
- Rainy Mood 首页直接引用了 `/raindrop-fx-master/bundle/index.js`，即同一个库。
- WebGL2 实现：给一个 `<canvas>` 和一张背景图，库负责把背景做模糊雾面 + 滑落/溅开的折射雨珠。
- 用法：
  ```js
  const fx = new RaindropFX({ canvas, background: 'img.jpg' });
  await fx.start();
  await fx.setBackground('另一张.jpg'); // 换背景
  fx.resize(w, h);                       // 窗口变化
  ```
- 关键可调项：`spawnSize / spawnInterval / dropletsPerSecond / gravity / mist / mistColor / backgroundBlurSteps / raindropLightPos` 等，用来控制雨的疏密与氛围。
- 性能：1080p 默认约 600 颗雨珠、单帧 2~3ms，移动端也可跑。
- 注意：**背景图是喂给 FX 的纹理**，由它渲染出「隔着雨玻璃看到的模糊背景」，而不是再叠一个 `<img>`。

### 1.2 液态玻璃：liquid-glass-react
- React ≥18，组件 `<LiquidGlass>`，核心参数：`displacementScale / blurAmount / saturation / aberrationIntensity / elasticity / cornerRadius / padding / overLight / mode`。
- 原理：内部一层 `.glass__warp` 同时使用 `backdrop-filter: blur() saturate()` 与 SVG `feDisplacementMap`（`filter: url(#id)`）做边缘折射与色散。
- **可行性结论**：`backdrop-filter` 采样的是元素背后已合成的画面，因此能折射其下方那块正在动的 WebGL 雨滴画布（Chrome / Edge 完整生效）。Safari / Firefox 看不到位移折射，但保留毛玻璃模糊，属优雅降级。
- 性能：玻璃元素只放「时钟 + 播放条」两处，避免大面积多层 backdrop-filter 与全屏 WebGL 抢 GPU。

### 1.3 歌单音乐：StudyWithMiku 的方法（APlayer + Meting）
- 数据层：请求一个 **Meting 兼容 JSON 接口**
  `{API_BASE}?server=netease&type=playlist&id={歌单ID}&br={码率}`
  返回数组：`[{ name/title, artist/author, url, pic, lrc }, ...]`，`url` 为可播放音频地址。
- 歌单 id 存 localStorage，可在页面输入替换；平台支持 netease / tencent。
- **已实测 CORS 开放（静态站可直接 fetch）的公共接口**：
  | 接口 | CORS | 备注 |
  |---|---|---|
  | `https://api.injahow.cn/meting/` | `*` | 主用，字段 name/artist，url 为其 type=url 跳转 |
  | `https://met.api.xiaoguan.fit/api` | `*` | 备用，字段 title/author，封面直链 music.126.net |
  | `https://api.i-meto.com/meting/api` | 可取 | 备用 |
- 风险：公共实例不稳定、个别 VIP 歌曲无音源。对策：**接口地址可配置 + 多接口故障转移**；文档给出自建 Meting-API（Koyeb/Vercel 一键部署）作为长期稳妥方案。
- 用普通 `<audio>` 播放即可（不做频谱分析，故不需要音频 CORS）。

### 1.4 播放条：只取 Mineradio 的 UI
- 结构：底部悬浮胶囊 `#bottom-bar`（fixed 居中、圆角 50px、毛玻璃 + 内外高光描边）；
  顶部一条 4px（hover 5px）进度条 `#progress-bar` + 渐变填充 + hover 出现的圆形拖块；
  下方三栏网格 `#controls`：左=封面+歌名歌手，中=播放模式/上一首/播放/下一首，右=音量+时间。
- 关键观感数值：
  - 条：`width:min(1080px,100vw-56px); bottom:16px; border-radius:50px; background:rgba(0,0,0,.10); backdrop-filter:blur(12px) saturate(1.8) brightness(1.16)`，多层 inset 白色高光 + 柔和投影。
  - 播放键：58px 圆形、inset 高光；普通图标键 36px、圆角 11px；时间 12px、`tabular-nums`、半透明白。
- 明确**不做**：粒子、节拍分析、3D 歌单架、歌词舞台、Electron 桌面端。
- 许可：Mineradio 为 GPL-3.0，只借鉴布局与视觉语言、用自己的代码重写，不拷素材。

### 1.5 Rainy Mood 背景「API」扒取结果
- 它不是随机 API，而是**一组静态雨窗绿图**：`https://rainymood.com/i/bz/{1..12}.jpg`（已逐个验证 1–12 均为 200，约 46–370KB），页面当前写死 `9.jpg`。
- 雨声：`https://media.rainymood.com/0.mp3`（.m4a/.ogg 同址），约 33MB 长循环、Cloudflare 200；但热链不稳且体积大，**改用用户上传的本地雨声**。
- 随机绿色图备选（无需 key）：
  - `https://picsum.photos/{w}/{h}` 随机图（非定向绿色，可 seed）；
  - Unsplash 官方 Source 已停用，定向「绿色自然」更稳妥的做法是**内置一套精选绿色/雨窗图**随机切换，必要时再叠加 picsum 作为「惊喜」。

## 2. 目标架构

### 2.1 分层（从下到上）
1. **背景/雨滴层**：全屏 `<canvas>`（raindrop-fx）。背景图随机取自内置绿色图集，喂给 `setBackground`。
2. **UI 覆盖层**：`pointer-events:none` 容器，仅可交互控件开 `auto`。
   - 时钟：居中偏上的液态玻璃，`HH:MM`（可选秒）+ 日期/星期，细字重、tabular-nums、轻微呼吸感。
   - 播放条：底部 Mineradio 风液态玻璃胶囊。
3. **音频引擎**：统一 AudioController 管理两路——本地雨声循环、歌单队列；二者可独占切换，也可各自调音量（雨声当背景、歌单当主声）。

### 2.2 组件树（草案）
```
<App>
  <RainCanvas/>                 # raindrop-fx 封装，暴露 setBackground/疏密配置
  <Overlay>
    <GlassClock/>               # LiquidGlass 时钟
    <PlayerBar>                 # LiquidGlass + Mineradio 布局
       <SourceSwitch 雨声|歌单/>
       <PlaylistInput id/>      # 输入歌单 id（netease/tencent）
       <Progress/>              # 进度条 + 拖块
       <Transport/>             # 模式/上一首/播放/下一首
       <Volume/><TimeDisplay/>
    </PlayerBar>
  </Overlay>
  <AudioController/>            # 雨声 <audio loop> + 歌单 <audio> 队列状态机
</App>
```

### 2.3 模块
- `services/meting.ts`：取歌单、字段归一化、多接口故障转移、localStorage 记忆。
- `hooks/useRaindrop.ts`：挂载/resize/换背景/性能降级（DPR 上限、隐藏页面暂停）。
- `hooks/usePlayer.ts`：队列、播放模式（顺序/随机/单曲）、进度、音量、与雨声的互斥/混音。
- `components/Glass*`：对 LiquidGlass 的薄封装，统一宁静风参数与降级。
- `assets/backgrounds/`：内置绿色背景图集；`assets/audio/rain.*`：雨声（待上传）。

### 2.4 工程与部署
- Vite `base: '/rain/'`（项目级 GitHub Pages）；GitHub Actions：build → pages-deploy（令牌含 workflow 权限）。
- 不在仓库提交任何令牌；接口地址、默认歌单 id 走运行时配置 / localStorage。

## 3. 兼容与性能
- raindrop-fx 需 WebGL2；不支持时降级为静态背景 + CSS 雨滴/纯图。
- 液态玻璃折射仅 Chromium 完整；其余浏览器降级毛玻璃。
- DPR 封顶（≈1.5–2）、`document.hidden` 暂停模拟、玻璃元素数量克制；遵循 `prefers-reduced-motion`。
- 移动端：播放条自适应收窄，时钟字号用 clamp；首次交互后才启动音频（浏览器自动播放策略）。

## 4. 待用户确认 / 提供
1. **雨声音频**：上传一段（mp3/m4a，最好可无缝循环）。未提供前先用占位。
2. **默认网易云歌单 id**（宁静/纯音乐/lofi）；页面会保留输入框可随时换。
3. **背景方案**：A 用扒到的 rainymood 12 张雨窗绿图（仅个人用，有版权风险）／B 换免版权绿色自然图内置／C 接 picsum 随机。倾向 B 为主、随机切换。
4. 仓库可见性：默认 **public**（免费 Pages 部署需要）。
5. 视觉细节：时钟位置、强调色（建议雾青/月白而非 Mineradio 的青绿+金）、是否显示秒、是否要安静歌词。
