# 控律

面向成年人的节奏自训。用停-动法、守住边缘的节奏，以及盆底肌的收紧和放松，练习在加速、保持和停下之间稳住自己。

界面是简体中文。指令只使用「加速 / 保持 / 减速 / 停下放松 / 深呼吸 / 收紧盆底肌」这一类说法，没有露骨描述。

这不是医疗建议，也不能代替诊断或治疗，不保证任何效果。感到疼痛或不适，请立刻停止。

## 本地运行

需要 Node.js 22 或更新版本。

```bash
npm install
npm run dev
```

开发服务器监听 `http://127.0.0.1:4731`。

```bash
npm test          # 计划生成、计时、连续天数
npm run lint
npm run build     # 产物在 dist/
npm run preview   # 预览生产构建
```

## 怎么用

1. 确认已满 18 岁。选择会记在这台设备的 `localStorage` 里，下次不用再问。
2. 选择难度（简单 / 普通 / 困难）和时长（5 / 10 / 15 / 20 分钟）。
3. 按需要打开节拍声、振动、中文语音和奖励挑战。
4. 训练中跟着圆圈和指令。快要守不住时按「快到了」，会立刻停下并进入呼吸恢复，这一下会被记下来。
5. 结束后给这次的控制感打 1–5 分。进度页会留下每次记录、趋势和连续天数。

节拍用 Web Audio 的轻滴答声，振动用 `navigator.vibrate`（主要是支持该接口的手机浏览器），语音用 Web Speech API 的 `zh-CN`。屏幕常亮会尝试使用 Wake Lock。这些能力缺失时，视觉节奏仍然可用。

所有记录只在本机。可以在进度页清除练习记录；年龄确认会保留。

## 安装到手机

生产构建带有 `manifest.webmanifest` 和 `public/sw.js`。用浏览器打开已部署的站点，在系统菜单里选择「添加到主屏幕」即可离线打开。Service worker 采用网络优先、失败后用缓存，所以第一次访问需要联网。

## 部署

静态文件，没有后端。生产构建的资源路径由环境变量 `BASE_PATH` 决定（默认 `/`）。部署到子路径时需要带上结尾斜杠，例如 GitHub Pages 使用 `BASE_PATH=/konglv/`。

### GitHub Pages

本仓库的 `main` 分支会通过 `.github/workflows/pages.yml` 自动构建并发布到：

https://0xverybigorange.github.io/konglv/

也可以在仓库的 Actions 页手动触发 “Deploy to GitHub Pages”。

### Cloudflare Pages

构建命令 `npm run build`，输出目录 `dist`。也可以在本地：

```bash
npm run build
npx wrangler pages deploy dist --project-name konglv
```

### Cloudflare Workers 静态资源

仓库里的 `wrangler.jsonc` 把 `dist` 当作静态资源：

```bash
npm run build
npx wrangler deploy
```

`public/_headers` 会在 Pages 上加上 `nosniff`、`no-referrer` 和 `DENY` 帧策略。
