
import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { UndertakerProfile } from '../types';
import { getUndertakerProfile } from '../services/identityService';

interface HeaderProps {
  onHome: () => void;
  onConnect: () => void;
  onKin: () => void;
  onLeaderboard: () => void;
  onSettings: () => void;
  onEditIdentity: () => void;
  totalRespects: number;
  totalBuried: number;
  lastIdentityUpdate?: number;
  // Theme Props
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
}

export const Header: React.FC<HeaderProps> = ({ 
    onHome, onConnect, onKin, onLeaderboard, onSettings, onEditIdentity,
    totalRespects, totalBuried, lastIdentityUpdate,
    theme, onToggleTheme
}) => {
  const { t, language, setLanguage } = useTranslation();
  const [profile, setProfile] = useState<UndertakerProfile | null>(null);

  useEffect(() => {
    setProfile(getUndertakerProfile());
  }, [lastIdentityUpdate]); 

  const toggleLang = () => {
    setLanguage(language === 'en' ? 'zh' : 'en');
  }

  return (
    <header className="border-b-4 border-graveyard-stone p-4 sticky top-0 bg-graveyard-dark z-50 transition-colors duration-300">
      <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between items-center gap-4 px-4">
        {/* Logo Area */}
        <div 
          onClick={onHome} 
          className="cursor-pointer group select-none text-center lg:text-left"
        >
          <h1 className="font-pixel text-xl md:text-2xl text-graveyard-highlight group-hover:text-red-500 transition-colors">
            {t('app.title')} ⚰️
          </h1>
          <p className="text-xs md:text-sm text-graveyard-text mt-1">
            {t('app.subtitle')}
          </p>
        </div>

        {/* Stats & Identity */}
        <div className="flex flex-col items-center lg:items-end gap-2">
            
            {/* Nav Row */}
            <div className="flex gap-3 items-center flex-wrap justify-center">
                
                {/* Theme Toggle */}
                <button
                    onClick={onToggleTheme}
                    className="text-lg hover:scale-110 transition-transform duration-200 text-graveyard-text hover:text-graveyard-highlight"
                    title={theme === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}
                >
                    {theme === 'dark' ? '☀️' : '🌙'}
                </button>

                <button 
                    onClick={onSettings}
                    className="text-lg hover:rotate-90 transition-transform duration-500 text-graveyard-text hover:text-graveyard-highlight"
                    title="Settings"
                >
                    ⚙️
                </button>

                <button 
                    onClick={toggleLang}
                    className="text-xs font-mono border border-graveyard-accent px-2 py-1 rounded hover:bg-graveyard-highlight hover:text-graveyard-dark transition-colors"
                >
                    {language === 'en' ? '中' : 'EN'}
                </button>

                {/* Hide Leaderboard button on Large screens because Sidebar is visible */}
                <button 
                    onClick={onLeaderboard}
                    className="lg:hidden text-xs font-pixel bg-yellow-900/50 text-yellow-500 border border-yellow-800 px-3 py-1 hover:bg-yellow-500 hover:text-black transition-colors"
                >
                    👑 {t('nav.leaderboard')}
                </button>

                <button 
                    onClick={onKin}
                    className="hidden md:block text-xs font-pixel text-graveyard-text hover:text-graveyard-highlight hover:underline transition-colors"
                >
                    {t('nav.kin')}
                </button>

                <button 
                    onClick={onConnect}
                    className="hidden md:block text-xs font-pixel bg-graveyard-accent text-white px-3 py-2 hover:bg-graveyard-highlight hover:text-black transition-colors"
                >
                    {t('nav.connect')}
                </button>
            </div>

            {/* Stats Row */}
            <div 
                className="flex gap-4 text-[10px] md:text-xs font-mono bg-graveyard-stone p-1.5 rounded border border-graveyard-accent cursor-pointer hover:border-blue-500 transition-colors"
                onClick={onEditIdentity}
                title="Edit Identity"
            >
                {profile && (
                    <div className="text-yellow-600 border-r border-graveyard-accent pr-2 mr-2">
                        🆔 {profile.alias} {profile.handle ? '✅' : '✏️'}
                    </div>
                )}
                <div className="flex items-center gap-1">
                    <span>🪦 {t('stats.buried')}:</span>
                    <span className="text-graveyard-highlight">{totalBuried}</span>
                </div>
                <div className="text-graveyard-accent">|</div>
                <div className="flex items-center gap-1">
                    <span>💧 {t('stats.respects')}:</span>
                    <span className="text-graveyard-highlight">{totalRespects}</span>
                </div>
            </div>
        </div>
      </div>
      
      {/* Mobile nav items */}
      <div className="md:hidden flex justify-center gap-6 mt-4 border-t border-graveyard-stone pt-2">
          <button onClick={onKin} className="text-xs font-pixel text-graveyard-text">
             {t('nav.kin')}
          </button>
          <button onClick={onConnect} className="text-xs font-pixel text-red-400">
             {t('nav.connect')}
          </button>
      </div>
    </header>
  );
};
