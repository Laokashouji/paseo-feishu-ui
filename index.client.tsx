import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installFeishuSkin } from "./client/web";
import { FeishuAppearance, FeishuAppearanceSurface } from "./client/settings";

export default function contribute(plugin: PluginClientContext) {
  plugin.addTheme({
    id: "feishu-light",
    name: "飞书 · 浅色",
    appearance: "light",
    colors: {
      background: "#fafafa",
      foreground: "#1f2329",
      raised: "#fdfdfd",
      control: "#e7ebf7",
      border: "#dee0e3",
      mutedForeground: "#646a73",
      accent: "#3370ff",
      ring: "#3370ff",
    },
  });
  plugin.addTheme({
    id: "feishu-dark",
    name: "飞书 · 暗黑",
    appearance: "dark",
    colors: {
      background: "#181818",
      foreground: "#d1d1d1",
      raised: "#2c2c2c",
      control: "#1e1f22",
      border: "#3b3b3b",
      mutedForeground: "#9b9b9b",
      accent: "#4c88ff",
      ring: "#4c88ff",
    },
  });

  plugin.addSurface("appearance", FeishuAppearanceSurface);
  plugin.addSettingsScreen({
    id: "appearance", title: "飞书外观", icon: "Palette", Component: FeishuAppearance,
  });
  plugin.addCommandCenterItem({
    id: "open-appearance",
    title: "飞书外观设置",
    icon: "Palette",
    keywords: ["feishu", "theme", "appearance", "飞书", "主题", "外观"],
    context: "global",
    onSelect({ openSettings }) {
      openSettings("appearance");
    },
  });
  return installFeishuSkin(plugin);
}
