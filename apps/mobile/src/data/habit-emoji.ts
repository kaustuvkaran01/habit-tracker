export const HABIT_EMOJIS = [
  { emoji: '💪', label: 'Strength' }, { emoji: '🏋️', label: 'Lifting' }, { emoji: '🏃', label: 'Running' },
  { emoji: '🚴', label: 'Cycling' }, { emoji: '🧘', label: 'Meditation' }, { emoji: '🏊', label: 'Swimming' },
  { emoji: '📚', label: 'Books' }, { emoji: '✍️', label: 'Writing' }, { emoji: '🎨', label: 'Art' },
  { emoji: '🎹', label: 'Music' }, { emoji: '💻', label: 'Coding' }, { emoji: '🧠', label: 'Learning' },
  { emoji: '💧', label: 'Water' }, { emoji: '🥗', label: 'Healthy food' }, { emoji: '🍎', label: 'Apple' },
  { emoji: '☕', label: 'Coffee' }, { emoji: '🍵', label: 'Tea' }, { emoji: '💊', label: 'Medicine' },
  { emoji: '🌙', label: 'Sleep' }, { emoji: '☀️', label: 'Sunshine' }, { emoji: '🌿', label: 'Nature' },
  { emoji: '🌱', label: 'Growth' }, { emoji: '🌸', label: 'Blossom' }, { emoji: '🌊', label: 'Ocean' },
  { emoji: '🎯', label: 'Focus' }, { emoji: '🔥', label: 'Streak' }, { emoji: '✨', label: 'Sparkle' },
  { emoji: '⭐', label: 'Star' }, { emoji: '🏆', label: 'Achievement' }, { emoji: '🚀', label: 'Ambition' },
  { emoji: '🧹', label: 'Cleaning' }, { emoji: '🪥', label: 'Dental care' }, { emoji: '🛏️', label: 'Bedtime' },
  { emoji: '📵', label: 'Less screen time' }, { emoji: '💰', label: 'Saving' }, { emoji: '📝', label: 'Journaling' },
  { emoji: '❤️', label: 'Self care' }, { emoji: '🙏', label: 'Gratitude' }, { emoji: '🐶', label: 'Pet care' },
  { emoji: '🚶', label: 'Walking' }, { emoji: '⚽', label: 'Sport' }, { emoji: '🧗', label: 'Climbing' },
];

// Validate a single emoji sequence, including joined emoji, skin tones, flags and keycaps.
// Unicode property escapes work without a grapheme-segmentation package or native picker.
const EMOJI = /^(?:\p{Regional_Indicator}{2}|[#*0-9]\uFE0F?\u20E3|(?:\p{Emoji_Modifier_Base}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?|\p{Extended_Pictographic}[\uFE0E\uFE0F]?)(?:\u200D(?:\p{Emoji_Modifier_Base}[\uFE0E\uFE0F]?\p{Emoji_Modifier}?|\p{Extended_Pictographic}[\uFE0E\uFE0F]?))*(?:[\u{E0020}-\u{E007E}]+\u{E007F})?)$/u;

export function normalizedHabitEmoji(value: string): string | null {
  const emoji = value.trim();
  return EMOJI.test(emoji) ? emoji : null;
}
