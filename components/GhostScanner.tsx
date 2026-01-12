
import React, { useState } from 'react';
import { scanForDeadRepos } from '../services/githubService';
import { DeadRepoCandidate } from '../types';
import { useTranslation } from '../i18n';

interface GhostScannerProps {
  onSelectRepo: (repo: DeadRepoCandidate) => void;
}

export const GhostScanner: React.FC<GhostScannerProps> = ({ onSelectRepo }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [candidates, setCandidates] = useState<DeadRepoCandidate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasScanned, setHasScanned] = useState(false);

  const handleScan = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setCandidates([]);
    setHasScanned(false);

    try {
      const results = await scanForDeadRepos(username);
      setCandidates(results);
      setHasScanned(true);
    } catch (err: any) {
        if (err.message.includes("User not found")) {
            setError(t('scanner.error.user_not_found'));
        } else if (err.message.includes("rate limit")) {
            setError(t('scanner.error.rate_limit'));
        } else {
            setError(t('scanner.error.generic'));
        }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="bg-graveyard-stone border-4 border-graveyard-accent p-6 mb-8 text-center">
        <h2 className="font-pixel text-xl text-green-500 mb-2">{t('scanner.title')}</h2>
        <p className="font-mono text-graveyard-text mb-6">
          {t('scanner.desc')}
        </p>

        <form onSubmit={handleScan} className="flex gap-2 max-w-md mx-auto">
            <input 
                type="text" 
                placeholder={t('scanner.placeholder')}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="flex-1 bg-graveyard-dark border-2 border-graveyard-accent text-white p-2 font-mono focus:border-green-500 outline-none"
                required
            />
            <button 
                type="submit" 
                disabled={loading}
                className="bg-green-900 border border-green-700 text-white font-pixel text-xs px-4 hover:bg-green-700 disabled:opacity-50"
            >
                {loading ? t('scanner.scanning') : t('scanner.btn')}
            </button>
        </form>
      </div>

      {error && (
        <div className="text-center text-red-400 font-mono mb-8 bg-red-900/20 p-4 border border-red-900">
          {error}
        </div>
      )}

      {hasScanned && candidates.length === 0 && !error && (
        <div className="text-center font-mono text-graveyard-text py-8">
           {t('scanner.empty')}
        </div>
      )}

      {candidates.length > 0 && (
        <div className="space-y-4">
             <h3 className="text-center font-pixel text-green-400 mb-4">
                {t('scanner.found', { count: candidates.length })}
            </h3>
            {candidates.map((repo) => {
                // Calculate color based on days dead
                const isAncient = repo.daysDead > 365;
                const borderClass = isAncient ? 'border-red-900' : 'border-graveyard-accent';
                const textClass = isAncient ? 'text-red-400' : 'text-graveyard-text';

                return (
                    <div key={repo.repoUrl} className={`bg-[#0a0a0a] border-2 ${borderClass} p-4 flex justify-between items-center group hover:bg-white/5 transition-colors`}>
                        <div className="min-w-0 flex-1 mr-4">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`font-pixel text-sm text-white truncate`}>{repo.name}</span>
                                {isAncient && <span className="text-[10px] bg-red-900 text-white px-1 font-mono">ANCIENT</span>}
                            </div>
                            <p className="font-mono text-xs text-graveyard-text truncate">{repo.description}</p>
                            <p className={`font-mono text-xs ${textClass} mt-2`}>
                                {t('scanner.last_push', { date: repo.deathDate, days: repo.daysDead })}
                            </p>
                        </div>
                        <button 
                            onClick={() => onSelectRepo(repo)}
                            className="bg-graveyard-stone hover:bg-white hover:text-black text-white font-pixel text-[10px] px-3 py-2 border border-graveyard-accent shrink-0 whitespace-nowrap"
                        >
                             {t('scanner.bury_it')}
                        </button>
                    </div>
                );
            })}
        </div>
      )}
    </div>
  );
};
