import React, { useState } from 'react';
import { 
  Check, 
  CheckCheck, 
  Smile, 
  Reply, 
  Pencil, 
  Trash2, 
  Copy, 
  FileText,
  MapPin,
  ExternalLink,
  User,
  MessageSquare,
  Mic,
  Play,
  Pause,
  Download
} from 'lucide-react';
import { ReactionPicker } from './ReactionPicker';
import { formatMessageTime, copyToClipboard } from '../../lib/utils';
import { useRealtime } from '../../contexts/RealtimeContext';
import type { Message } from '../../types';

interface MessageBubbleProps {
  message: Message;
  isMe: boolean;
  onReply: (message: Message) => void;
  onEdit: (message: Message) => void;
  onDelete: (messageId: string) => void;
  onReact: (messageId: string, emoji: string) => void;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  isMe,
  onReply,
  onEdit,
  onDelete,
  onReact,
}) => {
  const { startConversationWithUser } = useRealtime();
  const [showReactionPicker, setShowReactionPicker] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const handleCopy = async () => {
    if (message.content) {
      const ok = await copyToClipboard(message.content);
      if (ok) {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    }
  };

  const toggleAudioPlay = () => {
    if (!audioRef.current) return;
    if (isPlayingAudio) {
      audioRef.current.pause();
      setIsPlayingAudio(false);
    } else {
      audioRef.current.play();
      setIsPlayingAudio(true);
    }
  };

  const isStickerMessage =
    message.message_type === 'sticker' ||
    (message.message_type === 'image' && message.attachment_url?.startsWith('sticker:'));

  const getFileExtension = (filename?: string) => {
    if (!filename) return 'FILE';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toUpperCase() : 'FILE';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`group relative flex flex-col mb-3 select-text ${
        isMe ? 'items-end' : 'items-start'
      }`}
    >
      {/* Floating Hover Action Menu */}
      {!message.is_deleted && (
        <div
          className={`absolute -top-7 opacity-0 group-hover:opacity-100 transition-opacity z-10 flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-1.5 py-0.5 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm ${
            isMe ? 'right-0' : 'left-0'
          }`}
        >
          <button
            onClick={() => setShowReactionPicker(!showReactionPicker)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="React"
          >
            <Smile className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => onReply(message)}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Reply"
          >
            <Reply className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleCopy}
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Copy text"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
          </button>

          {isMe && (
            <>
              <button
                onClick={() => onEdit(message)}
                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Edit message"
              >
                <Pencil className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => onDelete(message.id)}
                className="p-1 text-slate-400 hover:text-rose-500 rounded-full hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                title="Delete message"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          {showReactionPicker && (
            <ReactionPicker
              onSelectEmoji={(emoji) => onReact(message.id, emoji)}
              onClose={() => setShowReactionPicker(false)}
            />
          )}
        </div>
      )}

      {/* Special Clean Sticker View without heavy bubble */}
      {isStickerMessage ? (
        <div className="flex flex-col items-center my-1 hover:scale-105 transition-transform duration-200">
          {message.attachment_url?.startsWith('sticker:') ? (
            <div className="text-7xl leading-none drop-shadow-md select-none">
              {message.attachment_url.replace('sticker:', '')}
            </div>
          ) : (
            <img
              src={message.attachment_url}
              alt="Sticker"
              className="w-32 h-32 object-contain drop-shadow-md"
            />
          )}
          <div className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
            {formatMessageTime(message.created_at)}
          </div>
        </div>
      ) : (
        /* Regular Speech Bubble Container */
        <div
          className={`relative max-w-[85%] sm:max-w-md md:max-w-lg rounded-2xl p-3 shadow-xs ${
            message.is_deleted
              ? 'bg-slate-100 dark:bg-slate-800/60 text-slate-400 italic text-xs border border-dashed border-slate-300 dark:border-slate-700'
              : isMe
              ? 'bg-brand-500 text-white rounded-tr-xs'
              : 'bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100 border border-slate-200/80 dark:border-slate-800 rounded-tl-xs'
          }`}
        >
          {/* Reply Quote Banner */}
          {message.reply_to_message && !message.is_deleted && (
            <div
              className={`mb-2 p-2 rounded-xl text-xs border-l-2 ${
                isMe
                  ? 'bg-brand-600/60 border-brand-200 text-white/90'
                  : 'bg-slate-50 dark:bg-slate-950 border-brand-500 text-slate-600 dark:text-slate-400'
              }`}
            >
              <span className="font-semibold text-[11px] block text-brand-300 dark:text-brand-400">
                {message.reply_to_message.sender_name}
              </span>
              <p className="truncate text-[11px] mt-0.5 opacity-90">
                {message.reply_to_message.content}
              </p>
            </div>
          )}

          {/* Image Attachment */}
          {message.message_type === 'image' && message.attachment_url && (
            <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
              <img
                src={message.attachment_url}
                alt="Attachment"
                className="w-full h-auto object-cover max-h-64 rounded-xl"
                loading="lazy"
              />
            </div>
          )}

          {/* Video Attachment */}
          {message.message_type === 'video' && message.attachment_url && (
            <div className="mb-2 rounded-xl overflow-hidden max-w-sm">
              <video
                src={message.attachment_url}
                controls
                className="w-full h-auto max-h-64 rounded-xl bg-black"
                preload="metadata"
              />
            </div>
          )}

          {/* Location Attachment Card */}
          {message.message_type === 'location' && (
            <div className="mb-2 rounded-2xl overflow-hidden border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/80 dark:bg-slate-950 text-slate-900 dark:text-slate-100 shadow-sm max-w-sm">
              {/* Map View Frame */}
              <div className="relative h-40 bg-slate-200 dark:bg-slate-800 flex items-center justify-center">
                <iframe
                  title="Shared Location Map"
                  width="100%"
                  height="100%"
                  frameBorder="0"
                  scrolling="no"
                  src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                    (message.attachment_meta?.longitude || 77.5946) - 0.008
                  }%2C${
                    (message.attachment_meta?.latitude || 12.9716) - 0.008
                  }%2C${
                    (message.attachment_meta?.longitude || 77.5946) + 0.008
                  }%2C${
                    (message.attachment_meta?.latitude || 12.9716) + 0.008
                  }&layer=mapnik&marker=${
                    message.attachment_meta?.latitude || 12.9716
                  }%2C${message.attachment_meta?.longitude || 77.5946}`}
                  className="w-full h-full pointer-events-none opacity-90"
                />
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <MapPin className="w-8 h-8 text-emerald-600 fill-emerald-600 drop-shadow-md animate-bounce" />
                </div>
              </div>

              {/* Location Info Banner */}
              <div className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 leading-snug">
                      {message.attachment_meta?.address || message.content || 'Shared Location'}
                    </h4>
                    {message.attachment_meta?.latitude && (
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-0.5">
                        {message.attachment_meta.latitude}° N, {message.attachment_meta.longitude}° E
                      </p>
                    )}
                  </div>
                </div>

                <a
                  href={
                    message.attachment_url ||
                    `https://www.google.com/maps/search/?api=1&query=${
                      message.attachment_meta?.latitude
                    },${message.attachment_meta?.longitude}`
                  }
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Open in Google Maps</span>
                </a>
              </div>
            </div>
          )}

          {/* Contact Card */}
          {message.message_type === 'contact' && (
            <div className="mb-2 p-3 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-slate-900 dark:text-slate-100 max-w-xs shadow-xs">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-600 text-white font-bold flex items-center justify-center text-base shadow-sm">
                  {message.attachment_meta?.contact_name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate leading-tight">
                    {message.attachment_meta?.contact_name || message.content || 'Shared Contact'}
                  </h4>
                  <p className="text-[11px] text-cyan-600 dark:text-cyan-400 font-mono mt-0.5">
                    ID: #{message.attachment_meta?.contact_communication_id || '--------'}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (message.attachment_meta?.contact_communication_id) {
                    startConversationWithUser({
                      id: `user-${message.attachment_meta.contact_communication_id}`,
                      display_name: message.attachment_meta.contact_name || 'User',
                      communication_id: message.attachment_meta.contact_communication_id,
                      created_at: new Date().toISOString(),
                      updated_at: new Date().toISOString(),
                    });
                  }
                }}
                className="mt-2.5 flex items-center justify-center gap-1.5 w-full py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white font-semibold text-xs shadow-xs transition-colors"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Message Contact</span>
              </button>
            </div>
          )}

          {/* Audio / Voice Note */}
          {message.message_type === 'audio' && (
            <div
              className={`mb-2 flex items-center gap-3 p-2.5 rounded-2xl max-w-xs shadow-xs ${
                isMe ? 'bg-brand-600/60' : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              <button
                type="button"
                onClick={toggleAudioPlay}
                className="w-10 h-10 rounded-full bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 flex items-center justify-center shadow-md hover:scale-105 transition-transform flex-shrink-0"
              >
                {isPlayingAudio ? (
                  <Pause className="w-5 h-5 fill-current" />
                ) : (
                  <Play className="w-5 h-5 fill-current ml-0.5" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                {/* Simulated Audio Waveform Visual */}
                <div className="flex items-center gap-0.5 h-5 my-1">
                  {[40, 70, 30, 90, 60, 100, 45, 80, 50, 75, 95, 40, 65, 85, 30].map(
                    (height, idx) => (
                      <span
                        key={idx}
                        className={`flex-1 rounded-full transition-all ${
                          isPlayingAudio ? 'bg-amber-400 animate-pulse' : isMe ? 'bg-white/60' : 'bg-slate-400 dark:bg-slate-500'
                        }`}
                        style={{ height: `${height}%` }}
                      />
                    )
                  )}
                </div>

                <div className="flex items-center justify-between text-[10px] opacity-80 font-mono">
                  <span>Voice Note</span>
                  {message.attachment_meta?.file_size && (
                    <span>{formatFileSize(message.attachment_meta.file_size)}</span>
                  )}
                </div>
              </div>

              <audio
                ref={audioRef}
                src={message.attachment_url}
                onEnded={() => setIsPlayingAudio(false)}
                className="hidden"
              />
            </div>
          )}

          {/* Any Document File Attachment Card */}
          {message.message_type === 'file' && (
            <a
              href={message.attachment_url || '#'}
              download={message.attachment_meta?.file_name || 'document'}
              target="_blank"
              rel="noopener noreferrer"
              className={`mb-2 flex items-center gap-3 p-3 rounded-2xl text-xs cursor-pointer hover:opacity-90 transition-all shadow-xs ${
                isMe ? 'bg-brand-600/60 text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100'
              }`}
            >
              <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex flex-col items-center justify-center font-bold text-[10px] uppercase shadow-sm flex-shrink-0">
                <FileText className="w-4 h-4 mb-0.5" />
                <span>{getFileExtension(message.attachment_meta?.file_name || message.content)}</span>
              </div>

              <div className="min-w-0 flex-1">
                <span className="font-bold truncate block leading-tight">
                  {message.attachment_meta?.file_name || message.content || 'Document File'}
                </span>
                <span className="text-[10px] opacity-75 font-mono">
                  {formatFileSize(message.attachment_meta?.file_size)} • Tap to download
                </span>
              </div>

              <Download className="w-4 h-4 opacity-75 hover:opacity-100 flex-shrink-0" />
            </a>
          )}

          {/* Message Text Content */}
          {Boolean(message.content && message.message_type !== 'location' && message.message_type !== 'contact') && (
            <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
              {message.content}
            </p>
          )}

          {/* Message Footer: Timestamp, Edited badge, Read status */}
          <div
            className={`flex items-center justify-end gap-1 mt-1 text-[10px] select-none ${
              isMe ? 'text-brand-100' : 'text-slate-400 dark:text-slate-500'
            }`}
          >
            {message.is_edited && <span className="italic">edited</span>}
            <span>{formatMessageTime(message.created_at)}</span>

            {isMe && !message.is_deleted && (
              <span className="ml-0.5">
                {message.status === 'read' || message.is_read ? (
                  <CheckCheck className="w-3.5 h-3.5 text-brand-100" />
                ) : (
                  <Check className="w-3 h-3 text-brand-200" />
                )}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Reaction Badges */}
      {Boolean(message.reactions && message.reactions.length > 0) && (
        <div className="flex flex-wrap gap-1 mt-1 -mb-1 z-10">
          {message.reactions?.map((reaction) => (
            <button
              key={reaction.id}
              onClick={() => onReact(message.id, reaction.emoji)}
              className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border shadow-2xs transition-transform hover:scale-105 active:scale-95 ${
                isMe
                  ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
                  : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200'
              }`}
            >
              <span>{reaction.emoji}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
