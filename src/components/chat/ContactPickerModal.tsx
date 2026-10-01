import React, { useState } from 'react';
import { User, X, Search, Send, ShieldCheck, UserPlus } from 'lucide-react';
import { useRealtime } from '../../contexts/RealtimeContext';
import type { Contact, Profile } from '../../types';

interface ContactPickerModalProps {
  onSendContact: (contactProfile: Profile) => void;
  onClose: () => void;
}

export const ContactPickerModal: React.FC<ContactPickerModalProps> = ({ onSendContact, onClose }) => {
  const { contacts } = useRealtime();
  const [searchQuery, setSearchQuery] = useState('');
  const [customName, setCustomName] = useState('');
  const [customCommId, setCustomCommId] = useState('');
  const [activeTab, setActiveTab] = useState<'contacts' | 'manual'>('contacts');

  const filteredContacts = contacts.filter((c) => {
    const nameMatch = c.contact_profile.display_name.toLowerCase().includes(searchQuery.toLowerCase());
    const idMatch = c.contact_profile.communication_id.includes(searchQuery);
    return nameMatch || idMatch;
  });

  const handleSendManual = () => {
    if (!customName.trim()) return;
    const dummyProfile: Profile = {
      id: `custom-contact-${Date.now()}`,
      display_name: customName.trim(),
      communication_id: customCommId.trim() || Math.floor(10000000 + Math.random() * 90000000).toString(),
      bio: 'Shared contact card',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    onSendContact(dummyProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-cyan-600 dark:bg-cyan-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <User className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Share Contact</h3>
              <p className="text-xs text-white/80">Send contact details to thread</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/20 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switch */}
        <div className="flex border-b border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('contacts')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'contacts'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            My Contacts ({contacts.length})
          </button>
          <button
            onClick={() => setActiveTab('manual')}
            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${
              activeTab === 'manual'
                ? 'border-cyan-500 text-cyan-600 dark:text-cyan-400 bg-cyan-50/50 dark:bg-cyan-950/30'
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            Enter Manually
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-3 max-h-[60vh] overflow-y-auto">
          {activeTab === 'contacts' ? (
            <>
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {filteredContacts.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-xs">
                  {contacts.length === 0 ? 'No saved contacts yet.' : 'No matching contact found.'}
                </div>
              ) : (
                <div className="space-y-1.5">
                  {filteredContacts.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => {
                        onSendContact(c.contact_profile);
                        onClose();
                      }}
                      className="flex items-center justify-between p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-cyan-500 hover:bg-cyan-50/50 dark:hover:bg-cyan-950/40 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-cyan-500 to-blue-500 flex items-center justify-center text-white font-bold text-sm shadow-xs">
                          {c.contact_profile.display_name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 block leading-tight">
                            {c.contact_profile.display_name}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            ID: #{c.contact_profile.communication_id}
                          </span>
                        </div>
                      </div>
                      <button className="p-2 rounded-xl bg-cyan-50 dark:bg-cyan-950 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-500 group-hover:text-white transition-colors">
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="space-y-3 py-1">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Contact Display Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Morgan"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Communication ID (8-digit code)
                </label>
                <input
                  type="text"
                  maxLength={8}
                  placeholder="e.g. 58392147"
                  value={customCommId}
                  onChange={(e) => setCustomCommId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <button
                type="button"
                onClick={handleSendManual}
                disabled={!customName.trim()}
                className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
              >
                <Send className="w-4 h-4" />
                <span>Send Contact Card</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
