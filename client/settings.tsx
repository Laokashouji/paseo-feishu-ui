import type { PluginSurfaceProps } from "@getpaseo/plugin/client";
import { Icon } from "@getpaseo/plugin/client/react-native";
import { ScrollView, Text, View } from "react-native";

export function FeishuAppearanceSurface(props: PluginSurfaceProps) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: props.theme.colors.surface0 }}
      contentContainerStyle={{ padding: props.layout.compact ? 16 : 32, alignItems: "center" }}>
      <FeishuAppearance {...props} />
    </ScrollView>
  );
}

export function FeishuAppearance({ theme, layout }: PluginSurfaceProps) {
  const colors = theme.colors;
  const compact = layout.compact;
  const steps = [
    ["打开设置", "从 Paseo 侧栏进入设置（Settings）。"],
    ["进入外观", "打开外观（Appearance），找到插件主题。"],
    ["选择飞书主题", "选择「飞书 · 浅色」或「飞书 · 暗黑」。主题会立即生效，并保存在当前客户端。"],
  ] as const;

  return (
    <View style={{ width: "100%", maxWidth: 680, gap: 24 }}>
      <View style={{ gap: 10 }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          <Icon name="Palette" size={18} color={colors.accent} />
          <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "500" }}>
            PASEO / 飞书外观
          </Text>
        </View>
        <Text
          accessibilityRole="header"
          style={{ color: colors.foreground, fontSize: compact ? 22 : 24, fontWeight: "600" }}
        >
          熟悉的外观，专注当前会话
        </Text>
        <Text style={{ color: colors.foregroundMuted, fontSize: 14, lineHeight: 22 }}>
          浅色与暗黑两套配色，搭配紧凑的会话列表与清晰的消息区域。工作区、工具调用和输入框继续使用 Paseo 原生交互。
        </Text>
      </View>

      <View
        style={{
          padding: compact ? 16 : 20,
          gap: 20,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          backgroundColor: colors.surface1,
        }}
      >
        <Text
          accessibilityRole="header"
          style={{ color: colors.foreground, fontSize: 16, fontWeight: "600" }}
        >
          启用主题
        </Text>
        {steps.map(([title, description], index) => (
          <View key={title} style={{ flexDirection: "row", alignItems: "flex-start", gap: 12 }}>
            <View
              style={{
                width: 26,
                height: 26,
                borderRadius: 13,
                alignItems: "center",
                justifyContent: "center",
                backgroundColor: colors.surface2,
              }}
            >
              <Text style={{ color: colors.foregroundMuted, fontSize: 12, fontWeight: "600" }}>
                {index + 1}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500", lineHeight: 22 }}>
                {title}
              </Text>
              <Text style={{ color: colors.foregroundMuted, fontSize: 13, lineHeight: 20 }}>
                {description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <View style={{ flexDirection: compact ? "column" : "row", gap: compact ? 20 : 28 }}>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="Monitor" size={16} color={colors.foregroundMuted} />
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
              桌面与浏览器
            </Text>
          </View>
          <Text style={{ color: colors.foregroundMuted, fontSize: 13, lineHeight: 21 }}>
            宽窗口展开导航、状态分组与会话列表。思考和工具调用使用紧凑卡片，展开后可复制详情。窗口缩窄时收起辅助区域。
          </Text>
        </View>
        <View style={{ flex: 1, gap: 8 }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
            <Icon name="Smartphone" size={16} color={colors.foregroundMuted} />
            <Text style={{ color: colors.foreground, fontSize: 14, fontWeight: "500" }}>
              手机与平板 · 仅配色
            </Text>
          </View>
          <Text style={{ color: colors.foregroundMuted, fontSize: 13, lineHeight: 21 }}>
            iOS 与 Android 当前支持主题配色。聊天气泡、思考与工具调用、消息间距、输入框和导航仍是 Paseo 原生外观，尚未完成手机换肤。
          </Text>
        </View>
      </View>

      <Text style={{ color: colors.foregroundMuted, fontSize: 12, lineHeight: 20 }}>
        在外观中选择其他主题即可恢复对应布局；也可以在设置 → 插件中停用本插件。
      </Text>
    </View>
  );
}
