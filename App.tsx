
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { GraveyardList } from './components/GraveyardList';
import { BurialForm } from './components/BurialForm';
import { Tombstone } from './components/Tombstone';
import { GhostScanner } from './components/GhostScanner';
import { KinSearch } from './components/KinSearch';
import { SettingsModal } from './components/SettingsModal';
import { IdentityModal } from './components/IdentityModal'; 
import { Leaderboard } from './components/Leaderboard'; 
import { PriestLeaderboard } from './components/PriestLeaderboard'; 
import { GraveEntry, ViewState, ProjectData, DeathCause, DeadRepoCandidate, SortOption, LLMSettings, LeaderboardEntry, PriestStats } from './types';
import { generateEulogy } from './services/geminiService';
import { getGraves, buryProject, getLeaderboard, getPriestStats, getGraveById } from './services/graveyardService';
import { getUndertakerProfile, syncAuthProfile } from './services/identityService'; 
import { LanguageProvider, useTranslation } from './i18n';
import { ExternalLink } from './components/ExternalLink';

// Inner App component that uses translation hook
const RepoGraveyardApp: React.FC = () => {
  const { t, language } = useTranslation();
  
  // Theme State
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  const [entries, setEntries] = useState<GraveEntry[]>([]);
  const [view, setView] = useState<ViewState>('HOME');
  const [selectedEntry, setSelectedEntry] = useState<GraveEntry | null>(null);
  const [scannerSelection, setScannerSelection] = useState<ProjectData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [sortBy, setSortBy] = useState<SortOption>('NEWEST');
  
  // Leaderboard Data (Lifted State)
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [isLeaderboardLoading, setIsLeaderboardLoading] = useState(true);
  
  // Priest Data (Lifted State)
  const [priestData, setPriestData] = useState<PriestStats[]>([]);

  // Settings & Identity
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIdentity, setShowIdentity] = useState(false); 
  const [lastIdentityUpdate, setLastIdentityUpdate] = useState(0); 
  
  // Infinite Scroll Ref
  const observerTarget = useRef<HTMLDivElement>(null);
  
  // LLM Settings State
  const [llmSettings, setLlmSettings] = useState<LLMSettings>({
      provider: 'OPENROUTER', // Default to OPENROUTER (Mistral) for free tier
      apiKey: ''
  });

  const PAGE_SIZE = 12;

  // Initialize Theme from LocalStorage
  useEffect(() => {
    const savedTheme = localStorage.getItem('graveyard_theme') as 'dark' | 'light';
    if (savedTheme) {
        setTheme(savedTheme);
    }
  }, []);

  // Apply Theme to Body
  useEffect(() => {
      if (theme === 'light') {
          document.body.classList.add('light-theme');
      } else {
          document.body.classList.remove('light-theme');
      }
      localStorage.setItem('graveyard_theme', theme);
  }, [theme]);

  const toggleTheme = () => {
      setTheme(prev => prev === 'dark' ? 'light' : 'dark');
  };

  // Load Settings & Deep Links
  useEffect(() => {
    // 1. Initialize Identity (Local)
    getUndertakerProfile();

    // 2. Check Auth (Async)
    syncAuthProfile().then((isLoggedIn) => {
        if (isLoggedIn) {
            if (window.location.hash && window.location.hash.includes('access_token')) {
                window.history.replaceState(null, '', window.location.pathname);
            }
            setLastIdentityUpdate(Date.now());
        }
    });

    // 3. Load LLM Settings
    const saved = localStorage.getItem('graveyard_llm_settings');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            if (parsed.provider === 'DEEPSEEK') {
                parsed.provider = 'OPENROUTER';
            }
            setLlmSettings(parsed);
        } catch (e) {
            console.error("Failed to parse settings", e);
        }
    }

    // 4. DEEP LINKING: Check for ?id=... (Must run before initial load)
    const params = new URLSearchParams(window.location.search);
    const graveId = params.get('id');
    if (graveId) {
        // Attempt to fetch specific grave BEFORE loading home list
        getGraveById(graveId).then(grave => {
            if (grave) {
                setSelectedEntry(grave);
                setView('DETAIL');
                console.log("Deep link: Loaded grave", grave.id, "set view to DETAIL");
            } else {
                console.warn("Deep link: Grave not found", graveId);
            }
        }).catch(err => {
            console.error("Deep link: Failed to load grave", err);
        });
    }

  }, []);

  const handleSaveSettings = (newSettings: LLMSettings) => {
      setLlmSettings(newSettings);
      localStorage.setItem('graveyard_llm_settings', JSON.stringify(newSettings));
  };

  const fetchStats = useCallback(async () => {
      try {
          if (leaderboardData.length === 0) setIsLeaderboardLoading(true);
          
          // Fetch both parallel
          const [lData, pData] = await Promise.all([
              getLeaderboard(),
              getPriestStats()
          ]);
          
          setLeaderboardData(lData);
          setPriestData(pData);
      } catch (e) {
          console.error("Failed to fetch stats", e);
      } finally {
          setIsLeaderboardLoading(false);
      }
  }, [leaderboardData.length]);

  // Initial Load and Sort Change (Skip if deep link detected)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const graveId = params.get('id');
    if (graveId) {
      // Don't load home list if deep link present - let deep link handle it
      console.log("Skipping initial load due to deep link");
      return;
    }
    loadGraves(0, sortBy, true);
    fetchStats();
  }, [sortBy]);

  // Infinite Scroll Observer
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoading && view === 'HOME') {
          handleLoadMore();
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the target is visible
    );

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => {
      if (observerTarget.current) {
        observer.unobserve(observerTarget.current);
      }
    };
  }, [hasMore, isLoadingMore, isLoading, view]);

  // Auto Refresh Logic
  useEffect(() => {
    if (!autoRefresh || view !== 'HOME') return;

    const interval = setInterval(() => {
       if (window.scrollY < 100) {
           console.log("Auto-summoning fresh souls...");
           getGraves(0, PAGE_SIZE, sortBy).then(data => {
             if (data && data.length > 0) {
                 setEntries(prev => {
                     if (prev.length > 0 && prev[0].id === data[0].id) return prev;
                     return data;
                 }); 
             }
           }).catch(err => console.error("Auto-refresh graves failed", err));
       }

       fetchStats();
    }, 30000);

    return () => clearInterval(interval);
  }, [autoRefresh, view, sortBy, fetchStats]);

  // Handle Load More
  const handleLoadMore = () => {
      const nextPage = page + 1;
      setPage(nextPage);
      loadGraves(nextPage, sortBy, false);
  };

  const loadGraves = async (pageNum: number, sort: SortOption, reset: boolean) => {
    if (reset) {
        setIsLoading(true);
        setEntries([]);
        setPage(0);
        setHasMore(true);
    } else {
        setIsLoadingMore(true);
    }

    try {
        const data = await getGraves(pageNum, PAGE_SIZE, sort);
        
        if (data.length < PAGE_SIZE) {
            setHasMore(false);
        }

        setEntries(prev => reset ? data : [...prev, ...data]);
    } catch (e) {
        console.error("Failed to load graveyard", e);
    } finally {
        setIsLoading(false);
        setIsLoadingMore(false);
    }
  };

  const handlePayRespect = (id: string) => {
    const targetEntry = entries.find(e => e.id === id);
    if (!targetEntry) return;

    const updatedCount = targetEntry.respectsPaid + 1;

    const newEntries = entries.map(e => 
      e.id === id ? { ...e, respectsPaid: updatedCount } : e
    );
    setEntries(newEntries);
    
    if (selectedEntry && selectedEntry.id === id) {
      setSelectedEntry({ ...selectedEntry, respectsPaid: updatedCount });
    }
  };

  const handlePayRespectFromKin = (id: string) => {
      handlePayRespect(id);
  };

  const handleBury = async (data: ProjectData, cause: DeathCause, epitaph: string) => {
    // Check key only if provider is NOT OpenRouter
    if (!llmSettings.apiKey && llmSettings.provider !== 'OPENROUTER') {
        alert(t('form.error.no_key'));
        setShowSettings(true);
        return;
    }

    setIsProcessing(true);
    
    try {
      const eulogy = await generateEulogy(
        data.name, 
        data.description, 
        data.language, 
        cause,
        language,
        llmSettings, 
        epitaph
      );

      const undertaker = getUndertakerProfile();

      // Pass the provider AND the user handle (name) to save stats
      const newEntry = await buryProject(
          data, 
          cause, 
          eulogy, 
          epitaph, 
          undertaker.id, 
          llmSettings.provider,
          undertaker.handle // Pass handle
      );

      setEntries([newEntry, ...entries]);

      // IMPORTANT: Refresh Leaderboards immediately after burial
      fetchStats();

      setSelectedEntry(newEntry);
      setScannerSelection(null); 
      setView('DETAIL');
    } catch (error: any) {
      console.error("Burial failed:", error);
      alert(error.message || "Something went wrong during the funeral service.");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanSelect = (repo: DeadRepoCandidate) => {
    setScannerSelection(repo);
    setView('BURY_FORM');
  };

  const handleVisitExisting = (id: string) => {
    const entry = entries.find(e => e.id === id);
    if (entry) {
        setSelectedEntry(entry);
        setView('DETAIL');
        setScannerSelection(null);
    } else {
        // Fallback if not loaded in list yet
        getGraveById(id).then(grave => {
            if (grave) {
                setSelectedEntry(grave);
                setView('DETAIL');
                setScannerSelection(null);
            }
        });
    }
  }

  const totalRespects = entries.reduce((acc, curr) => acc + curr.respectsPaid, 0);

  return (
    <div className="min-h-screen flex flex-col bg-graveyard-dark text-graveyard-text selection:bg-yellow-900 selection:text-white pb-20 transition-colors duration-300">
      <Header 
        onHome={() => { setView('HOME'); setSelectedEntry(null); setScannerSelection(null); }} 
        onConnect={() => setView('SCANNER')}
        onKin={() => setView('FIND_KIN')}
        onLeaderboard={() => setView('LEADERBOARD')}
        onSettings={() => setShowSettings(true)}
        onEditIdentity={() => setShowIdentity(true)} 
        totalRespects={totalRespects}
        totalBuried={entries.length} 
        lastIdentityUpdate={lastIdentityUpdate}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <SettingsModal 
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        autoRefresh={autoRefresh}
        onToggleAutoRefresh={() => setAutoRefresh(!autoRefresh)}
        llmSettings={llmSettings}
        onSaveLLMSettings={handleSaveSettings}
      />

      <IdentityModal 
         isOpen={showIdentity}
         onClose={() => setShowIdentity(false)}
         onUpdate={() => setLastIdentityUpdate(Date.now())}
      />

      {/* Main Layout Container */}
      <main className="flex-1 max-w-[1920px] mx-auto w-full pt-8 relative px-4 md:px-8 flex flex-col lg:flex-row gap-8">
        
        {/* LEFT/CENTER COLUMN: Main Content */}
        <div className="flex-1 min-w-0"> {/* min-w-0 ensures flex child truncates text correctly */}
            
            {/* FAB for burial (Home Only) */}
            {view === 'HOME' && (
            <div className="mb-12 text-center">
                <button
                onClick={() => { setScannerSelection(null); setView('BURY_FORM'); }}
                className="group relative inline-flex items-center justify-center p-0.5 mb-2 mr-2 overflow-hidden text-sm font-medium rounded-lg group bg-gradient-to-br from-red-900 to-black group-hover:from-red-600 group-hover:to-red-900 hover:text-white focus:ring-4 focus:outline-none focus:ring-red-800"
                >
                <span className="relative px-8 py-4 transition-all ease-in duration-75 bg-graveyard-dark text-white rounded-md group-hover:bg-opacity-0 font-pixel text-lg border border-red-900 uppercase">
                    {t('home.cta_bury')}
                </span>
                </button>
                <p className="text-xs font-mono mt-2 animate-pulse text-graveyard-text">
                {t('home.cta_sub')}
                </p>
            </div>
            )}

            {/* Dynamic View Content */}
            <div className="min-h-[400px]">
            {view === 'HOME' && (
                <>
                    {/* Sorting Controls */}
                    <div className="flex justify-center gap-4 mb-8 px-4 flex-wrap">
                        <button 
                            onClick={() => setSortBy('NEWEST')}
                            className={`font-pixel text-xs px-3 py-2 border-2 transition-all ${sortBy === 'NEWEST' ? 'bg-graveyard-stone text-graveyard-highlight border-graveyard-highlight' : 'border-graveyard-accent text-graveyard-text hover:text-graveyard-highlight'}`}
                        >
                            {t('sort.newest')}
                        </button>
                        <button 
                            onClick={() => setSortBy('STARS')}
                            className={`font-pixel text-xs px-3 py-2 border-2 transition-all ${sortBy === 'STARS' ? 'bg-yellow-600 text-black border-yellow-600' : 'border-graveyard-accent text-graveyard-text hover:text-yellow-500 hover:border-yellow-500'}`}
                        >
                            {t('sort.stars')}
                        </button>
                        <button 
                            onClick={() => setSortBy('RESPECTS')}
                            className={`font-pixel text-xs px-3 py-2 border-2 transition-all ${sortBy === 'RESPECTS' ? 'bg-red-800 text-white border-red-800' : 'border-graveyard-accent text-graveyard-text hover:text-red-400 hover:border-red-400'}`}
                        >
                            {t('sort.respects')}
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="text-center py-20 font-pixel text-graveyard-text animate-pulse">
                            Summoning souls...
                        </div>
                    ) : (
                        <>
                            {autoRefresh && page === 0 && (
                                <div className="text-center mb-4">
                                    <span className="inline-block w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></span>
                                    <span className="text-xs font-mono text-green-700">Auto Séance Active</span>
                                </div>
                            )}
                            <GraveyardList 
                                entries={entries} 
                                onPayRespect={handlePayRespect}
                                onOpenDetail={(entry) => {
                                    setSelectedEntry(entry);
                                    setView('DETAIL');
                                }}
                            />
                            
                            {/* Infinite Scroll Trigger & Loading State */}
                            <div ref={observerTarget} className="mt-12 text-center pb-8 h-20 flex items-center justify-center">
                                {isLoadingMore ? (
                                    <span className="font-pixel text-xs animate-pulse text-graveyard-highlight flex items-center gap-2">
                                        <span className="text-xl">🕯️</span> Summoning more souls...
                                    </span>
                                ) : !hasMore && entries.length > 0 ? (
                                    <span className="font-mono text-sm text-graveyard-text opacity-50">
                                        —— {t('list.no_more')} ——
                                    </span>
                                ) : null}
                            </div>
                        </>
                    )}
                </>
            )}

            {view === 'SCANNER' && (
                <GhostScanner onSelectRepo={handleScanSelect} />
            )}

            {view === 'FIND_KIN' && (
                <KinSearch 
                    onPayRespect={handlePayRespectFromKin}
                    onOpenDetail={(entry) => {
                        setSelectedEntry(entry);
                        setView('DETAIL');
                    }}
                />
            )}

            {view === 'LEADERBOARD' && (
                <div className="grid md:grid-cols-2 gap-8 items-start">
                    <div>
                        <Leaderboard externalData={leaderboardData} isLoading={isLeaderboardLoading} />
                    </div>
                    <div className="sticky top-24">
                        <PriestLeaderboard externalData={priestData} />
                    </div>
                </div>
            )}

            {view === 'BURY_FORM' && (
                <BurialForm 
                    onBury={handleBury} 
                    isLoading={isProcessing} 
                    initialData={scannerSelection}
                    onVisitExisting={handleVisitExisting}
                    currentProvider={llmSettings.provider}
                />
            )}

            {view === 'DETAIL' && selectedEntry && (
                <div className="animate-fade-in-up">
                    <button 
                        onClick={() => setView('HOME')}
                        className="mb-6 font-mono text-sm hover:text-graveyard-highlight block mx-auto md:mx-0 text-graveyard-text"
                    >
                        {t('detail.back')}
                    </button>
                    <Tombstone 
                        entry={selectedEntry} 
                        onPayRespect={handlePayRespect} 
                        isDetail={true}
                    />
                </div>
            )}
            </div>
        </div>

        {/* RIGHT COLUMN: Sidebar (Desktop Only) */}
        <aside className="hidden lg:flex flex-col w-72 shrink-0 sticky top-24 h-[calc(100vh-8rem)] gap-4 overflow-y-auto">
             <div className="bg-graveyard-stone border border-graveyard-accent p-1 shrink-0">
                 <h3 className="font-pixel text-xs text-center text-graveyard-text p-2 bg-black/10 dark:bg-black/50 mb-1">LIVE FEED</h3>
                 <Leaderboard 
                    externalData={leaderboardData} 
                    isLoading={isLeaderboardLoading} 
                    variant="SIDEBAR" 
                />
             </div>

             <div className="bg-graveyard-stone border border-purple-900/50 p-1 shrink-0">
                 <PriestLeaderboard externalData={priestData} />
             </div>
             
             <div className="mt-auto p-4 border border-graveyard-accent/30 rounded text-center shrink-0">
                 <p className="font-pixel text-[10px] text-graveyard-accent mb-2">{t('ad.sponsored')}</p>
                 <ExternalLink 
                   href="https://github.com/youyouhe/novelflow.git" 
                   className="font-mono text-xs text-yellow-600 hover:text-yellow-400 underline decoration-yellow-600/50 hover:decoration-yellow-400 transition-colors block"
                 >
                   NovelFlow
                 </ExternalLink>
                 <p className="font-mono text-[10px] text-graveyard-text mt-1">{t('ad.desc')}</p>

                 <div className="mt-4 pt-4 border-t border-graveyard-accent/30 flex flex-col gap-2">
                    <p className="font-pixel text-[10px] text-graveyard-text uppercase">Built By Tom He</p>
                    <div className="flex justify-center gap-3 text-xs font-mono">
                        <ExternalLink href="https://github.com/youyouhe/" className="text-graveyard-accent hover:text-graveyard-highlight transition-colors">GitHub</ExternalLink>
                        <span className="text-graveyard-accent/50">|</span>
                        <ExternalLink href="https://x.com/ChimpanzeeHe" className="text-graveyard-accent hover:text-graveyard-highlight transition-colors">X</ExternalLink>
                    </div>
                </div>
             </div>
        </aside>

      </main>

      <Footer />
    </div>
  );
};

const App: React.FC = () => {
  return (
    <LanguageProvider>
      <RepoGraveyardApp />
    </LanguageProvider>
  )
}

export default App;
