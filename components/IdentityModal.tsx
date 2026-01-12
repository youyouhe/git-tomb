
import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { signInWithGitHub, signOut, getUndertakerProfile, updateUndertakerProfile, resetToAnonymous } from '../services/identityService';
import { getUserStats } from '../services/graveyardService';
import { UndertakerRankInfo } from '../types';

interface IdentityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const IdentityModal: React.FC<IdentityModalProps> = ({ isOpen, onClose, onUpdate }) => {
  const { t } = useTranslation();
  const [handle, setHandle] = useState(''); 
  const [profile, setProfile] = useState(getUndertakerProfile());
  const [isLoading, setIsLoading] = useState(false);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Stats State
  const [burialCount, setBurialCount] = useState(0);
  const [rankInfo, setRankInfo] = useState<UndertakerRankInfo | null>(null);

  useEffect(() => {
      if(isOpen) {
          const p = getUndertakerProfile();
          setProfile(p);
          setHandle(p.handle || '');
          fetchUserStats(p.id);
      }
  }, [isOpen]);

  const fetchUserStats = async (userId: string) => {
      setStatsLoading(true);
      try {
          const stats = await getUserStats(userId);
          setBurialCount(stats.count);
          setRankInfo(stats.rank);
      } catch (e) {
          console.error("Failed to fetch user stats", e);
      } finally {
          setStatsLoading(false);
      }
  }

  const handleGithubLogin = async () => {
      setIsLoading(true);
      try {
          await signInWithGitHub();
      } catch (error) {
          console.error("Login failed", error);
          alert("Connection to GitHub failed.");
          setIsLoading(false);
      }
  };

  const handleLogout = async () => {
      setIsLoading(true);
      await signOut();
      onUpdate();
      onClose();
  };

  const handleReroll = () => {
      const p = resetToAnonymous();
      setProfile(p);
      fetchUserStats(p.id); // Reset stats for new anon user (0)
      onUpdate();
  }

  // Progress Bar Calculation
  const getProgress = () => {
      if (!rankInfo) return 0;
      if (rankInfo.nextThreshold === null) return 100; // Max Level
      
      const prevThreshold = rankInfo.minCount; // e.g. 10
      const nextThreshold = rankInfo.nextThreshold; // e.g. 25
      const current = burialCount; // e.g. 15

      // (15 - 10) / (25 - 10) = 5 / 15 = 33%
      const totalInRange = nextThreshold - prevThreshold;
      const progressInRange = current - prevThreshold;
      
      const percent = (progressInRange / totalInRange) * 100;
      return Math.min(Math.max(percent, 0), 100);
  }

  const progress = getProgress();

  if (!isOpen) return null;

  const isAuth = !!profile.handle;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm p-4">
      {/* CARD CONTAINER */}
      <div className="bg-[#1a1a1a] border-2 border-graveyard-accent max-w-sm w-full relative shadow-[0px_0px_20px_rgba(0,0,0,0.8)] overflow-hidden">
        
        {/* Holographic Shine for High Ranks */}
        {rankInfo && rankInfo.minCount >= 50 && (
            <div className="absolute inset-0 pointer-events-none z-0 opacity-20 bg-gradient-to-tr from-transparent via-red-900/40 to-transparent animate-pulse" />
        )}

        {/* HEADER: "OFFICIAL LICENSE" */}
        <div className="bg-graveyard-stone p-3 flex justify-between items-center border-b-2 border-graveyard-accent relative z-10">
            <div className="flex items-center gap-2">
                <span className="text-2xl">🪪</span>
                <div>
                    <h2 className="font-pixel text-xs text-graveyard-highlight uppercase tracking-widest">{t('identity.card_title')}</h2>
                    <p className="font-mono text-[9px] text-graveyard-text">{t('identity.card_org')}</p>
                </div>
            </div>
            <button onClick={onClose} className="text-graveyard-text hover:text-white font-mono text-xl">[X]</button>
        </div>

        {/* BODY */}
        <div className="p-6 relative z-10">
            
            {/* AVATAR & NAME */}
            <div className="flex items-start gap-4 mb-6">
                <div className={`w-16 h-16 border-2 ${rankInfo?.color.includes('red') ? 'border-red-500 shadow-[0_0_10px_red]' : 'border-graveyard-highlight'} bg-black overflow-hidden relative group`}>
                     {profile.avatarUrl ? (
                         <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                     ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl grayscale opacity-50">
                            👻
                        </div>
                     )}
                     {!isAuth && <div className="absolute inset-0 bg-black/50 flex items-center justify-center text-[10px] font-pixel text-white opacity-0 group-hover:opacity-100">GHOST</div>}
                </div>
                
                <div className="flex-1 min-w-0">
                    <h3 className="font-pixel text-sm text-white truncate">{profile.alias}</h3>
                    <p className="font-mono text-xs text-graveyard-text mb-2 truncate">ID: {profile.id.slice(0,8)}...</p>
                    
                    {/* Rank Badge */}
                    {statsLoading ? (
                        <div className="h-4 w-20 bg-white/10 animate-pulse rounded"></div>
                    ) : (
                        <div className={`inline-flex items-center gap-1 px-2 py-0.5 border border-white/20 bg-black/40 rounded text-[10px] font-pixel ${rankInfo?.color}`}>
                            <span>{rankInfo?.icon}</span>
                            <span>{t(rankInfo?.title || 'rank.intern')}</span>
                        </div>
                    )}
                </div>
            </div>

            {/* STATS GRID */}
            <div className="grid grid-cols-2 gap-2 mb-6">
                 <div className="bg-black/30 border border-graveyard-accent p-2 text-center">
                     <p className="font-mono text-[9px] text-graveyard-text uppercase">{t('identity.stat_buried')}</p>
                     <p className="font-pixel text-lg text-white">{burialCount}</p>
                 </div>
                 <div className="bg-black/30 border border-graveyard-accent p-2 text-center">
                     <p className="font-mono text-[9px] text-graveyard-text uppercase">{t('identity.stat_next')}</p>
                     <p className="font-pixel text-lg text-graveyard-text">
                         {rankInfo?.nextThreshold ? (rankInfo.nextThreshold - burialCount) : 'MAX'}
                     </p>
                 </div>
            </div>

            {/* XP PROGRESS BAR */}
            <div className="mb-6">
                <div className="flex justify-between text-[10px] font-mono text-graveyard-text mb-1">
                    <span>PROGRESS</span>
                    <span>{Math.floor(progress)}%</span>
                </div>
                <div className="h-3 w-full bg-black border border-graveyard-accent relative overflow-hidden">
                    <div 
                        className={`h-full transition-all duration-1000 ease-out ${rankInfo?.color.includes('red') ? 'bg-red-900' : 'bg-green-900'}`}
                        style={{ width: `${progress}%` }}
                    >
                        {/* Stripes animation */}
                        <div className="absolute inset-0 w-full h-full bg-[linear-gradient(45deg,rgba(255,255,255,0.1)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.1)_50%,rgba(255,255,255,0.1)_75%,transparent_75%,transparent)] bg-[length:10px_10px]" />
                    </div>
                </div>
                <p className="text-[9px] font-mono text-center mt-1 text-graveyard-accent/50">
                    {rankInfo?.nextThreshold ? `${burialCount} / ${rankInfo.nextThreshold} to next rank` : "Maximum Entropy Achieved"}
                </p>
            </div>

            {/* ACTIONS FOOTER */}
            <div className="border-t border-graveyard-accent pt-4 flex flex-col gap-3">
                {isAuth ? (
                    <button 
                        onClick={handleLogout}
                        disabled={isLoading}
                        className="w-full bg-red-900/20 border border-red-900/50 text-red-400 font-pixel text-xs py-3 hover:bg-red-900/40 transition-colors"
                    >
                        {isLoading ? "Revoking..." : t('identity.logout')}
                    </button>
                ) : (
                    <>
                        <button 
                            onClick={handleGithubLogin}
                            disabled={isLoading}
                            className="w-full bg-white text-black font-pixel text-xs py-3 hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                        >
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c-4.766-.58-8.199-5.078-8.199-10.38 0-6.627 5.373-12 12-12z"/></svg>
                            {t('identity.connect_btn')}
                        </button>
                        
                        <div className="flex justify-between items-center px-1">
                            <span className="text-[9px] font-mono text-graveyard-text">{t('identity.anon_hint')}</span>
                            <button 
                                onClick={handleReroll}
                                className="text-[10px] font-mono text-graveyard-highlight hover:underline"
                            >
                                {t('identity.reroll')}
                            </button>
                        </div>
                    </>
                )}
            </div>

        </div>

        {/* Decorative Corner Screws */}
        <div className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-graveyard-text/30"></div>
        <div className="absolute top-2 right-2 w-1.5 h-1.5 rounded-full bg-graveyard-text/30"></div>
        <div className="absolute bottom-2 left-2 w-1.5 h-1.5 rounded-full bg-graveyard-text/30"></div>
        <div className="absolute bottom-2 right-2 w-1.5 h-1.5 rounded-full bg-graveyard-text/30"></div>

      </div>
    </div>
  );
};
