

import React, { useState, useEffect } from 'react';
import { useTranslation } from '../i18n';
import { LLMProvider, LLMSettings } from '../types';
import { ExternalLink } from './ExternalLink';
import { updateSupabaseConfig, resetSupabaseConfig, getCurrentSupabaseConfig } from '../services/supabaseClient';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  llmSettings: LLMSettings;
  onSaveLLMSettings: (settings: LLMSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ 
  isOpen, 
  onClose, 
  autoRefresh, 
  onToggleAutoRefresh,
  llmSettings,
  onSaveLLMSettings
}) => {
  const { t } = useTranslation();
  
  // Local state for LLM config
  const [provider, setProvider] = useState<LLMProvider>('GEMINI');
  const [apiKey, setApiKey] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  // Local state for Advanced Config
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [sbUrl, setSbUrl] = useState('');
  const [sbKey, setSbKey] = useState('');

  // Load initial values when modal opens
  useEffect(() => {
    if (isOpen) {
        setProvider(llmSettings.provider);
        setApiKey(llmSettings.apiKey || '');
        setIsSaved(false);
        setShowAdvanced(false);

        const currentSb = getCurrentSupabaseConfig();
        setSbUrl(currentSb.url || '');
        setSbKey(currentSb.key || '');
    }
  }, [isOpen, llmSettings]);

  const handleSaveLLM = () => {
      onSaveLLMSettings({ provider, apiKey });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 2000);
  };

  const handleSaveAdvanced = () => {
      if (confirm(t('settings.advanced_warn'))) {
          updateSupabaseConfig(sbUrl, sbKey);
      }
  }

  const handleResetAdvanced = () => {
      if (confirm("Reset connection to official server?")) {
          resetSupabaseConfig();
      }
  }

  const getPriestDesc = (p: LLMProvider) => {
      if (p === 'GEMINI') return t('priest.gemini.desc');
      if (p === 'OPENAI') return t('priest.openai.desc');
      if (p === 'OPENROUTER') return t('priest.openrouter.desc');
      if (p === 'DEEPSEEK') return t('priest.deepseek.desc');
      return "";
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-graveyard-stone border-4 border-graveyard-accent max-w-sm w-full p-6 relative shadow-[10px_10px_0px_0px_#000] my-8">
        
        <div className="flex justify-between items-center mb-6 border-b-2 border-graveyard-accent pb-2">
            <h2 className="font-pixel text-lg text-graveyard-highlight">{t('settings.title')}</h2>
            <button 
                onClick={onClose}
                className="text-graveyard-text hover:text-white font-mono text-xl"
            >
                [X]
            </button>
        </div>

        <div className="space-y-6">
            {/* Auto Refresh Toggle */}
            <div className="flex items-center justify-between border-b border-graveyard-accent/20 pb-4">
                <div>
                    <div className="font-pixel text-xs text-white mb-1">
                        {t('settings.auto_refresh')}
                    </div>
                    <div className="font-mono text-xs text-graveyard-text">
                        {t('settings.auto_refresh_desc')}
                    </div>
                </div>
                
                <button 
                    onClick={onToggleAutoRefresh}
                    className={`
                        w-12 h-6 rounded-full p-1 transition-colors border-2
                        ${autoRefresh ? 'bg-green-900 border-green-500' : 'bg-gray-900 border-gray-600'}
                    `}
                >
                    <div className={`
                        w-3 h-3 rounded-full bg-white transition-transform
                        ${autoRefresh ? 'translate-x-6' : 'translate-x-0'}
                    `} />
                </button>
            </div>

            {/* LLM Configuration */}
            <div>
                <h3 className="font-pixel text-sm text-yellow-500 mb-4">{t('settings.llm_config')}</h3>
                
                <div className="mb-4">
                    <label className="block font-mono text-xs text-graveyard-highlight mb-1">{t('settings.provider')}</label>
                    <select 
                        value={provider}
                        onChange={(e) => setProvider(e.target.value as LLMProvider)}
                        className="w-full bg-graveyard-dark border border-graveyard-accent text-white p-2 font-mono text-sm focus:border-yellow-500 outline-none"
                    >
                        {/* The Great Title */}
                        <option value="OPENROUTER">✨ {t('priest.openrouter')}</option>
                        <option value="DEEPSEEK">☯️ {t('priest.deepseek')}</option>
                        <option value="GEMINI">⚡ {t('priest.gemini')}</option>
                        <option value="OPENAI">🧠 {t('priest.openai')}</option>
                    </select>
                    <p className="mt-1 text-[10px] text-graveyard-text italic border-l-2 border-graveyard-accent pl-2 mt-2">
                        {getPriestDesc(provider)}
                    </p>
                </div>

                <div className="mb-4">
                    <label className="block font-mono text-xs text-graveyard-highlight mb-1">
                        {t('settings.api_key')}
                    </label>
                    
                    {provider === 'OPENROUTER' ? (
                        <div className="bg-green-900/20 border border-green-900 p-2 text-[10px] text-green-400 font-mono mb-2">
                             {t('priest.openrouter.desc')} (Official Temple Budget)
                        </div>
                    ) : null}

                    <input 
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder={provider === 'OPENROUTER' ? "Optional: Enter Key" : "sk-..."}
                        className="w-full bg-graveyard-dark border border-graveyard-accent text-white p-2 font-mono text-sm focus:border-yellow-500 outline-none placeholder:text-gray-600"
                    />
                </div>

                <button 
                    onClick={handleSaveLLM}
                    className="w-full bg-yellow-900 border border-yellow-600 text-white font-pixel text-xs py-2 hover:bg-yellow-800 transition-colors"
                >
                    {isSaved ? t('settings.saved') : t('settings.save')}
                </button>
                <p className="text-[10px] text-graveyard-text mt-2 text-center opacity-60">
                    {provider === 'OPENROUTER' && !apiKey 
                        ? "The Saint provides for free."
                        : t('settings.warning')
                    }
                </p>
            </div>
            
            {/* Divider */}
            <div className="border-t border-graveyard-accent/20"></div>

            {/* Advanced Settings (Supabase) */}
            <div>
                 <button 
                    onClick={() => setShowAdvanced(!showAdvanced)}
                    className="w-full text-left font-mono text-xs text-graveyard-text hover:text-white flex items-center justify-between"
                 >
                     <span>{t('settings.advanced')}</span>
                     <span>{showAdvanced ? '[-]' : '[+]'}</span>
                 </button>

                 {showAdvanced && (
                     <div className="mt-4 bg-black/30 p-4 border border-graveyard-accent space-y-4 animate-fade-in-up">
                         <div>
                            <label className="block font-mono text-[10px] text-graveyard-text mb-1">
                                {t('settings.sb_url')}
                            </label>
                            <input 
                                type="text"
                                value={sbUrl}
                                onChange={(e) => setSbUrl(e.target.value)}
                                className="w-full bg-graveyard-dark border border-graveyard-accent text-white p-2 font-mono text-xs focus:border-red-500 outline-none"
                            />
                         </div>
                         <div>
                            <label className="block font-mono text-[10px] text-graveyard-text mb-1">
                                {t('settings.sb_key')}
                            </label>
                            <input 
                                type="password"
                                value={sbKey}
                                onChange={(e) => setSbKey(e.target.value)}
                                className="w-full bg-graveyard-dark border border-graveyard-accent text-white p-2 font-mono text-xs focus:border-red-500 outline-none"
                            />
                         </div>

                         <div className="flex gap-2">
                             <button 
                                onClick={handleSaveAdvanced}
                                className="flex-1 bg-graveyard-stone border border-graveyard-text text-white font-pixel text-[10px] py-2 hover:bg-white hover:text-black"
                             >
                                 Connect
                             </button>
                             <button 
                                onClick={handleResetAdvanced}
                                className="flex-1 bg-red-900/30 border border-red-900 text-red-400 font-pixel text-[10px] py-2 hover:bg-red-900/50"
                             >
                                 Reset
                             </button>
                         </div>
                     </div>
                 )}
            </div>
        </div>

        <div className="mt-8 pt-4 border-t border-graveyard-accent/30 text-center">
            {/* Developer Links */}
            <div className="mb-4 flex flex-col gap-1 opacity-80">
                 <p className="font-pixel text-[10px] text-graveyard-text uppercase">Built By Tom He</p>
                 <div className="flex justify-center gap-3 text-xs font-mono">
                    <ExternalLink href="https://github.com/youyouhe/" className="text-graveyard-accent hover:text-white transition-colors">GitHub</ExternalLink>
                    <span className="text-graveyard-accent">|</span>
                    <ExternalLink href="https://x.com/ChimpanzeeHe" className="text-graveyard-accent hover:text-white transition-colors">X (Twitter)</ExternalLink>
                </div>
            </div>

            <button 
                onClick={onClose}
                className="font-pixel text-xs bg-graveyard-dark text-graveyard-text border border-graveyard-accent px-6 py-2 hover:bg-white hover:text-black hover:border-white transition-colors"
            >
                {t('settings.close')}
            </button>
        </div>

      </div>
    </div>
  );
};
