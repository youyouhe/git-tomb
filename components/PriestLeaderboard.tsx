
import React, { useEffect, useState } from 'react';
import { useTranslation } from '../i18n';
import { PriestStats, LLMProvider } from '../types';
import { getPriestStats, blessPriest } from '../services/graveyardService';

interface PriestLeaderboardProps {
    externalData?: PriestStats[];
    onRefreshNeeded?: () => void;
}

export const PriestLeaderboard: React.FC<PriestLeaderboardProps> = ({ externalData, onRefreshNeeded }) => {
    const { t } = useTranslation();
    const [stats, setStats] = useState<PriestStats[]>([]);
    const [loading, setLoading] = useState(true);
    const [voted, setVoted] = useState<string | null>(null);

    useEffect(() => {
        if (externalData) {
            setStats(externalData);
            setLoading(false);
        } else {
            loadStats();
        }
    }, [externalData]);

    const loadStats = async () => {
        setLoading(true);
        const data = await getPriestStats();
        setStats(data);
        setLoading(false);
    }

    const handleBless = (provider: LLMProvider, currentLikes: number) => {
        // Optimistic UI
        const newStats = stats.map(s => s.provider === provider ? { ...s, likes: s.likes + 1 } : s);
        setStats(newStats);
        setVoted(provider);

        // API Call
        blessPriest(provider, currentLikes);
        
        // Notify parent if needed to trigger global refresh cycle
        if (onRefreshNeeded) onRefreshNeeded();

        setTimeout(() => setVoted(null), 1500);
    }

    const getPriestName = (p: string) => {
        if (p === 'GEMINI') return t('priest.gemini');
        if (p === 'OPENAI') return t('priest.openai');
        if (p === 'OPENROUTER') return t('priest.openrouter');
        if (p === 'DEEPSEEK') return t('priest.deepseek');
        return p;
    }

    const getAvatar = (p: string) => {
        if (p === 'GEMINI') return '⚡';
        if (p === 'OPENAI') return '🎩';
        if (p === 'OPENROUTER') return '✨'; // The Saint
        if (p === 'DEEPSEEK') return '☯️';
        return '🤖';
    }

    return (
        <div className="w-full animate-fade-in-up">
             <div className="text-center mb-4">
                <h2 className="font-pixel text-lg text-purple-400 mb-1 border-b-2 border-purple-900 pb-2">
                    {t('priest.board.title')}
                </h2>
            </div>

            {loading ? (
                <div className="p-4 text-center text-xs font-mono animate-pulse text-graveyard-text">
                    Loading stats...
                </div>
            ) : (
                <div className="space-y-3">
                    {stats.map((s, idx) => (
                        <div key={s.provider} className="bg-[#1a1a2e] border border-purple-900/50 p-3 relative group overflow-hidden">
                             {/* Rank Badge */}
                             <div className="absolute top-0 right-0 bg-purple-900/30 text-[10px] font-pixel px-1 text-purple-300">
                                #{idx + 1}
                             </div>

                             <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xl bg-black/20 rounded p-1">{getAvatar(s.provider)}</span>
                                    <div>
                                        <div className="font-pixel text-xs text-purple-200">
                                            {getPriestName(s.provider).split('(')[0]}
                                        </div>
                                        <div className="text-[10px] font-mono text-purple-400/70">
                                            {s.provider}
                                        </div>
                                    </div>
                                </div>
                             </div>

                             <div className="grid grid-cols-2 gap-2 text-[10px] font-mono border-t border-white/5 pt-2 mt-1">
                                 <div>
                                     <span className="text-graveyard-text block">{t('priest.board.busy')}</span>
                                     <span className="text-white text-sm">{s.busyCount}</span>
                                 </div>
                                 <div className="text-right">
                                     <span className="text-graveyard-text block">{t('priest.board.likes')}</span>
                                     <span className="text-yellow-500 text-sm">{s.likes}</span>
                                 </div>
                             </div>

                             {/* Bless Button */}
                             <button 
                                onClick={() => handleBless(s.provider, s.likes)}
                                disabled={voted !== null}
                                className={`
                                    w-full mt-2 text-[10px] font-pixel py-1 text-center transition-all
                                    border border-purple-500/30 hover:bg-purple-500/20 text-purple-300
                                    active:scale-95
                                    ${voted === s.provider ? 'bg-yellow-500 text-black border-yellow-500' : ''}
                                `}
                             >
                                 {voted === s.provider ? 'BLESSED!' : `🙏 ${t('priest.board.action')}`}
                             </button>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
