
import React, { useState, useRef } from 'react';
import { GraveEntry, RITUALS, RitualType } from '../types';
import { useTranslation, useCauseTranslation } from '../i18n';
import { checkDailyQuota, consumeSoulPower, isAuthenticated, getUndertakerProfile } from '../services/identityService';
import { performRitual } from '../services/graveyardService';
import html2canvas from 'html2canvas';

interface TombstoneProps {
  entry: GraveEntry;
  onPayRespect: (id: string) => void;
  isDetail?: boolean;
}

type TombTier = 'GOLD' | 'SILVER' | 'BRONZE' | 'IRON' | 'WOOD' | 'ROTTEN';

export const Tombstone: React.FC<TombstoneProps> = ({ entry, onPayRespect, isDetail = false }) => {
  const { t } = useTranslation();
  const translateCause = useCauseTranslation(entry.cause);
  const [justPaid, setJustPaid] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [lastAction, setLastAction] = useState<string>('');
  const [powerGained, setPowerGained] = useState(0); // For floating text
  const [shake, setShake] = useState(false);
  const [isBurning, setIsBurning] = useState(false);
  const [isHeartbeat, setIsHeartbeat] = useState(false);
  const [errorMsg, setErrorMsg] = useState(''); // For local error toasts
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const lastPayTime = useRef<number>(0);
  const tombstoneRef = useRef<HTMLDivElement>(null);

  // Optimistic UI updates
  const [localRespectsAdded, setLocalRespectsAdded] = useState(0);
  const currentRespects = entry.respectsPaid + localRespectsAdded;
  const score = entry.stars + currentRespects;

  const calculateTier = (score: number): TombTier => {
    // Revised Thresholds for 1:1 scoring
    if (score >= 500) return 'GOLD';    // Legendary
    if (score >= 100) return 'SILVER';  // Notable
    if (score >= 30) return 'BRONZE';   // Known
    if (score >= 5) return 'IRON';      // Just started
    if (score > 0) return 'WOOD';
    return 'ROTTEN';
  };

  const tier = calculateTier(score);
  const isAuth = isAuthenticated();

  const showError = (msg: string) => {
      setErrorMsg(msg);
      setTimeout(() => setErrorMsg(''), 4000);
  }

  const generateTombstoneImage = async (): Promise<boolean> => {
      if (!tombstoneRef.current) return false;

      try {
          const canvas = await html2canvas(tombstoneRef.current, {
              scale: 2,
              useCORS: true,
              backgroundColor: '#0a0a0a'
          });

          const imgBlob = await new Promise<Blob>((resolve) => {
              canvas.toBlob((blob) => {
                  resolve(blob as Blob);
              }, 'image/png');
          });

          const imgData = [new ClipboardItem({ 'image/png': imgBlob })];
          await navigator.clipboard.write(imgData);

          setCopySuccess(t('share.image_copied'));
          setTimeout(() => setCopySuccess(null), 3000);

          return true;
      } catch (error) {
          console.error('Failed to generate tombstone image:', error);
          setCopySuccess(t('share.image_copy_failed'));
          setTimeout(() => setCopySuccess(null), 3000);
          return false;
      }
  };

  const handleShareToX = () => {
      setShowConfirm(true);
  };

  const handleConfirmShare = async () => {
      setShowConfirm(false);
      await generateTombstoneImage();

      const baseUrl = window.location.origin + window.location.pathname;
      const shareUrl = `${baseUrl}?id=${entry.id}`;
      const epitaph = (entry.eulogy?.length > 50) ? entry.eulogy.substring(0, 50) + '...' : (entry.eulogy || '');
      const epitaphText = epitaph ? `${epitaph}

` : '';
      const obituaryText = t('share.obituary', {
          name: entry.name,
          cause: translateCause
      });
      const text = epitaphText + obituaryText;
      const intent = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}&hashtags=GitTomb,IndieDev`;

      window.open(intent, '_blank');
  };

  const handleCancelShare = () => {
      setShowConfirm(false);
  };

  const handleRitualClick = async (e: React.MouseEvent, type: RitualType) => {
      e.stopPropagation();
      const now = Date.now();
      
      const config = RITUALS[type];
      
      // Throttle (2s)
      if (now - lastPayTime.current < 2000) {
          return; 
      }
      
      // --- RESTRICTION LOGIC ---
      
      // 1. Check Auth Requirement
      if (config.requiresAuth && !isAuth) {
          showError(t('restriction.auth_required'));
          return;
      }

      // 2. Check Daily Limit (For Anon users mainly)
      // Note: Backend has 1-year logic for Auth users.
      if (!isAuth && !checkDailyQuota()) {
          showError(t('restriction.daily_limit'));
          return;
      }

      // --- EXECUTE ---
      lastPayTime.current = now;
      setShowMenu(false);

      // Trigger Visual Effects
      let emoji = config.icon;
      switch(type) {
          case 'BUG': setShake(true); setTimeout(() => setShake(false), 500); break;
          case 'FIRE': setShake(true); setIsBurning(true); setTimeout(() => { setShake(false); setIsBurning(false); }, 1000); break;
          case 'WAIFU': setIsHeartbeat(true); setTimeout(() => setIsHeartbeat(false), 1000); break;
      }

      // Call Service
      const profile = getUndertakerProfile();
      const userId = isAuth ? profile.id : null;
      
      const result = await performRitual(entry.id, userId, type, config.power);

      if (result.success) {
          // Success Path
          if (!isAuth) consumeSoulPower(); // Decrement quota for anon
          
          setLastAction(emoji);
          setPowerGained(config.power);
          setLocalRespectsAdded(prev => prev + config.power);
          setJustPaid(true);

          // Update Parent State (Optional, mostly for list refresh)
          onPayRespect(entry.id); 

          setTimeout(() => {
              setJustPaid(false);
              setLastAction('');
          }, 2000);

      } else {
          // Failure Path (e.g., Already Paid)
          if (result.message === 'ALREADY_PAID') {
              showError(t('restriction.already_paid'));
          } else {
              showError(result.message || "Ritual failed.");
          }
      }
  }

  // Styles Map
  const tierStyles: Record<TombTier, { 
      container: string, 
      title: string, 
      border: string, 
      icon: string, 
      name: string,
      textPrimary: string,   // Eulogy Text & Buttons
      textSecondary: string,  // Date/Info Text
      statsBg: string,        // Background for stats box
      statsLabel: string,     // Label color (DNA, Cause)
      statsValue: string,     // Value color
      buttonHover: string     // Hover state for main button
  }> = {
    GOLD: {
        container: "gold-shine bg-gradient-to-b from-[#4a3b00] to-black border-yellow-500 shadow-[0px_0px_20px_rgba(234,179,8,0.5)]",
        title: "text-yellow-400 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]",
        border: "border-yellow-500",
        icon: "👑",
        name: "tier.gold",
        textPrimary: "text-yellow-100",
        textSecondary: "text-yellow-200/60",
        statsBg: "bg-black/40",
        statsLabel: "text-gray-400",
        statsValue: "text-gray-200",
        buttonHover: "hover:bg-white/10"
    },
    SILVER: {
        container: "silver-shine bg-gradient-to-b from-slate-700 to-black border-slate-300 shadow-[0px_0px_15px_rgba(203,213,225,0.3)]",
        title: "text-slate-200 drop-shadow-[0_2px_2px_rgba(0,0,0,0.8)]",
        border: "border-slate-300",
        icon: "⚔️",
        name: "tier.silver",
        textPrimary: "text-slate-100",
        textSecondary: "text-slate-300/60",
        statsBg: "bg-black/40",
        statsLabel: "text-gray-400",
        statsValue: "text-gray-200",
        buttonHover: "hover:bg-white/10"
    },
    BRONZE: {
        container: "bronze-shine bg-gradient-to-b from-[#4a2c10] to-black border-orange-700 shadow-[8px_8px_0px_0px_rgba(67,20,7,0.8)]",
        title: "text-orange-300",
        border: "border-orange-700",
        icon: "🛡️",
        name: "tier.bronze",
        textPrimary: "text-orange-100",
        textSecondary: "text-orange-200/60",
        statsBg: "bg-black/40",
        statsLabel: "text-gray-400",
        statsValue: "text-gray-200",
        buttonHover: "hover:bg-white/10"
    },
    IRON: {
        container: "iron-shine bg-graveyard-stone border-gray-500 shadow-[8px_8px_0px_0px_rgba(0,0,0,0.5)]",
        // IRON is adaptive.
        title: "text-graveyard-highlight", 
        border: "border-gray-500",
        icon: "⛓️",
        name: "tier.iron",
        textPrimary: "text-graveyard-highlight", 
        textSecondary: "text-graveyard-text opacity-75",
        statsBg: "bg-graveyard-dark/10", // Adaptive subtle background
        statsLabel: "text-graveyard-text",
        statsValue: "text-graveyard-highlight",
        buttonHover: "hover:bg-graveyard-highlight/10"
    },
    WOOD: {
        container: "bg-[#2d1b0e] border-[#5c3a21] shadow-[8px_8px_0px_0px_rgba(20,10,5,0.8)]",
        title: "text-[#a37f5f]",
        border: "border-[#5c3a21]",
        icon: "🪵",
        name: "tier.wood",
        textPrimary: "text-[#dcb48b]",
        textSecondary: "text-[#a37f5f]/80",
        statsBg: "bg-black/40",
        statsLabel: "text-[#a37f5f]",
        statsValue: "text-[#dcb48b]",
        buttonHover: "hover:bg-white/10"
    },
    ROTTEN: {
        container: "bg-[#1a201a] border-[#2f3f2f] shadow-none opacity-90 rotate-1",
        title: "text-[#5a7a5a]",
        border: "border-[#2f3f2f]",
        icon: "🧟",
        name: "tier.rotten",
        textPrimary: "text-[#5a7a5a]",
        textSecondary: "text-[#4a6a4a]",
        statsBg: "bg-black/40",
        statsLabel: "text-[#4a6a4a]",
        statsValue: "text-[#5a7a5a]",
        buttonHover: "hover:bg-white/10"
    }
  };

  const style = tierStyles[tier];

  // Classic Rounded Top Shape (Scaled Up & Widened)
  const shapeStyle = {
    borderTopLeftRadius: '50% 90px',
    borderTopRightRadius: '50% 90px',
  };

  const baseClasses = `
    relative text-graveyard-text 
    flex flex-col items-center text-center
    transition-all hover:-translate-y-1 
    overflow-visible group w-full
    ${isDetail ? 'p-16 max-w-5xl mx-auto' : 'p-12 h-full min-h-[460px]'}
  `;

  const isSameDay = entry.birthDate === entry.deathDate;

  return (
    <div className={`relative group w-full ${isDetail ? '' : 'h-full'}`}>
      
      {/* TOOLTIP (Only on list view) - Shows EULOGY */}
      {!isDetail && (
        <div className="absolute bottom-[95%] left-1/2 -translate-x-1/2 w-80 bg-black border-2 border-white p-6 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50 shadow-[0_0_15px_rgba(255,255,255,0.2)] rounded-lg">
           {/* Tooltip always dark, so text-white is correct here */}
           <p className="font-mono text-sm text-white italic leading-relaxed text-center">"{entry.eulogy}"</p>
           {/* Little triangle at bottom */}
           <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-white"></div>
        </div>
      )}

      {/* RITUAL FLOAT ANIMATION */}
      {justPaid && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none z-[60] animate-float-up flex flex-col items-center">
              <span className="text-6xl">{lastAction}</span>
              <span className="text-3xl font-bold font-pixel text-yellow-400 mt-2">+{powerGained}</span>
          </div>
      )}

      {/* Error Toast (Floating above tombstone) */}
      {errorMsg && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-64 bg-red-900 border border-red-500 text-white text-xs p-3 rounded text-center z-[70] animate-bounce font-pixel shadow-lg">
              {errorMsg}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-red-500"></div>
          </div>
      )}

      {/* Copy Success Toast (Floating above tombstone) */}
      {copySuccess && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-full w-72 bg-green-900 border border-green-500 text-white text-sm p-3 rounded text-center z-[70] animate-bounce font-pixel shadow-lg">
              {copySuccess}
              <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-green-500"></div>
          </div>
      )}

      {/* Main Tombstone */}
      <div
        ref={tombstoneRef}
        className={`
          ${baseClasses}
          ${style.container}
          border-4
          ${shake ? 'animate-shake' : ''}
          ${isBurning ? 'animate-burn' : ''}
          ${isHeartbeat ? 'animate-heartbeat' : ''}
        `}
        style={shapeStyle}
      >
        {/* Tier Badge (Scaled Up) */}
        <div 
            className={`absolute -top-6 -right-6 bg-black border-2 ${style.border} rounded-full w-16 h-16 flex items-center justify-center z-10`} 
            title={t(style.name)}
        >
          <span className="text-3xl">{style.icon}</span>
        </div>

        {/* Background Symbol: Cross (Adaptive Color) */}
        <div className={`absolute top-14 right-10 opacity-20 text-6xl font-pixel select-none pointer-events-none ${style.textPrimary}`}>
            †
        </div>

        {/* Header */}
        <div className={`font-pixel mb-4 text-sm tracking-widest ${style.title} opacity-80 mt-6`}>
            {t('tomb.rip')}
        </div>
        
        <h2 className={`font-pixel mb-3 break-words w-full ${isDetail ? 'text-6xl' : 'text-3xl'} ${style.title}`}>
          {entry.name}
        </h2>
        
        {/* Dates (Adaptive Color) */}
        <div className={`font-mono text-base mb-6 ${style.textSecondary}`}>
          {isSameDay ? (
            <span className="text-red-300">Born & Died: {entry.birthDate}</span>
          ) : (
            <span>{entry.birthDate} — {entry.deathDate}</span>
          )}
        </div>

        <div className={`w-full border-t-2 border-dashed ${style.border} opacity-50 my-4`}></div>

        {/* Main Content */}
        <div className="flex-1 w-full mt-6 relative z-10">
          {/* Eulogy Text (Adaptive Color) */}
          {isDetail && (
            <p className={`font-mono ${style.textPrimary} mb-8 italic text-xl leading-relaxed`}>
              "{entry.eulogy}"
            </p>
          )}
          
          {!isDetail && (
             <p className={`font-mono ${style.textPrimary} mb-6 italic line-clamp-6 text-base leading-relaxed`}>
             "{entry.eulogy}"
           </p>
          )}

          {/* Stats Box - Configurable Style */}
          <div className={`text-sm font-mono text-left ${style.statsBg} p-5 rounded mb-6 border border-current opacity-90 space-y-2.5`}>
            <p><span className={`${style.statsLabel} w-20 inline-block`}>{t('tomb.language')}:</span> <span className={style.statsValue}>{entry.language}</span></p>
            <p><span className={`${style.statsLabel} w-20 inline-block`}>{t('tomb.cause')}:</span> <span className="text-red-400">{translateCause}</span></p>
            
            {/* Split Stats Display */}
            <div className={`border-t border-current opacity-80 pt-3 mt-3 flex justify-between items-center text-xs md:text-sm ${style.statsLabel}`}>
                 <div className="flex items-center gap-2" title="GitHub Stars">
                    <span className="text-base">⭐</span>
                    <span className={`${style.statsValue} text-sm font-bold`}>{entry.stars}</span>
                    <span className="text-[10px] uppercase">{t('tomb.glory')}</span>
                 </div>
                 <div className="text-lg">+</div>
                 <div className="flex items-center gap-2" title="Respects Paid">
                    <span className="text-base">🕯️</span>
                    <span className={`${style.statsValue} text-sm font-bold`}>{currentRespects}</span>
                    <span className="text-[10px] uppercase">{t('stats.respects')}</span>
                 </div>
            </div>

            <p className={`border-t border-current opacity-80 pt-3 mt-2 flex justify-between items-center p-2 rounded ${style.statsBg}`}>
                <span className={`${style.statsLabel} font-pixel text-xs uppercase tracking-wide`}>{t('tomb.score')}:</span> 
                <span className="text-yellow-500 font-bold font-pixel text-lg">{score}</span>
            </p>

            {entry.epitaph && <p className={`mt-3 pt-2 border-t border-current opacity-80 italic ${style.statsLabel}`}>"{entry.epitaph}"</p>}
          </div>

          {/* Share Button - Only in Detail View */}
          {isDetail && (
              <button 
                onClick={handleShareToX}
                className="w-full mb-6 font-pixel text-xs bg-black text-white hover:bg-gray-800 border-2 border-white/20 py-3 flex items-center justify-center gap-2 transition-colors dark:border-white/20 light:border-black/20"
              >
                  <span>𝕏</span>
                  <span>{t('tomb.share_btn')}</span>
              </button>
          )}

        </div>

        {/* Action Area */}
        <div className="mt-6 w-full relative z-30">
          
          {/* RITUAL MENU */}
          <div className="relative">
              {showMenu && (
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-[320px] bg-black border-2 border-white mb-3 p-3 grid grid-cols-3 gap-3 rounded shadow-xl z-50 animate-fade-in-up">
                      {Object.values(RITUALS).map((rit) => {
                          const isLocked = rit.requiresAuth && !isAuth;
                          return (
                              <button 
                                key={rit.id}
                                onClick={(e) => handleRitualClick(e, rit.id)} 
                                title={isLocked ? t('restriction.waifu_locked') : t(rit.labelKey)}
                                className={`
                                    flex flex-col items-center justify-center p-3 rounded hover:bg-white/10 border border-transparent hover:border-white/30 transition-all relative
                                    ${isLocked ? 'opacity-50 grayscale cursor-not-allowed' : ''}
                                `}
                              >
                                  <span className="text-2xl mb-1">{rit.icon}</span>
                                  <span className="text-xs font-pixel text-yellow-500">+{rit.power}</span>
                                  {isLocked && <span className="absolute top-1 right-1 text-[10px]">🔒</span>}
                              </button>
                          )
                      })}
                  </div>
              )}

              <button 
                onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu); }}
                className={`
                  w-full font-pixel text-sm py-4 px-6 uppercase tracking-wider
                  border-2 
                  transition-all active:translate-y-1 active:shadow-none
                  ${justPaid 
                      ? 'bg-white text-black border-white cursor-default' 
                      : `bg-transparent ${style.textPrimary} ${style.buttonHover} ${style.border}`
                  }
                `}
              >
                {justPaid ? t('tomb.pay_respects') : (showMenu ? "Select Ritual..." : t('tomb.ritual_btn'))}
              </button>
          </div>

           <div className="mt-4 text-xs font-mono text-graveyard-accent/60 flex justify-center uppercase tracking-widest">
              <span>{t(style.name)}</span>
           </div>
         </div>
       </div>

       {/* Share Confirmation Modal */}
       {showConfirm && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[100] animate-fade-in">
             <div className="bg-graveyard-stone border-4 border-graveyard-accent rounded-lg p-8 max-w-md mx-4 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                 <h3 className="font-pixel text-2xl text-graveyard-highlight mb-4 text-center">{t('share.confirm_title')}</h3>
                 <p className="font-mono text-graveyard-text mb-6 text-center leading-relaxed">{t('share.confirm_message')}</p>
                 <div className="flex gap-4 justify-center">
                     <button
                           onClick={handleCancelShare}
                           className="px-6 py-3 font-pixel text-sm border-2 border-graveyard-accent bg-transparent text-graveyard-text hover:bg-graveyard-accent/20 transition-colors"
                     >
                           {t('share.confirm_cancel')}
                     </button>
                     <button
                           onClick={handleConfirmShare}
                           className="px-6 py-3 font-pixel text-sm bg-graveyard-highlight text-black hover:bg-graveyard-highlight/80 transition-colors"
                     >
                           OK
                     </button>
                 </div>
             </div>
          </div>
       )}

     </div>
   );
 };
