
import React from 'react';
import { GraveEntry } from '../types';
import { Tombstone } from './Tombstone';
import { useTranslation } from '../i18n';

interface GraveyardListProps {
  entries: GraveEntry[];
  onPayRespect: (id: string) => void;
  onOpenDetail: (entry: GraveEntry) => void;
}

export const GraveyardList: React.FC<GraveyardListProps> = ({ entries, onPayRespect, onOpenDetail }) => {
  const { t } = useTranslation();

  if (entries.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="font-pixel text-graveyard-text">{t('list.empty')}</p>
        <p className="font-mono text-sm mt-2">{t('list.suspicious')}</p>
      </div>
    );
  }

  // UPDATED GRID: Truly adaptive
  // - 1 col on mobile
  // - 2 cols on md/lg (keeping them wide)
  // - 3 cols on xl (wider screens)
  // - 4 cols on 2xl (very wide screens)
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-16 px-6">
      {entries.map((entry) => (
        <div key={entry.id} onClick={() => onOpenDetail(entry)} className="cursor-pointer w-full">
          <Tombstone 
            entry={entry} 
            onPayRespect={onPayRespect} 
          />
        </div>
      ))}
    </div>
  );
};
