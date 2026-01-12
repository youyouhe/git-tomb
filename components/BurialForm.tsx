
import React, { useState, useEffect, useMemo } from 'react';
import { DeathCause, ProjectData, LLMProvider } from '../types';
import { fetchGithubInfo } from '../services/githubService';
import { checkRepoExists } from '../services/graveyardService';
import { useTranslation, CAUSE_TRANSLATIONS } from '../i18n';

interface BurialFormProps {
  onBury: (data: ProjectData, cause: DeathCause, epitaph: string) => void;
  isLoading: boolean;
  initialData?: ProjectData | null;
  onVisitExisting: (id: string) => void;
  currentProvider: LLMProvider;
}

export const BurialForm: React.FC<BurialFormProps> = ({ onBury, isLoading, initialData, onVisitExisting, currentProvider }) => {
  const { t, language } = useTranslation();
  const translateCause = (cause: DeathCause) => CAUSE_TRANSLATIONS[language][cause] || cause;

  const [step, setStep] = useState<1 | 2>(1);
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [repoData, setRepoData] = useState<ProjectData | null>(null);
  const [cause, setCause] = useState<DeathCause>(DeathCause.LOST_INTEREST);
  const [epitaph, setEpitaph] = useState('');
  const [isFetching, setIsFetching] = useState(false);

  // Anti-Spam Captcha State
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaChallenge, setCaptchaChallenge] = useState({ num1: 0, num2: 0 });

  const epitaphPresets = [
    t('preset.machine'),
    t('preset.todo'),
    t('preset.rust'),
    t('preset.weekend'),
    t('preset.console'),
    t('preset.coffee'),
    t('preset.docs'),
    t('preset.404')
  ];

  // Generate Captcha on mount
  useEffect(() => {
    setCaptchaChallenge({
        num1: Math.floor(Math.random() * 10) + 1,
        num2: Math.floor(Math.random() * 10) + 1
    });
  }, []);

  useEffect(() => {
    if (initialData) {
      const checkAndSet = async () => {
        setIsFetching(true);
        const id = await checkRepoExists(initialData.repoUrl);
        if (id) {
            setExistingId(id);
            setError(t('form.error.already_buried'));
        } else {
            setRepoData(initialData);
            setStep(2);
            setUrl(initialData.repoUrl);
        }
        setIsFetching(false);
      }
      checkAndSet();
    }
  }, [initialData, t]);

  const handleFetch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setExistingId(null);
    setIsFetching(true);
    
    if (!url.includes('github.com/')) {
        setError("Invalid URL. Must be a GitHub repository.");
        setIsFetching(false);
        return;
    }

    try {
      const data = await fetchGithubInfo(url);
      
      const duplicateId = await checkRepoExists(data.repoUrl);
      if (duplicateId) {
          setExistingId(duplicateId);
          setError(t('form.error.already_buried'));
          setIsFetching(false);
          return;
      } 
      
      const lastPushDate = new Date(data.deathDate);
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(new Date().getMonth() - 6);

      if (lastPushDate > sixMonthsAgo) {
          setError(t('form.error.alive'));
          setIsFetching(false);
          return;
      }

      setRepoData(data);
      setStep(2);

    } catch (err: any) {
      setError(err.message || t('form.error.repo_not_found'));
    } finally {
      setIsFetching(false);
    }
  };

  const handleFinalSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (parseInt(captchaAnswer) !== captchaChallenge.num1 + captchaChallenge.num2) {
        setError("Captcha Failed. Are you a robot?");
        return;
    }

    if (repoData) {
      onBury(repoData, cause, epitaph);
    }
  };

  const getPriestName = () => {
      if (currentProvider === 'GEMINI') return t('priest.gemini');
      if (currentProvider === 'OPENAI') return t('priest.openai');
      if (currentProvider === 'OPENROUTER') return t('priest.openrouter');
      if (currentProvider === 'DEEPSEEK') return t('priest.deepseek');
      return "AI Priest";
  }

  if (isLoading) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-4">
        <div className="animate-bounce text-6xl mb-8">🕯️</div>
        <h2 className="font-pixel text-xl text-white mb-4 animate-pulse leading-relaxed">
          {t('form.loading.title', { priest: getPriestName() })}
        </h2>
        <p className="font-mono text-lg text-graveyard-text">
          {t('form.loading.desc')}
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-xl mx-auto bg-graveyard-stone border-4 border-graveyard-accent p-6 shadow-[10px_10px_0px_0px_#000]">
      <h2 className="font-pixel text-xl text-white mb-6 text-center border-b-2 border-graveyard-accent pb-4">
        {step === 1 ? t('form.step1') : t('form.step2')}
      </h2>

      {step === 1 && (
        <form onSubmit={handleFetch} className="space-y-6">
          <div>
            <label className="block font-mono text-graveyard-highlight mb-2">{t('form.url_label')}</label>
            <input 
              type="url" 
              required
              placeholder={t('form.url_placeholder')}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-graveyard-dark border-2 border-graveyard-accent text-white p-3 font-mono focus:border-white focus:outline-none"
            />
          </div>

          {error && (
            <div className={`p-3 text-sm font-mono border ${existingId ? 'bg-yellow-900/50 border-yellow-500 text-yellow-200' : 'bg-red-900/50 border-red-500 text-red-200'}`}>
              <p className="mb-2">{error}</p>
              {existingId && (
                  <button 
                    type="button"
                    onClick={() => onVisitExisting(existingId)}
                    className="bg-yellow-600 text-black px-4 py-2 font-pixel text-xs hover:bg-yellow-500 w-full"
                  >
                      {t('form.btn_visit')}
                  </button>
              )}
            </div>
          )}

          {!existingId && (
            <button 
                type="submit" 
                disabled={isFetching}
                className="w-full bg-white text-black font-pixel text-sm py-4 hover:bg-graveyard-highlight transition-colors disabled:opacity-50"
            >
                {isFetching ? t('form.digging') : t('form.next')}
            </button>
          )}
        </form>
      )}

      {step === 2 && repoData && (
        <form onSubmit={handleFinalSubmit} className="space-y-6">
          <div className="bg-black/30 p-4 border border-graveyard-accent">
            <p className="font-pixel text-white text-sm">{repoData.name}</p>
            <p className="font-mono text-xs text-graveyard-text mt-1">{repoData.description}</p>
            <div className="flex gap-4 mt-2 text-xs font-mono text-graveyard-highlight items-center">
              <span>⭐ {repoData.stars}</span>
              <span>🍴 {repoData.forks}</span>
              {repoData.birthDate === repoData.deathDate ? (
                   <span className="text-red-300">📅 Born & Died: {repoData.birthDate}</span>
              ) : (
                  <>
                    <span>📅 Born: {repoData.birthDate}</span>
                    <span className="text-red-400">💀 Died: {repoData.deathDate}</span>
                  </>
              )}
            </div>
          </div>

          <div>
            <label className="block font-mono text-graveyard-highlight mb-2">{t('form.cause_label')}</label>
            <select 
              value={cause}
              onChange={(e) => setCause(e.target.value as DeathCause)}
              className="w-full bg-graveyard-dark border-2 border-graveyard-accent text-white p-3 font-mono focus:border-white focus:outline-none"
            >
              {Object.values(DeathCause).map((c) => (
                <option key={c} value={c}>{translateCause(c)}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-mono text-graveyard-highlight mb-2">{t('form.epitaph_label')}</label>
            
            <div className="flex flex-wrap gap-2 mb-3">
              {epitaphPresets.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setEpitaph(preset)}
                  className={`text-xs font-mono border px-2 py-1 transition-all ${
                    epitaph === preset 
                    ? 'bg-white text-black border-white' 
                    : 'bg-transparent text-graveyard-text border-graveyard-accent hover:border-graveyard-highlight hover:text-white'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <input 
              type="text" 
              placeholder={t('form.epitaph_placeholder')}
              value={epitaph}
              onChange={(e) => setEpitaph(e.target.value)}
              maxLength={60}
              className="w-full bg-graveyard-dark border-2 border-graveyard-accent text-white p-3 font-mono focus:border-white focus:outline-none"
            />
            <p className="text-right text-xs text-graveyard-text mt-1">{epitaph.length}/60</p>
          </div>

          <div className="border border-graveyard-accent p-3 bg-black/40">
             <label className="block font-pixel text-xs text-red-400 mb-2 uppercase">
                Anti-Robot Check
             </label>
             <div className="flex items-center gap-3">
                 <span className="font-mono text-white text-lg">
                    {captchaChallenge.num1} + {captchaChallenge.num2} = ?
                 </span>
                 <input 
                    type="number"
                    value={captchaAnswer}
                    onChange={(e) => setCaptchaAnswer(e.target.value)}
                    placeholder="?"
                    className="w-20 bg-graveyard-dark border border-graveyard-accent text-white p-2 font-mono text-center focus:border-red-500 outline-none"
                    required
                 />
             </div>
             {error && error.includes('Captcha') && (
                 <p className="text-red-500 text-xs mt-2 font-mono">{error}</p>
             )}
          </div>

          <button 
            type="submit" 
            className="w-full bg-red-900 text-white border-2 border-red-700 font-pixel text-sm py-4 hover:bg-red-800 transition-colors"
          >
            {t('form.bury_btn')}
          </button>
          
          <button 
            type="button"
            onClick={() => setStep(1)}
            className="w-full text-graveyard-text font-mono text-sm hover:underline"
          >
            {t('form.back')}
          </button>
        </form>
      )}
    </div>
  );
};
