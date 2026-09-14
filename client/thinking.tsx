import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { copyText, Icon, ScrollView, useRevealedText } from '@getpaseo/plugin/client/react-native';
import type { PluginClientContext, PluginTimelineItemProps } from '@getpaseo/plugin/client';
import { z } from 'zod';

const schema = z.object({ text: z.string(), phase: z.enum(['streaming', 'complete']) });
type Thinking = z.infer<typeof schema>;

/** Uses only provider-exposed text. Empty streaming items never invent a preview. */
export function firstThinkingLine(text: string) {
  return (text.split(/\r?\n/).find(line => line.trim())?.trim() ?? '')
    .replace(/^#{1,6}\s+/, '').replace(/^\*\*(.*)\*\*$/, '$1');
}

export function ThinkingCard({ item, theme, layout }: PluginTimelineItemProps<Thinking>) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState('');
  const text = useRevealedText(item.data.text, item.data.phase);
  const preview = firstThinkingLine(text);
  const running = item.data.phase === 'streaming';
  const colors = theme.colors;
  useEffect(() => setCopied(''), [item.data.text]);
  const copy = async () => {
    try { await copyText(item.data.text); setCopied('已复制'); }
    catch { setCopied('复制失败'); }
  };
  return <View testID="feishu-thinking-card" style={{ minWidth: 0, borderWidth: 1,
    borderColor: colors.border, borderRadius: 8, overflow: 'hidden', backgroundColor: colors.surface1 }}>
    <Pressable testID="feishu-thinking-toggle" accessibilityRole="button"
      accessibilityLabel={preview || (running ? '正在思考' : '暂无思考内容')}
      aria-expanded={expanded} onPress={() => setExpanded(value => !value)}
      style={{ minHeight: layout.compact ? 52 : 46, paddingHorizontal: 12, paddingVertical: 9,
        flexDirection: 'row', alignItems: 'center', gap: 9 }}>
      <View testID="feishu-thinking-icon" style={{ width: 18, height: 20, alignItems: 'center', justifyContent: 'center' }}>
        <Icon name="Brain" size={16} color={colors.foregroundMuted} />
      </View>
      <Text testID="feishu-thinking-preview" numberOfLines={1}
        style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: 20, color: colors.foregroundMuted }}>
        {preview || (running ? '正在思考…' : '暂无思考内容')}
      </Text>
      {running && <Text style={{ color: colors.accent, fontSize: 11, lineHeight: 18 }}>思考中</Text>}
      <Icon name={expanded ? 'ChevronUp' : 'ChevronDown'} size={14} color={colors.foregroundMuted} />
    </Pressable>
    {expanded && <View testID="feishu-thinking-details" style={{ borderTopWidth: 1, borderColor: colors.border,
      backgroundColor: colors.surface0, paddingHorizontal: 12, paddingBottom: 12 }}>
      <Pressable accessibilityRole="button" accessibilityLabel="复制完整思考内容" onPress={copy}
        disabled={!item.data.text.trim()} style={{ alignSelf: 'flex-end', minHeight: 44, justifyContent: 'center', paddingHorizontal: 8 }}>
        <Text style={{ color: colors.foregroundMuted, fontSize: 12 }}>{copied || '复制详情'}</Text>
      </Pressable>
      <ScrollView style={{ maxHeight: 400 }}>
        <Text selectable style={{ color: colors.foregroundMuted, fontSize: 13, lineHeight: 22 }}>
          {text || (running ? '等待思考内容…' : '暂无思考内容')}
        </Text>
      </ScrollView>
    </View>}
  </View>;
}

/** Called only by the web adapter while the exact Feishu theme is active. */
export function registerThinking(plugin: PluginClientContext) {
  const removeRenderer = plugin.addTimelineRenderer({ kind: 'thinking-preview', version: 1, schema, Component: ThinkingCard });
  const removeTransformer = plugin.addTimelineTransformer({ id: 'thinking-preview', query: { itemType: 'reasoning' },
    transform: ({ item, phase }) => ({ items: [{ type: 'plugin', kind: 'thinking-preview', version: 1, data: { text: item.text, phase } }] }),
  });
  return () => { removeTransformer(); removeRenderer(); };
}
