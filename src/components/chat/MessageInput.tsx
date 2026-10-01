import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Smile,
  Paperclip,
  Image as ImageIcon,
  X,
  Sticker,
  Plus,
  MapPin,
  User,
  Mic,
  Square,
  FileText,
  Film,
} from 'lucide-react';
import { StickerPicker } from './StickerPicker';
import { LocationModal } from './LocationModal';
import { ContactPickerModal } from './ContactPickerModal';
import type { Message, MessageType, Profile } from '../../types';

interface MessageInputProps {
  onSendMessage: (
    content: string,
    type?: MessageType,
    replyToId?: string,
    attachmentUrl?: string,
    attachmentMeta?: Message['attachment_meta']
  ) => Promise<void>;
  replyingToMessage: Message | null;
  onCancelReply: () => void;
  isPrivateVault?: boolean;
}

type AttachmentPreview = {
  url: string;
  type: MessageType;
  fileName?: string;
  fileSize?: number;
  isSticker?: boolean;
  locationMeta?: { latitude: number; longitude: number; address: string };
  contactMeta?: Profile;
};

export const MessageInput: React.FC<MessageInputProps> = ({
  onSendMessage,
  replyingToMessage,
  onCancelReply,
  isPrivateVault = false,
}) => {
  const [content, setContent] = useState('');
  const [showEmojiQuickBar, setShowEmojiQuickBar] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showAttachmentMenu, setShowAttachmentMenu] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showContactModal, setShowContactModal] = useState(false);
  
  const [attachmentPreview, setAttachmentPreview] = useState<AttachmentPreview | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Audio recording state
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioFileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [content]);

  // Audio timer
  useEffect(() => {
    if (isRecordingAudio) {
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } else {
      clearInterval(recordingTimerRef.current);
      setRecordingTime(0);
    }
    return () => clearInterval(recordingTimerRef.current);
  }, [isRecordingAudio]);

  const handleSend = async () => {
    if (!content.trim() && !attachmentPreview) return;

    const msgType: MessageType = attachmentPreview?.type || 'text';
    const attachUrl = attachmentPreview?.url;
    let meta: Message['attachment_meta'] = undefined;

    if (attachmentPreview) {
      meta = {
        file_name: attachmentPreview.fileName,
        file_size: attachmentPreview.fileSize,
      };

      if (attachmentPreview.locationMeta) {
        meta.latitude = attachmentPreview.locationMeta.latitude;
        meta.longitude = attachmentPreview.locationMeta.longitude;
        meta.address = attachmentPreview.locationMeta.address;
      }

      if (attachmentPreview.contactMeta) {
        meta.contact_name = attachmentPreview.contactMeta.display_name;
        meta.contact_communication_id = attachmentPreview.contactMeta.communication_id;
        meta.contact_avatar = attachmentPreview.contactMeta.avatar_url;
      }
    }

    const sendingContent = (attachmentPreview?.isSticker || msgType === 'location' || msgType === 'contact')
      ? (content.trim() || (attachmentPreview?.fileName || ''))
      : content.trim();

    setContent('');
    setAttachmentPreview(null);
    setUploadError(null);
    setShowAttachmentMenu(false);
    setShowEmojiQuickBar(false);
    setShowStickerPicker(false);
    if (replyingToMessage) onCancelReply();

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }

    await onSendMessage(sendingContent, msgType, replyingToMessage?.id, attachUrl, meta);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  /**
   * File handler for Documents, Images, Videos, Audio
   */
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, preferredType: MessageType) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setShowAttachmentMenu(false);

    // Validate size: 100MB max
    const MAX_BYTES = 100 * 1024 * 1024;
    if (file.size > MAX_BYTES) {
      setUploadError('File too large. Maximum size is 100 MB.');
      e.target.value = '';
      return;
    }

    setIsUploading(true);
    const previewUrl = URL.createObjectURL(file);

    let detectedType: MessageType = preferredType;
    if (file.type.startsWith('image/')) detectedType = 'image';
    else if (file.type.startsWith('video/')) detectedType = 'video';
    else if (file.type.startsWith('audio/')) detectedType = 'audio';
    else if (preferredType === 'file') detectedType = 'file';

    setAttachmentPreview({
      url: previewUrl,
      type: detectedType,
      fileName: file.name,
      fileSize: file.size,
    });

    setIsUploading(false);
    e.target.value = '';
  };

  /**
   * Sticker Selection
   */
  const handleSelectSticker = (stickerUrl: string, altText: string) => {
    setShowStickerPicker(false);
    setAttachmentPreview({
      url: stickerUrl,
      type: 'sticker',
      fileName: altText,
      isSticker: true,
    });
  };

  /**
   * Location Selection
   */
  const handleSendLocation = (lat: number, lng: number, address: string) => {
    setAttachmentPreview({
      url: `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`,
      type: 'location',
      fileName: address,
      locationMeta: { latitude: lat, longitude: lng, address },
    });
  };

  /**
   * Contact Card Selection
   */
  const handleSendContact = (contactProfile: Profile) => {
    setAttachmentPreview({
      url: `contact:${contactProfile.communication_id}`,
      type: 'contact',
      fileName: contactProfile.display_name,
      contactMeta: contactProfile,
    });
  };

  /**
   * Live Mic Recording using MediaRecorder API
   */
  const startAudioRecording = async () => {
    try {
      setShowAttachmentMenu(false);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        setAttachmentPreview({
          url: audioUrl,
          type: 'audio',
          fileName: `Voice Note (${recordingTime}s)`,
          fileSize: audioBlob.size,
        });
        stream.getTracks().forEach((track) => track.stop());
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecordingAudio(true);
    } catch (err) {
      console.warn('Microphone access unavailable, opening audio file picker:', err);
      audioFileInputRef.current?.click();
    }
  };

  const stopAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      setIsRecordingAudio(false);
    }
  };

  const cancelAudioRecording = () => {
    if (mediaRecorderRef.current && isRecordingAudio) {
      mediaRecorderRef.current.stop();
      audioChunksRef.current = [];
      setIsRecordingAudio(false);
    }
  };

  const quickEmojis = ['😊', '👍', '🔒', '❤️', '🔥', '✨', '👋', '🎉'];
  const canSend = Boolean(content.trim() || attachmentPreview) && !isUploading;

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <div className="p-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 relative">
      {/* Replying-To Banner */}
      {replyingToMessage && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border-l-2 border-brand-500 text-xs text-slate-700 dark:text-slate-300 animate-slide-up">
          <div className="min-w-0">
            <span className="font-semibold text-brand-600 dark:text-brand-400 block">
              Replying to {replyingToMessage.sender_profile?.display_name || 'User'}
            </span>
            <p className="truncate text-slate-500 dark:text-slate-400">
              {replyingToMessage.content}
            </p>
          </div>
          <button
            onClick={onCancelReply}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Upload Error Banner */}
      {uploadError && (
        <div className="flex items-center justify-between gap-2 px-3 py-2 mb-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300">
          <span>{uploadError}</span>
          <button onClick={() => setUploadError(null)}><X className="w-3 h-3" /></button>
        </div>
      )}

      {/* Attachment Preview Banner */}
      {attachmentPreview && (
        <div className="relative inline-block mb-2 rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 shadow-md p-2">
          {attachmentPreview.type === 'sticker' || attachmentPreview.isSticker ? (
            /* Sticker preview */
            <div className="w-24 h-24 flex items-center justify-center bg-slate-100 dark:bg-slate-900 text-6xl rounded-xl">
              {attachmentPreview.url.startsWith('sticker:') ? (
                attachmentPreview.url.replace('sticker:', '')
              ) : (
                <img src={attachmentPreview.url} alt="Sticker" className="w-20 h-20 object-contain" />
              )}
            </div>
          ) : attachmentPreview.type === 'location' ? (
            /* Location preview */
            <div className="flex items-center gap-3 p-2 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-xs max-w-xs">
              <div className="p-2.5 rounded-xl bg-emerald-600 text-white flex-shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {attachmentPreview.fileName || 'Location'}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {attachmentPreview.locationMeta?.latitude}° N, {attachmentPreview.locationMeta?.longitude}° E
                </span>
              </div>
            </div>
          ) : attachmentPreview.type === 'contact' ? (
            /* Contact card preview */
            <div className="flex items-center gap-3 p-2 bg-cyan-50 dark:bg-cyan-950/50 rounded-xl text-xs max-w-xs">
              <div className="w-9 h-9 rounded-full bg-cyan-600 text-white flex items-center justify-center font-bold">
                {attachmentPreview.fileName?.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <span className="font-bold text-slate-900 dark:text-slate-100 block truncate">
                  {attachmentPreview.fileName}
                </span>
                <span className="text-[10px] text-cyan-600 dark:text-cyan-400 font-mono">
                  Communication ID: #{attachmentPreview.contactMeta?.communication_id}
                </span>
              </div>
            </div>
          ) : attachmentPreview.type === 'audio' ? (
            /* Voice note preview */
            <div className="flex items-center gap-3 p-2 bg-amber-50 dark:bg-amber-950/40 rounded-xl text-xs max-w-xs">
              <div className="p-2 rounded-xl bg-amber-500 text-white">
                <Mic className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                  {attachmentPreview.fileName || 'Voice Note'}
                </span>
                <audio src={attachmentPreview.url} controls className="h-6 w-44 mt-1" />
              </div>
            </div>
          ) : attachmentPreview.type === 'image' ? (
            <img src={attachmentPreview.url} alt="Upload preview" className="w-24 h-24 object-cover rounded-xl" />
          ) : attachmentPreview.type === 'video' ? (
            <video src={attachmentPreview.url} className="w-24 h-24 object-cover rounded-xl" muted />
          ) : (
            /* Any document file preview */
            <div className="flex items-center gap-3 p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl max-w-xs text-xs">
              <div className="p-2.5 rounded-xl bg-indigo-600 text-white">
                <FileText className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="font-semibold text-slate-900 dark:text-slate-100 block truncate">
                  {attachmentPreview.fileName || 'Document'}
                </span>
                {attachmentPreview.fileSize && (
                  <span className="text-[10px] text-indigo-600 dark:text-indigo-400 font-medium">
                    {(attachmentPreview.fileSize / (1024 * 1024)).toFixed(2)} MB
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={() => setAttachmentPreview(null)}
            className="absolute top-1 right-1 p-1 bg-slate-900/80 text-white rounded-full hover:bg-slate-900 transition-transform active:scale-90"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Quick Emoji Strip */}
      {showEmojiQuickBar && (
        <div className="flex items-center gap-1.5 pb-2 overflow-x-auto no-scrollbar">
          {quickEmojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                setContent((prev) => prev + emoji);
                textareaRef.current?.focus();
              }}
              className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-sm hover:scale-125 transition-transform"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Sticker Picker Overlay */}
      {showStickerPicker && (
        <div className="mb-2">
          <StickerPicker
            onSelectSticker={handleSelectSticker}
            onClose={() => setShowStickerPicker(false)}
          />
        </div>
      )}

      {/* WhatsApp Style Attachment Speed-Dial Menu */}
      {showAttachmentMenu && (
        <div className="absolute bottom-16 left-3 z-30 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-3 shadow-2xl grid grid-cols-3 gap-3 animate-slide-up w-72">
          {/* Document */}
          <button
            type="button"
            onClick={() => docInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-2xl bg-indigo-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <FileText className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Document</span>
          </button>

          {/* Camera / Photos */}
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-2xl bg-rose-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <ImageIcon className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Photos & Videos</span>
          </button>

          {/* Stickers */}
          <button
            type="button"
            onClick={() => {
              setShowStickerPicker(true);
              setShowAttachmentMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-950/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Sticker className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Sticker</span>
          </button>

          {/* Location */}
          <button
            type="button"
            onClick={() => {
              setShowLocationModal(true);
              setShowAttachmentMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <MapPin className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Location</span>
          </button>

          {/* Contact */}
          <button
            type="button"
            onClick={() => {
              setShowContactModal(true);
              setShowAttachmentMenu(false);
            }}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-cyan-50 dark:hover:bg-cyan-950/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <User className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Contact</span>
          </button>

          {/* Audio / Voice Note */}
          <button
            type="button"
            onClick={startAudioRecording}
            className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl hover:bg-purple-50 dark:hover:bg-purple-950/50 transition-all group"
          >
            <div className="w-11 h-11 rounded-2xl bg-purple-500 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
              <Mic className="w-5 h-5" />
            </div>
            <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">Voice Note</span>
          </button>
        </div>
      )}

      {/* Hidden file inputs */}
      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file?.type.startsWith('video/')) {
            handleFileChange(e, 'video');
          } else {
            handleFileChange(e, 'image');
          }
        }}
      />
      <input
        ref={docInputRef}
        type="file"
        accept="*/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'file')}
      />
      <input
        ref={audioFileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={(e) => handleFileChange(e, 'audio')}
      />

      {/* Live Audio Recording Toolbar */}
      {isRecordingAudio ? (
        <div className="flex items-center justify-between gap-3 bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 rounded-2xl p-2.5 animate-pulse">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-rose-600 animate-ping" />
            <span className="text-xs font-bold text-rose-700 dark:text-rose-300">
              Recording Voice Note ({formatRecordingTime(recordingTime)})
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={cancelAudioRecording}
              className="px-3 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold hover:bg-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={stopAudioRecording}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-md transition-colors"
            >
              <Square className="w-3.5 h-3.5 fill-white" />
              <span>Done</span>
            </button>
          </div>
        </div>
      ) : (
        /* Standard Composer Row */
        <div className="flex items-end gap-2 bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 rounded-2xl p-1.5 transition-all focus-within:border-brand-500 focus-within:bg-white dark:focus-within:bg-slate-950">
          <div className="flex items-center gap-0.5 pb-1 pl-1 text-slate-400 dark:text-slate-500">
            {/* WhatsApp Attachment Plus (+) Menu Button */}
            <button
              type="button"
              onClick={() => {
                setShowAttachmentMenu(!showAttachmentMenu);
                setShowEmojiQuickBar(false);
                setShowStickerPicker(false);
              }}
              className={`p-2 rounded-xl transition-all ${
                showAttachmentMenu
                  ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40 rotate-45'
                  : 'hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title="Add Attachment"
            >
              <Plus className="w-5 h-5 transition-transform" />
            </button>

            {/* Emoji Quick Bar Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowEmojiQuickBar(!showEmojiQuickBar);
                setShowStickerPicker(false);
                setShowAttachmentMenu(false);
              }}
              className={`p-2 rounded-xl transition-colors ${
                showEmojiQuickBar
                  ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title="Emoji quick-bar"
            >
              <Smile className="w-4 h-4" />
            </button>

            {/* Sticker Picker Toggle */}
            <button
              type="button"
              onClick={() => {
                setShowStickerPicker(!showStickerPicker);
                setShowEmojiQuickBar(false);
                setShowAttachmentMenu(false);
              }}
              className={`p-2 rounded-xl transition-colors ${
                showStickerPicker
                  ? 'text-brand-500 bg-brand-50 dark:bg-brand-950/40'
                  : 'hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/50 dark:hover:bg-slate-800'
              }`}
              title="Stickers"
            >
              <Sticker className="w-4 h-4" />
            </button>
          </div>

          {/* Text Input Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            placeholder={
              attachmentPreview
                ? `Add caption for ${attachmentPreview.type}...`
                : isPrivateVault
                ? 'Message in private vault...'
                : 'Write a private message...'
            }
            value={content}
            onChange={(e) => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none py-2 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none resize-none max-h-32 min-h-[38px]"
          />

          {/* Mic Quick Record Button (when empty text) or Send Button */}
          {!content.trim() && !attachmentPreview ? (
            <button
              type="button"
              onClick={startAudioRecording}
              className="p-2.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-brand-500 hover:text-white transition-all shadow-xs active:scale-95 flex-shrink-0"
              title="Record voice note"
            >
              <Mic className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSend}
              disabled={!canSend}
              className={`p-2.5 rounded-xl transition-all duration-150 flex items-center justify-center flex-shrink-0 ${
                canSend
                  ? isPrivateVault
                    ? 'bg-privacy-600 hover:bg-privacy-700 text-white shadow-sm active:scale-95'
                    : 'bg-brand-500 hover:bg-brand-600 text-white shadow-sm active:scale-95'
                  : 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed opacity-60'
              }`}
              aria-label="Send message"
            >
              <Send className="w-4 h-4" />
            </button>
          )}
        </div>
      )}

      {/* Location Modal */}
      {showLocationModal && (
        <LocationModal
          onSendLocation={handleSendLocation}
          onClose={() => setShowLocationModal(false)}
        />
      )}

      {/* Contact Picker Modal */}
      {showContactModal && (
        <ContactPickerModal
          onSendContact={handleSendContact}
          onClose={() => setShowContactModal(false)}
        />
      )}
    </div>
  );
};
