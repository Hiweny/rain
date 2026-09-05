# rain · 听雨

一个像 [Rainy Mood](https://rainymood.com/) 一样简洁宁静的雨滴主页：全屏 WebGL 雨珠玻璃效果、顶部锁屏风的衬线时钟与一句古诗词、底部通透磨砂播放条，可在「雨声 / 网易云歌单」之间切换，移动优先、PC 适配。打开它，坐在雨窗旁听雨、听歌，或者只是发呆、学习。

## 功能

- **雨珠玻璃**：[`raindrop-fx`](https://github.com/SardineFish/raindrop-fx)（WebGL2，Rainy Mood 首页同款）。**参数与官网保持一致（库默认值）**，还原大颗立体透镜水珠；远程背景统一 `fetch → ImageBitmap` 后在构造时直接作为纹理传入，首帧即带图、不黑屏；背景解码前先用同图静态层即时铺满；按设备能力自动分级，手机端更省电流畅。
- **时钟与诗词（纯文字，无玻璃容器）**：靠上的手机锁屏风位置，只显示时:分（无秒）、星期与日期；数字使用 Rainy Mood 官网同款 **Marcellus SC**（自托管，离线/国内网络也一致），中文使用 Noto Serif SC。时钟下方是一句古诗词，每 24 秒轻缓轮换，来源为开放跨域的 [Hitokoto](https://hitokoto.cn/)（诗词/文学分类）。
- **播放条**：借鉴 [`Mineradio`](https://github.com/XxHuberrr/Mineradio) 的底部悬浮胶囊，只取其**强磨砂、背景色彩透过来**的质感（`backdrop-filter` 模糊+饱和），粒子/3D/节拍均不做、代码自写。默认常驻不自动收起；所有控制收进面板：音源切换、歌单 ID、音量、背景切换/换一张、全屏、播放模式、手动收起。收起后只剩一个播放键，**点击页面底部任意位置即可唤起**。
- **动漫「阅图模式」**：切到动漫背景时，面板出现阅图选项——可独立开关雨滴效果（关闭即看清晰原图）、调节亮度（压暗过亮的图）、开启 18 秒自动轮播。
- **音乐**：参考 [`StudyWithMiku`](https://github.com/shshouse/StudyWithMiku)，输入网易云歌单 ID，经 Meting 兼容接口（多源回退）拉取并顺序/随机/单曲循环播放，失效音源自动跳过。**每次打开都会重新拉取歌单**：只要歌单 ID 不变、你在网易云更新了歌单，刷新/重进网站后会自动同步。
- **雨声**：循环播放 Rainy Mood 的雨声音频，与歌单二选一，各自记忆音量。浏览器自动播放被拦截时，在第一次触摸/点击页面时无感解锁。
- **背景两套**：
  - 雨窗（默认）：12 张绿色雨窗图，每次刷新轮流切换；
  - 动漫：随机图接口，优先 [LoliAPI](https://www.loliapi.com/)（横/竖屏自适应、全链路 CORS 友好），其后 `t.alcy.cc`、`moe.jitsu.top` 作尽力回退；全部失败时自动退回本地雨窗图，绝不黑屏。
- 主题强调色随当前背景主色智能变化；偏好存于 localStorage。

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
  components/  RainCanvas（雨效/背景/阅图）、Clock（时钟+诗词）、PlayerBar（播放条/面板）
  hooks/       useClock、useQuote、useRainAudio（雨声 + 歌单双音频队列）
  lib/         backgrounds（图源/轮换/CORS）、meting（歌单接口）、quote（诗词）、color（主色提取）、icons、storage
public/assets/bz/   12 张雨窗背景
public/fonts/       自托管 Marcellus SC
```

## 说明与许可

- 雨声音频、12 张雨窗图与 Marcellus SC 字体来自/同源于 Rainy Mood，仅作个人学习/自用演示，版权归原作者，请勿商用或再分发。Marcellus SC 以 SIL OFL 授权。
- 第三方库遵循各自许可：`raindrop-fx` 为 MIT；StudyWithMiku、Mineradio 为 GPL-3.0，本项目仅借鉴思路与界面布局，未拷贝其代码或素材。
- 歌单由公共 Meting 兼容接口实时获取，可用性取决于第三方接口与网易云，失效时会自动切换备用源。
