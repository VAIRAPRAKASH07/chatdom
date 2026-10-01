import React, { useState, useRef } from 'react';
import { X, Plus, Image as ImageIcon, Sparkles, Heart, Smile, ThumbsUp, Cat, Flame } from 'lucide-react';

interface StickerPickerProps {
  onSelectSticker: (stickerUrl: string, altText: string) => void;
  onClose: () => void;
}

const STICKER_PACKS = [
  {
    id: 'feelings',
    name: 'Feelings',
    icon: '😊',
    stickers: [
      { emoji: '😂', alt: 'Laughing' },
      { emoji: '😍', alt: 'Love Eyes' },
      { emoji: '😎', alt: 'Cool' },
      { emoji: '🥺', alt: 'Pleading' },
      { emoji: '😭', alt: 'Crying' },
      { emoji: '🤩', alt: 'Star Struck' },
      { emoji: '😤', alt: 'Frustrated' },
      { emoji: '🥳', alt: 'Party Face' },
      { emoji: '😴', alt: 'Sleepy' },
      { emoji: '🤔', alt: 'Thinking' },
      { emoji: '😇', alt: 'Angel' },
      { emoji: '🫶', alt: 'Heart Hands' },
      { emoji: '🤯', alt: 'Mind Blown' },
      { emoji: '😜', alt: 'Winking Tongue' },
      { emoji: '🤡', alt: 'Clown' },
      { emoji: '👻', alt: 'Ghost' },
    ],
  },
  {
    id: 'love',
    name: 'Love',
    icon: '❤️',
    stickers: [
      { emoji: '❤️', alt: 'Red Heart' },
      { emoji: '💕', alt: 'Two Hearts' },
      { emoji: '💖', alt: 'Sparkling Heart' },
      { emoji: '💝', alt: 'Heart Ribbon' },
      { emoji: '💘', alt: 'Heart Arrow' },
      { emoji: '🫂', alt: 'Hug' },
      { emoji: '💌', alt: 'Love Letter' },
      { emoji: '🌹', alt: 'Rose' },
      { emoji: '💐', alt: 'Bouquet' },
      { emoji: '😘', alt: 'Kiss' },
      { emoji: '🥰', alt: 'Smiling Hearts' },
      { emoji: '👩‍❤️‍👨', alt: 'Couple' },
    ],
  },
  {
    id: 'celebrate',
    name: 'Party',
    icon: '🎉',
    stickers: [
      { emoji: '🎉', alt: 'Party' },
      { emoji: '🎊', alt: 'Confetti' },
      { emoji: '🏆', alt: 'Trophy' },
      { emoji: '🥂', alt: 'Cheers' },
      { emoji: '🎁', alt: 'Gift' },
      { emoji: '🎂', alt: 'Cake' },
      { emoji: '✨', alt: 'Sparkles' },
      { emoji: '🌟', alt: 'Star' },
      { emoji: '🎶', alt: 'Music' },
      { emoji: '🚀', alt: 'Rocket' },
      { emoji: '🔥', alt: 'Fire' },
      { emoji: '💯', alt: '100' },
    ],
  },
  {
    id: 'reactions',
    name: 'Reactions',
    icon: '👍',
    stickers: [
      { emoji: '👍', alt: 'Thumbs Up' },
      { emoji: '👎', alt: 'Thumbs Down' },
      { emoji: '👏', alt: 'Clapping' },
      { emoji: '🙌', alt: 'Hands Up' },
      { emoji: '🤝', alt: 'Handshake' },
      { emoji: '✌️', alt: 'Peace' },
      { emoji: '🤞', alt: 'Fingers Crossed' },
      { emoji: '☝️', alt: 'Point Up' },
      { emoji: '👊', alt: 'Fist Bump' },
      { emoji: '🫡', alt: 'Salute' },
      { emoji: '💪', alt: 'Strong' },
      { emoji: '🙏', alt: 'Pray' },
    ],
  },
  {
    id: 'animals',
    name: 'Cute',
    icon: '🐱',
    stickers: [
      { emoji: '🐶', alt: 'Dog' },
      { emoji: '🐱', alt: 'Cat' },
      { emoji: '🦊', alt: 'Fox' },
      { emoji: '🐼', alt: 'Panda' },
      { emoji: '🐸', alt: 'Frog' },
      { emoji: '🦄', alt: 'Unicorn' },
      { emoji: '🐙', alt: 'Octopus' },
      { emoji: '🌈', alt: 'Rainbow' },
      { emoji: '☀️', alt: 'Sun' },
      { emoji: '🌊', alt: 'Wave' },
      { emoji: '🍕', alt: 'Pizza' },
      { emoji: '🍦', alt: 'Ice Cream' },
    ],
  },
];

export const StickerPicker: React.FC<StickerPickerProps> = ({
  onSelectSticker,
  onClose,
}) => {
  const [activePackIndex, setActivePackIndex] = useState(0);
  const [customStickerPreview, setCustomStickerPreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadCustomSticker = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setCustomStickerPreview(url);
    onSelectSticker(url, file.name);
    e.target.value = '';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden animate-slide-up w-72 sm:w-80">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wide">
            Stickers
          </span>
        </div>
        <div className="flex items-center gap-1">
          {/* Custom Sticker Upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-brand-500 hover:bg-brand-600 text-white text-[11px] font-semibold transition-colors"
            title="Upload image sticker"
          >
            <Plus className="w-3 h-3" />
            <span>Custom</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleUploadCustomSticker}
          />
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Category Tabs */}
      <div className="flex overflow-x-auto border-b border-slate-100 dark:border-slate-800 no-scrollbar bg-slate-50/50 dark:bg-slate-950/40">
        {STICKER_PACKS.map((pack, i) => (
          <button
            key={pack.id}
            onClick={() => setActivePackIndex(i)}
            className={`flex-shrink-0 px-3 py-1.5 text-sm transition-all ${
              activePackIndex === i
                ? 'border-b-2 border-brand-500 bg-white dark:bg-slate-900 font-bold'
                : 'hover:bg-slate-100 dark:hover:bg-slate-800 opacity-80 hover:opacity-100'
            }`}
            title={pack.name}
          >
            {pack.icon}
          </button>
        ))}
      </div>

      {/* Sticker Grid */}
      <div className="grid grid-cols-4 sm:grid-cols-6 gap-1 p-2 max-h-48 overflow-y-auto">
        {STICKER_PACKS[activePackIndex].stickers.map((s, i) => (
          <button
            key={i}
            onClick={() => onSelectSticker(`sticker:${s.emoji}`, s.alt)}
            title={s.alt}
            className="flex items-center justify-center text-3xl w-11 h-11 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all hover:scale-125 active:scale-95"
          >
            {s.emoji}
          </button>
        ))}
      </div>
    </div>
  );
};
