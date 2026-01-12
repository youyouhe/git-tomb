
import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { LeaderboardEntry } from '../types';
import { getLeaderboard } from '../services/graveyardService';
import { getUndertakerProfile } from '../services/identityService';

interface LeaderboardProps {
    externalData?: LeaderboardEntry[];
    isLoading?: boolean;
    variant?: 'FULL' | 'SIDEBAR';
}

export const Leaderboard: React.FC<LeaderboardProps> = ({ 
    externalData, 
    isLoading: externalLoading, 
    variant = 'FULL' 
}) => {
    const { t, language } = useTranslation();
    const [internalLeaders, setInternalLeaders] = useState<LeaderboardEntry[]>([]);
    const [internalLoading, setInternalLoading] = useState(true);
    const myProfile = getUndertakerProfile();

    const isSidebar = variant === 'SIDEBAR';
    
    // If external data is provided, use it. Otherwise handle fetching internally.
    const leaders = externalData || internalLeaders;
    const loading = externalData ? externalLoading : internalLoading;

    useEffect(() => {
        if (!externalData) {
            const fetchLeaders = async () => {
                setInternalLoading(true);
                try {
                    const data = await getLeaderboard();
                    setInternalLeaders(data);
                } catch (e) {
                    console.error(e);
                } finally {
                    setInternalLoading(false);
                }
            };
            fetchLeaders();
        }
    }, [externalData]);

    const handleShare = (rank: number, count: number) => {
        const text = t('leaderboard.share_msg_rank', { rank: rank, count: count });
        const url = window.location.href;
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}&hashtags=RepoGraveyard,IndieDev`;
        window.open(twitterUrl, '_blank');
    }

    return (
        <div className={`animate-fade-in-up ${isSidebar ? 'w-full' : 'max-w-2xl mx-auto p-4'}`}>
            <div className={`text-center ${isSidebar ? 'mb-4' : 'mb-8'}`}>
                <h2 className={`font-pixel ${isSidebar ? 'text-lg' : 'text-2xl'} text-yellow-500 mb-2`}>
                    {t('leaderboard.title')}
                </h2>
                {!isSidebar && (
                    <p className="font-mono text-graveyard-text">{t('leaderboard.desc')}</p>
                )}
            </div>

            <div className={`bg-graveyard-stone border-4 border-graveyard-accent ${isSidebar ? 'shadow-none border-2' : 'shadow-[10px_10px_0px_0px_#000]'}`}>
                {/* Header Row */}
                <div className={`grid grid-cols-12 gap-1 p-2 border-b-2 border-graveyard-accent font-pixel text-[10px] text-graveyard-text uppercase`}>
                    <div className="col-span-2 text-center">#</div>
                    <div className="col-span-7">{t('leaderboard.undertaker')}</div>
                    <div className="col-span-3 text-right">💀</div>
                </div>

                {loading ? (
                    <div className="p-8 text-center font-pixel text-xs animate-pulse text-graveyard-text">
                        Connecting...
                    </div>
                ) : leaders.length === 0 ? (
                    <div className="p-8 text-center font-mono text-graveyard-text text-xs">
                        {t('leaderboard.empty')}
                    </div>
                ) : (
                    <div className="divide-y divide-graveyard-accent/30 bg-[#151515]">
                        {leaders.map((entry, index) => {
                            const isMe = entry.undertakerId === myProfile.id;
                            let rankColor = "text-graveyard-text";
                            if (index === 0) rankColor = "text-yellow-400";
                            if (index === 1) rankColor = "text-gray-300";
                            if (index === 2) rankColor = "text-orange-400";

                            const rankInfo = entry.rankInfo;

                            return (
                                <div key={entry.undertakerId} className={`relative group grid grid-cols-12 gap-1 p-2 items-center transition-colors ${isMe ? 'bg-yellow-900/20' : 'hover:bg-white/5'}`}>
                                    <div className={`col-span-2 text-center font-pixel ${isSidebar ? 'text-sm' : 'text-lg'} ${rankColor}`}>
                                        {index + 1}
                                    </div>
                                    <div className="col-span-7 font-mono text-xs truncate flex items-center gap-2">
                                        {!isSidebar && (
                                            <div className={`w-6 h-6 rounded bg-gradient-to-br ${index < 3 ? 'from-yellow-700 to-black' : 'from-gray-700 to-black'} flex items-center justify-center text-[10px] border border-white/10 shrink-0`}>
                                                {entry.alias.slice(0, 1)}
                                            </div>
                                        )}
                                        <div className="flex flex-col truncate min-w-0">
                                            <span className={`${isMe ? 'text-yellow-200' : 'text-white'} truncate`}>
                                                {entry.alias}
                                            </span>
                                            {rankInfo && (
                                                <div className={`flex items-center gap-1 ${rankInfo.color} text-[10px] mt-0.5`}>
                                                    <span>{rankInfo.icon}</span>
                                                    <span className="truncate">{t(rankInfo.title)}</span>
                                                </div>
                                            )}
                                            {isMe && <span className="text-[8px] text-yellow-600 font-pixel mt-0.5">YOU</span>}
                                        </div>
                                    </div>
                                    <div className="col-span-3 text-right font-pixel text-yellow-500 text-xs">
                                        {entry.count}
                                    </div>
                                    
                                    {/* Share Button (Only visible for ME) */}
                                    {isMe && (
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); handleShare(index + 1, entry.count); }}
                                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-blue-900/80 text-white text-[9px] px-2 py-1 rounded font-pixel opacity-0 group-hover:opacity-100 transition-opacity border border-blue-500"
                                        >
                                            {t('leaderboard.share')}
                                        </button>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {!isSidebar && (
                <div className="mt-8 text-center font-mono text-xs text-graveyard-text opacity-50">
                    * Rankings update whenever a fresh body is dropped.
                </div>
            )}
        </div>
    );
};
