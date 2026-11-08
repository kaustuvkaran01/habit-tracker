import { space, layout, control, radius, typeSize } from '../components/design-tokens';
import { useTranslation } from '../i18n/context';
import { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import Pressable from '../components/haptic-pressable';
import AppIcon from '../components/app-icon';
import { Chevron, RoundButton } from '../components/habit-ui';
import { HABIT_ICONS } from '../data/habit-icons';
import { HABIT_EMOJIS, normalizedHabitEmoji } from '../data/habit-emoji';
import { type HabitIconName } from '../data/habit-types';
import { createThemedStyles, useTheme } from '../components/theme';

const EXTRA_EMOJIS = [
  { title: 'Activities', symbols: [['🎃','Halloween'],['🎄','Christmas'],['🎆','Fireworks'],['🎉','Celebrate'],['🎁','Gift'],['🎟️','Tickets'],['🎖️','Medal'],['🎲','Dice'],['🧩','Puzzle'],['🎮','Games'],['🎤','Singing'],['🎧','Listening']] },
  { title: 'Sports', symbols: [['🏀','Basketball'],['🏐','Volleyball'],['🏈','Football'],['🎾','Tennis'],['🥏','Flying disc'],['🎳','Bowling'],['🏓','Table tennis'],['🏸','Badminton'],['🥊','Boxing'],['🥋','Martial arts'],['🏒','Hockey'],['⛳','Golf'],['🛼','Skating'],['🎣','Fishing'],['🤿','Diving'],['🛶','Paddling']] },
  { title: 'Food and beverages', symbols: [['🍌','Banana'],['🍊','Orange'],['🍓','Strawberry'],['🥕','Carrot'],['🥑','Avocado'],['🥦','Broccoli'],['🍲','Soup'],['🍳','Cooking'],['🍞','Bread'],['🥚','Egg'],['🐟','Fish'],['🍕','Pizza'],['🍔','Burger'],['🍟','Fries'],['🍿','Popcorn'],['🍰','Cake'],['🧃','Juice'],['🥛','Milk']] },
  { title: 'Art', symbols: [['🖌️','Painting'],['🖼️','Gallery'],['📷','Photography'],['🎬','Cinema'],['🎭','Theatre'],['🎸','Guitar'],['🥁','Drums'],['🎻','Violin'],['🎺','Trumpet'],['🎷','Saxophone'],['🧶','Knitting'],['🪡','Sewing']] },
  { title: 'Financial', symbols: [['💵','Money'],['💳','Card'],['🪙','Budget'],['🏦','Bank'],['📈','Investing'],['💼','Work'],['🧾','Expenses'],['🛒','Shopping']] },
  { title: 'Nature', symbols: [['🌳','Tree'],['🌲','Forest'],['🌵','Cactus'],['🍀','Clover'],['🌻','Flower'],['🐱','Cat'],['🐾','Pet'],['🦋','Butterfly'],['🐝','Bee'],['🏕️','Camping'],['⛰️','Mountain'],['🌈','Rainbow']] },
] as const;
const EMOJI_GROUPS = [
  { title: 'Everyday', items: HABIT_EMOJIS },
  ...EXTRA_EMOJIS.map((group) => ({ title: group.title, items: group.symbols.map(([emoji,label]) => ({ emoji, label })) })),
];
const ICON_CATEGORIES = ['Activities', 'Sports', 'Food and beverages', 'Art', 'Financial', 'Nature', 'Miscellaneous'];

export default function HabitIconScreen({ icon, emoji, onChange, onBack }: {
  icon: HabitIconName; emoji: string; onChange: (icon: HabitIconName, emoji: string) => void; onBack: () => void;
}) {
  const { t, locale } = useTranslation();
  const styles = useStyles();
  const { colors, mode } = useTheme();
  const [tab, setTab] = useState<'icons' | 'emoji'>(icon === 'emoji' ? 'emoji' : 'icons');
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState('');
  const [custom, setCustom] = useState(icon === 'emoji' ? emoji : '');
  const [width, setWidth] = useState(340);
  const columns = Math.max(3, Math.min(8, Math.floor((width + space.xs) / (control.regular + space.xs))));
  const tileSize = (width - (columns - 1) * space.xs) / columns;
  const matches = (label: string, category: string, emoji = '') => (label + ' ' + emoji + ' ' + category + ' ' + t(label) + ' ' + t(category)).toLocaleLowerCase(locale).includes(query.trim().toLocaleLowerCase(locale));
  const iconGroups = ICON_CATEGORIES.map((title) => ({ title, items: HABIT_ICONS.filter((item) => item.category === title && matches(item.label, title)) }));
  const emojiGroups = EMOJI_GROUPS.map((group) => ({ ...group, items: group.items.filter((item) => matches(item.label, group.title, item.emoji)) }));
  const empty = tab === 'icons' ? iconGroups.every((group) => !group.items.length) : emojiGroups.every((group) => !group.items.length);
  return <View style={styles.screen}>
    <View style={styles.grabber} />
    <View style={styles.header}>
      <RoundButton label={t("Back to habit editor")} onPress={onBack}><Chevron direction="left" /></RoundButton>
      <View accessibilityRole="tablist" accessibilityLabel={t("Icon type")} style={styles.tabs}>
        {(['icons','emoji'] as const).map((value) => <Pressable key={value} accessibilityRole="tab" accessibilityState={{ selected: tab === value }}
          onPress={() => setTab(value)} style={[styles.tab, tab === value && styles.selectedTab]}><Text style={[styles.tabText, tab === value && styles.selectedText]}>{value === 'icons' ? t('Icon') : t('Emoji')}</Text></Pressable>)}
      </View>
      <RoundButton label={searching ? t('Close icon search') : t('Search icons and emoji')} onPress={() => { setSearching(!searching); setQuery(''); }}><AppIcon name={searching ? 'close' : 'search'} size={20} /></RoundButton>
    </View>
    {searching && <View style={styles.searchContainer}><TextInput autoFocus accessibilityLabel={t("Search icons and emoji")} value={query} onChangeText={setQuery} placeholder={t("Search by name or category")}
      placeholderTextColor={colors.muted} keyboardAppearance={mode} autoCorrect={false} style={styles.search} /></View>}
    <ScrollView key={tab} keyboardShouldPersistTaps="handled" indicatorStyle={mode === 'dark' ? 'white' : 'black'} contentContainerStyle={styles.scroll}>
      <View style={styles.content} onLayout={(event) => setWidth(event.nativeEvent.layout.width)}>
        {tab === 'emoji' && <View style={styles.custom}>
          <Text style={styles.label}>{t("YOUR OWN EMOJI")}</Text>
          <View style={styles.customRow}><TextInput accessibilityLabel={t("Custom habit emoji")} value={custom} onChangeText={setCustom} maxLength={40}
            keyboardAppearance={mode} placeholder={t("Type or paste an emoji")} placeholderTextColor={colors.muted} style={styles.customInput} />
            <Pressable accessibilityRole="button" accessibilityLabel={t("Use custom emoji")} disabled={!normalizedHabitEmoji(custom)} onPress={() => onChange('emoji', normalizedHabitEmoji(custom)!)}
              style={[styles.use, !normalizedHabitEmoji(custom) && styles.disabled]}><Text style={styles.useText}>{t("Use")}</Text></Pressable>
          </View>
          {!!custom && !normalizedHabitEmoji(custom) && <Text style={styles.error}>{t("Choose one emoji.")}</Text>}
        </View>}
        {tab === 'icons' ? iconGroups.map((group) => group.items.length > 0 && <View key={group.title} style={styles.group}>
          <Text style={styles.label}>{t(group.title).toLocaleUpperCase(locale)}</Text><View accessibilityRole="radiogroup" accessibilityLabel={t(group.title)} style={styles.grid}>
            {group.items.map((item) => <Pressable key={item.id} accessibilityRole="radio" accessibilityLabel={t(item.label)} accessibilityState={{ checked: icon === item.id }}
              onPress={() => onChange(item.id, '')} style={[styles.tile, { width: tileSize, height: tileSize }, icon === item.id && styles.selectedTile]}>
              <AppIcon name={item.id} size={Math.min(35, tileSize * 0.63)} color={colors.icon} strokeWidth={1.7} />
            </Pressable>)}
          </View>
        </View>) : emojiGroups.map((group) => group.items.length > 0 && <View key={group.title} style={styles.group}>
          <Text style={styles.label}>{t(group.title).toLocaleUpperCase(locale)}</Text><View accessibilityRole="radiogroup" accessibilityLabel={t(group.title)} style={styles.grid}>
            {group.items.map((item) => <Pressable key={item.emoji} accessibilityRole="radio" accessibilityLabel={t(item.label)} accessibilityState={{ checked: icon === 'emoji' && emoji === item.emoji }}
              onPress={() => { setCustom(item.emoji); onChange('emoji', item.emoji); }}
              style={[styles.tile, { width: tileSize, height: tileSize }, icon === 'emoji' && emoji === item.emoji && styles.selectedTile]}>
              <Text allowFontScaling={false} style={{ fontSize: Math.min(32, tileSize * 0.57) }}>{item.emoji}</Text>
            </Pressable>)}
          </View>
        </View>)}
        {empty && <Text style={styles.empty}>{t("No matches. Try another name or category.")}</Text>}
      </View>
    </ScrollView>
  </View>;
}
const useStyles = createThemedStyles((c) => StyleSheet.create({
  screen: { flex: 1, backgroundColor: c.background }, grabber: { width: 42, height: 5, borderRadius: 3, alignSelf: 'center', backgroundColor: c.controlBorder, marginTop: 8 }, header: { width: '100%', maxWidth: layout.content + layout.inset * 2, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: space.xs, paddingHorizontal: layout.inset, paddingVertical: space.sm },
  tabs: { flex: 1, flexDirection: 'row', borderRadius: radius.control, padding: space.xxs, borderWidth: 1, borderColor: c.border, backgroundColor: c.panel },
  tab: { flex: 1, minHeight: control.touch, alignItems: 'center', justifyContent: 'center', borderRadius: radius.small, paddingVertical: space.xs, paddingHorizontal: space.xxs }, selectedTab: { backgroundColor: c.selected },
  tabText: { color: c.muted, fontSize: typeSize.label, fontWeight: '600', textAlign: 'center' }, selectedText: { color: c.accentText },
  searchContainer: { width: '100%', maxWidth: layout.content + layout.inset * 2, alignSelf: 'center', paddingHorizontal: layout.inset },
  search: { padding: space.sm, marginBottom: space.sm, borderRadius: radius.control, backgroundColor: c.panel, color: c.text, minHeight: control.regular },
  scroll: { padding: layout.inset, paddingTop: layout.section, paddingBottom: space.xl }, content: { width: '100%', maxWidth: layout.content, alignSelf: 'center', gap: layout.section },
  group: { gap: space.sm }, label: { color: c.subtle, fontSize: 12, letterSpacing: 0.7 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.xs },
  tile: { borderRadius: radius.control, borderCurve: 'continuous', borderWidth: 1, borderColor: c.border, backgroundColor: c.panel, alignItems: 'center', justifyContent: 'center' },
  selectedTile: { borderWidth: 2, borderColor: c.accent, backgroundColor: c.accentPanel }, custom: { gap: space.sm }, customRow: { flexDirection: 'row', gap: space.xs },
  customInput: { flex: 1, minHeight: control.regular, padding: space.sm, borderRadius: radius.control, backgroundColor: c.panel, color: c.text },
  use: { minWidth: control.primary, padding: space.sm, justifyContent: 'center', alignItems: 'center', backgroundColor: c.accent, borderRadius: radius.control, minHeight: control.regular },
  useText: { color: c.onAccent, fontWeight: '600' }, error: { color: c.error, fontSize: 13 }, disabled: { opacity: 0.35 },
  empty: { color: c.muted, textAlign: 'center', padding: space.md },
}));
