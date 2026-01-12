import React, { useState } from 'react';
import { getGravesByOwner } from '../services/graveyardService';
import { GraveEntry } from '../types';
import { useTranslation } from '../i18n';
import { GraveyardList } from './GraveyardList';

interface KinSearchProps {
  onPayRespect: (id: string) => void;
  onOpenDetail: (entry: GraveEntry) => void;
}

export const KinSearch: React.FC<KinSearchProps> = ({ onPayRespect, onOpenDetail }) => {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [results, setResults] = useState<GraveEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setResults([]);
    setHasSearched(false);

    try {
      const data = await getGravesByOwner(username);
      setResults(data);
      setHasSearched(true);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="bg-graveyard-stone border-4 border-graveyard-accent p-6 mb-8 text-center max-w-3xl mx-auto">
        <h2 className="font-pixel text-xl text-yellow-500 mb-2">{t('kin.title')}</h2>
        <p className="font-mono text-graveyard-text mb-6">
          {t('kin.desc')}
        </p>

        <form onSubmit={handleSearch} className="flex gap-2 max-w-md mx-auto">
          <input 
            type="text" 
            placeholder={t('kin.placeholder')}
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="flex-1 bg-graveyard-dark border-2 border-graveyard-accent text-white p-2 font-mono focus:border-yellow-500 outline-none"
            required
          />
          <button 
            type="submit" 
            disabled={loading}
            className="bg-yellow-700 text-black font-pixel text-xs px-4 hover:bg-yellow-600 disabled:opacity-50"
          >
            {loading ? t('kin.searching') : t('kin.btn')}
          </button>
        </form>
      </div>

      {hasSearched && results.length === 0 && (
        <div className="text-center py-10 font-mono text-lg text-graveyard-text">
          {t('kin.empty')}
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-6">
            <h3 className="font-pixel text-white text-center">
                {t('kin.found', { count: results.length })}
            </h3>
            <GraveyardList 
                entries={results} 
                onPayRespect={onPayRespect}
                onOpenDetail={onOpenDetail}
            />
        </div>
      )}
    </div>
  );
};