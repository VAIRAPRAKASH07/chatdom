import React, { useState } from 'react';
import { MapPin, Navigation, X, Search, Globe, Send, Compass } from 'lucide-react';

interface LocationModalProps {
  onSendLocation: (lat: number, lng: number, address: string) => void;
  onClose: () => void;
}

const PRESET_LOCATIONS = [
  { name: 'Times Square, New York', lat: 40.758, lng: -73.9855, country: 'USA' },
  { name: 'Eiffel Tower, Paris', lat: 48.8584, lng: 2.2945, country: 'France' },
  { name: 'London Eye, London', lat: 51.5033, lng: -0.1195, country: 'UK' },
  { name: 'Tokyo Tower, Tokyo', lat: 35.6586, lng: 139.7454, country: 'Japan' },
  { name: 'Marina Bay Sands, Singapore', lat: 1.2834, lng: 103.8607, country: 'Singapore' },
  { name: 'Taj Mahal, India', lat: 27.1751, lng: 78.0421, country: 'India' },
];

export const LocationModal: React.FC<LocationModalProps> = ({ onSendLocation, onClose }) => {
  const [lat, setLat] = useState<number>(12.9716); // Default Bangalore/Tech Hub coordinates
  const [lng, setLng] = useState<number>(77.5946);
  const [address, setAddress] = useState<string>('Tech Park Locus, Central Avenue');
  const [isLocating, setIsLocating] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [locationStatus, setLocationStatus] = useState<string>('');

  const handleGetCurrentLocation = () => {
    setIsLocating(true);
    setLocationStatus('Getting GPS coordinates...');

    if (!navigator.geolocation) {
      setLocationStatus('Geolocation is not supported by your browser.');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const currentLat = Number(position.coords.latitude.toFixed(6));
        const currentLng = Number(position.coords.longitude.toFixed(6));
        setLat(currentLat);
        setLng(currentLng);
        setAddress(`Live Location (${currentLat}° N, ${currentLng}° E)`);
        setLocationStatus('GPS position detected!');
        setIsLocating(false);
      },
      (error) => {
        console.warn('Geolocation error:', error);
        setLocationStatus('Could not retrieve precise GPS. Using selected coordinates.');
        setIsLocating(false);
      },
      { timeout: 10000, enableHighAccuracy: true }
    );
  };

  const handleSelectPreset = (preset: typeof PRESET_LOCATIONS[0]) => {
    setLat(preset.lat);
    setLng(preset.lng);
    setAddress(`${preset.name}, ${preset.country}`);
  };

  const filteredPresets = PRESET_LOCATIONS.filter((p) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.country.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSend = () => {
    onSendLocation(lat, lng, address || 'Shared Location');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800 bg-emerald-600 dark:bg-emerald-700 text-white">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-white/10 backdrop-blur-md">
              <MapPin className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-base leading-tight">Send Location</h3>
              <p className="text-xs text-white/80">Share GPS location or pick place on map</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Quick Action: Share Live GPS Location */}
          <button
            type="button"
            onClick={handleGetCurrentLocation}
            disabled={isLocating}
            className="w-full flex items-center justify-center gap-2.5 p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-700 dark:text-emerald-300 font-semibold hover:bg-emerald-100 dark:hover:bg-emerald-900/60 transition-all shadow-xs active:scale-[0.99]"
          >
            {isLocating ? (
              <svg className="w-5 h-5 animate-spin text-emerald-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            ) : (
              <Navigation className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span>{isLocating ? 'Acquiring GPS Signal...' : 'Share Current Live Location'}</span>
          </button>

          {locationStatus && (
            <p className="text-xs text-center text-emerald-600 dark:text-emerald-400 font-medium">
              {locationStatus}
            </p>
          )}

          {/* Interactive Visual Map Card Preview */}
          <div className="relative rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 shadow-inner h-48 flex items-center justify-center group">
            {/* Embedded OpenStreetMap Iframe or Map Graphic */}
            <iframe
              title="Map Preview"
              width="100%"
              height="100%"
              frameBorder="0"
              scrolling="no"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.01}%2C${lat - 0.01}%2C${lng + 0.01}%2C${lat + 0.01}&layer=mapnik&marker=${lat}%2C${lng}`}
              className="w-full h-full opacity-90 group-hover:opacity-100 transition-opacity"
            />
            {/* Center Location Pin Badge */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="flex flex-col items-center animate-bounce">
                <div className="px-2.5 py-1 rounded-full bg-slate-900/90 text-white text-[11px] font-semibold shadow-lg backdrop-blur-md mb-1">
                  {address.split(',')[0]}
                </div>
                <MapPin className="w-8 h-8 text-rose-500 fill-rose-500 drop-shadow-md" />
              </div>
            </div>
          </div>

          {/* Address & Coordinate Inputs */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                Place Name / Address Title
              </label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="e.g. City Center, Grand Hotel, Home..."
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Latitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">
                  Longitude
                </label>
                <input
                  type="number"
                  step="0.0001"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs font-mono text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>

          {/* Search Places / Popular Landmarks */}
          <div>
            <span className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-2">
              Popular Places & Landmarks
            </span>
            <div className="relative mb-2">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search landmark..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {filteredPresets.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleSelectPreset(preset)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800 text-xs text-slate-700 dark:text-slate-300 hover:border-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                >
                  <Compass className="w-3 h-3 text-emerald-500" />
                  <span>{preset.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-5 py-3 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSend}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-md transition-all active:scale-95"
          >
            <Send className="w-4 h-4" />
            <span>Send Location</span>
          </button>
        </div>
      </div>
    </div>
  );
};
