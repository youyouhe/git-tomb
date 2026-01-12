
import React from 'react';
import { useTranslation } from '../i18n';
import { ExternalLink } from './ExternalLink';

export const Footer: React.FC = () => {
  const { t } = useTranslation();

  return (
    <footer className="mt-12 border-t-4 border-graveyard-stone bg-[#111] p-6 text-center">
      <div className="max-w-2xl mx-auto">
        <h3 className="font-pixel text-sm text-graveyard-text mb-4 uppercase tracking-widest">
          {t('app.title')}
        </h3>
        
        <div className="mt-8 text-xs text-graveyard-accent font-pixel flex flex-col items-center gap-2">
          <span>{t('footer.toolmaker')}</span>
          
          <div className="flex gap-4 mt-1 opacity-70">
            <ExternalLink 
              href="https://github.com/youyouhe/" 
              className="hover:text-white hover:underline transition-colors"
            >
              GitHub
            </ExternalLink>
            <span className="text-graveyard-stone">|</span>
            <ExternalLink 
              href="https://x.com/ChimpanzeeHe" 
              className="hover:text-white hover:underline transition-colors"
            >
              X (Twitter)
            </ExternalLink>
          </div>
        </div>
      </div>
    </footer>
  );
};
