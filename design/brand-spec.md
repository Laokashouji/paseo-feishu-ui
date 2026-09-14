# Paseo × Feishu 视觉规范

以飞书桌面端的冷灰蓝分栏、紧凑信息密度与轻量边界为视觉基底，并将 Paseo 的工作区、Agent 与工具调用语义映射到四栏桌面框架。

```css
:root {
  --bg: oklch(97.9% 0.003 260);
  --surface: oklch(99.4% 0.001 260);
  --fg: oklch(25.4% 0.012 260);
  --muted: oklch(54.5% 0.014 260);
  --border: oklch(89.7% 0.006 260);
  --accent: oklch(58.2% 0.205 262);
}
```

- Display：`"PingFang SC", "SF Pro Display", "Helvetica Neue", sans-serif`
- Body：`"PingFang SC", "SF Pro Text", "Helvetica Neue", sans-serif`
- Mono：`"SFMono-Regular", "Cascadia Code", "Roboto Mono", monospace`

视觉语言：

1. 180 / 160 / 306 px 的前三栏固定分区，主会话区自适应；边界只用 1px 冷灰线。
2. 导航行高 36px、会话行高 60px；选中态用浅蓝灰底，不依赖高饱和描边。
3. 全局只在当前入口与可提交动作使用蓝色，其他状态通过灰阶、图标和文字表达。
4. 面板圆角克制：导航选中 7px，工具卡 8px，composer 10px。
5. 标题 16px/600，主标签 14px/510，辅助标签 12px/400，保持桌面产品密度。
