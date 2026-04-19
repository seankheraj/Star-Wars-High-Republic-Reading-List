/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useMemo } from 'react';
import { HIGH_REPUBLIC_DATA } from './data';
import { Book, Phase, Format, SyncStatus } from './types';
import { 
  Check, 
  Search, 
  Filter, 
  RefreshCcw, 
  BookOpen, 
  Layers, 
  ChevronRight,
  ExternalLink,
  Github,
  Moon,
  Sun,
  Palette,
  Menu,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const STORAGE_KEY = 'high-republic-reading-list';
const SCRIPT_URL = import.meta.env.VITE_GOOGLE_SCRIPT_URL || '';

export default function App() {
  const [books, setBooks] = useState<Book[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : HIGH_REPUBLIC_DATA;
  });

  const [search, setSearch] = useState('');
  const [filterPhase, setFilterPhase] = useState<Phase | 'All'>('All');
  const [filterFormat, setFilterFormat] = useState<Format | 'All'>('All');
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ lastSync: null, status: 'idle' });
  const [isAutoSyncing, setIsAutoSyncing] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchFromSheet = async (isManual = false) => {
    if (!SCRIPT_URL || !SCRIPT_URL.includes('script.google.com')) {
      if (isManual) {
        setSyncStatus({ 
          lastSync: new Date(), 
          status: 'error', 
          message: 'Cloud URL not configured' 
        });
      }
      return;
    }

    setSyncStatus(prev => ({ 
      ...prev, 
      status: 'syncing', 
      message: isManual ? 'Fetching latest records...' : 'Syncing with cloud...' 
    }));

    try {
      const response = await fetch(SCRIPT_URL);
      if (!response.ok) throw new Error('Cloud unreachable');
      
      const sheetData = await response.json();
      
      if (Array.isArray(sheetData)) {
        setBooks(currentBooks => {
          const updated = currentBooks.map(book => {
            const match = sheetData.find(s => 
              s.title?.toString().trim().toLowerCase() === book.title.trim().toLowerCase()
            );
            if (match) {
              const isRead = match.read === true || 
                            match.read === 'TRUE' || 
                            match.read === 'true' || 
                            match.read === 1;
              return { ...book, read: isRead };
            }
            return book;
          });
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
          return updated;
        });

        setSyncStatus({ 
          lastSync: new Date(), 
          status: 'success', 
          message: isManual ? 'Records Refreshed' : 'Records Synchronized' 
        });
      }
    } catch (error) {
      console.error('Fetch error:', error);
      setSyncStatus({ 
        lastSync: new Date(), 
        status: 'error', 
        message: 'Cloud Fetch Failed' 
      });
    }
  };

  // Sync with Cloud on startup
  useEffect(() => {
    fetchFromSheet();
  }, []);

  // Persist local changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
  }, [books]);

  const handleSync = async (dataToSync: Book[]) => {
    if (!SCRIPT_URL) {
      setSyncStatus({ 
        lastSync: new Date(), 
        status: 'error', 
        message: 'Google Script URL not found in Settings > Secrets' 
      });
      return;
    }

    // Basic validation to ensure it's a script.google.com URL
    if (!SCRIPT_URL.includes('script.google.com')) {
      setSyncStatus({ 
        lastSync: new Date(), 
        status: 'error', 
        message: 'Invalid URL. Make sure it is the WEB APP URL from Deployment.' 
      });
      return;
    }

    setSyncStatus(prev => ({ ...prev, status: 'syncing' }));
    setIsAutoSyncing(true);

    try {
      // We send simple JSON strings as text/plain to bypass CORS/Preflight issues with Google Script
      const payload = JSON.stringify(dataToSync.map(b => ({ title: b.title, read: b.read })));
      
      await fetch(SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'text/plain' },
        body: payload
      });

      setSyncStatus({ 
        lastSync: new Date(), 
        status: 'success', 
        message: 'Cloud Records Updated' 
      });
    } catch (error) {
      setSyncStatus({ 
        lastSync: new Date(), 
        status: 'error', 
        message: 'Cloud Sync Failed' 
      });
      console.error('Sync error:', error);
    } finally {
      setTimeout(() => setIsAutoSyncing(false), 2000);
    }
  };

  const toggleRead = (id: string) => {
    const updatedBooks = books.map(book => 
      book.id === id ? { ...book, read: !book.read } : book
    );
    setBooks(updatedBooks);
    handleSync(updatedBooks); // Trigger auto-sync
  };

  const filteredBooks = useMemo(() => {
    return books.filter(book => {
      const matchesSearch = book.title.toLowerCase().includes(search.toLowerCase());
      const matchesPhase = filterPhase === 'All' || book.phase === filterPhase;
      const matchesFormat = filterFormat === 'All' || book.format === filterFormat;
      return matchesSearch && matchesPhase && matchesFormat;
    });
  }, [books, search, filterPhase, filterFormat]);

  const stats = useMemo(() => {
    const total = books.length;
    const read = books.filter(b => b.read).length;
    const percentage = total > 0 ? Math.round((read / total) * 100) : 0;
    
    const phaseStats = (['Phase 1', 'Phase 2', 'Phase 3'] as Phase[]).map(p => {
      const pBooks = books.filter(b => b.phase === p);
      const pRead = pBooks.filter(b => b.read).length;
      return {
        phase: p,
        total: pBooks.length,
        read: pRead,
        percentage: pBooks.length > 0 ? Math.round((pRead / pBooks.length) * 100) : 0
      };
    });

    return { total, read, percentage, phaseStats };
  }, [books]);

  const nextToRead = useMemo(() => {
    return books.find(b => !b.read);
  }, [books]);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-paper text-ink">
      {/* Header */}
      <header className="px-6 sm:px-10 lg:px-16 pt-10 pb-6 border-b border-line flex justify-between items-end shrink-0 relative z-40 bg-paper">
        <div className="brand flex items-center gap-4">
          <button 
            onClick={() => setIsSidebarOpen(true)}
            className="lg:hidden p-2 -ml-2 text-ink hover:text-accent transition-colors"
            aria-label="Open Menu"
          >
            <Menu size={24} />
          </button>
          <div>
            <span className="text-[10px] sm:text-[11px] font-bold tracking-[0.4em] text-accent uppercase block mb-2 leading-none">
              Star Wars
            </span>
            <h1 className="font-serif text-3xl sm:text-6xl font-black uppercase tracking-tighter leading-[0.8]">
              The High Republic
            </h1>
          </div>
        </div>
        
        <div className="hidden sm:flex items-center gap-6 text-right">
          <div className="relative w-16 h-16 flex items-center justify-center shrink-0">
            {/* Outer decorative ring (Star Wars Style) */}
            <svg className="absolute inset-0 w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
              {/* Subtle background track */}
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="currentColor"
                strokeWidth="0.5"
                className="text-line"
              />
              {/* Detailed Inner Ticks */}
              {[...Array(12)].map((_, i) => (
                <line
                  key={i}
                  x1="50"
                  y1="10"
                  x2="50"
                  y2="14"
                  stroke="currentColor"
                  strokeWidth="1"
                  className="text-line"
                  transform={`rotate(${i * 30} 50 50)`}
                />
              ))}
              {/* Progress Circle */}
              <motion.circle
                cx="50"
                cy="50"
                r="40"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                className="text-accent"
                initial={{ strokeDasharray: "0 251" }}
                animate={{ strokeDasharray: `${(stats.percentage / 100) * 251} 251` }}
                transition={{ duration: 1.5, ease: "easeOut" }}
              />
            </svg>
            <span className="font-serif italic text-sm font-bold text-ink relative z-10">
              {stats.percentage}%
            </span>
          </div>

          <div className="flex flex-col items-end whitespace-nowrap">
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-1 leading-none">
              Master Progress
            </div>
            <div className="font-serif italic text-3xl sm:text-4xl font-normal leading-none text-ink">
              {stats.read} / {stats.total}
            </div>
            <div className="text-[10px] font-bold uppercase tracking-widest text-muted mt-1 leading-none">
              Items Logged
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar Backdrop (Mobile) */}
        <AnimatePresence>
          {isSidebarOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-ink/20 backdrop-blur-sm z-40 lg:hidden"
            />
          )}
        </AnimatePresence>

        {/* Sidebar */}
        <motion.aside 
          initial={false}
          animate={{ x: isSidebarOpen ? 0 : (typeof window !== 'undefined' && window.innerWidth < 1024 ? -320 : 0) }}
          className={`fixed inset-y-0 left-0 z-50 w-80 px-10 py-10 border-r border-line flex-col gap-10 shrink-0 overflow-y-auto bg-paper lg:static lg:flex lg:translate-x-0 transition-none`}
        >
          {/* Mobile Close Button */}
          <div className="lg:hidden flex justify-between items-center mb-4 border-b border-line pb-4">
            <span className="text-[10px] font-bold uppercase tracking-widest text-muted">Navigation</span>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="p-2 -mr-2 text-ink"
            >
              <X size={20} />
            </button>
          </div>

          {/* Now Reading / Next Up */}
          <section>
             <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-3">
              Now Reading
            </div>
            {nextToRead ? (
              <div className="bg-white border border-line p-6 featured-accent">
                <div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-accent mb-2">
                    {nextToRead.phase} • {nextToRead.format}
                  </div>
                  <a 
                    href={`https://www.google.com/search?q=site:starwars.fandom.com+${encodeURIComponent(`"${nextToRead.title}" High Republic`)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group/link block mb-4"
                  >
                    <h2 className="font-serif text-xl font-bold leading-tight group-hover/link:text-accent transition-colors flex items-start gap-2">
                      {nextToRead.title}
                      <ExternalLink size={12} className="opacity-0 group-hover/link:opacity-100 transition-opacity mt-1 shrink-0" />
                    </h2>
                  </a>
                  <button 
                    onClick={() => toggleRead(nextToRead.id)}
                    className="bg-ink text-white w-full py-3 text-[10px] font-bold uppercase tracking-widest hover:bg-accent transition-colors cursor-pointer"
                  >
                    Mark Finished
                  </button>
                </div>
              </div>
            ) : (
              <div className="bg-white border border-line p-6 italic text-sm text-muted">
                All known records complete. For light and life.
              </div>
            )}
          </section>

          {/* Navigation / Progress */}
          <nav className="flex flex-col gap-2">
             <div className="text-[10px] font-bold uppercase tracking-widest text-muted mb-2 border-b border-line pb-1">
              Phases
            </div>
            <ul className="space-y-1">
              {(['All', 'Phase 1', 'Phase 2', 'Phase 3'] as const).map((p) => (
                <li 
                  key={p} 
                  onClick={() => {
                    setFilterPhase(p as any);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={`flex justify-between items-center py-2 text-[11px] uppercase tracking-widest cursor-pointer border-b transition-all ${
                    filterPhase === p ? 'text-ink font-bold border-ink' : 'text-muted border-line hover:text-ink'
                  }`}
                >
                  <span>{p}</span>
                  {p !== 'All' && (
                    <span className="font-serif italic capitalize tracking-normal text-xs opacity-60">
                      {stats.phaseStats.find(s => s.phase === p)?.percentage}%
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </nav>

          {/* Sync Buttons */}
          <div className="mt-auto space-y-2">
            <AnimatePresence>
              {isAutoSyncing && (
                <motion.div 
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-[9px] font-bold uppercase tracking-widest text-accent flex items-center gap-2 overflow-hidden"
                >
                  <RefreshCcw size={10} className="animate-spin" />
                  Updating Cloud...
                </motion.div>
              )}
            </AnimatePresence>
            
            <div className="grid grid-cols-2 gap-2">
              <button 
                onClick={() => {
                  fetchFromSheet(true);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`flex items-center justify-center gap-2 py-3 border border-line text-[9px] font-bold uppercase tracking-widest transition-all hover:bg-line hover:text-ink`}
              >
                <BookOpen size={12} />
                Pull
              </button>
              <button 
                onClick={() => {
                  handleSync(books);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`flex items-center justify-center gap-2 py-3 border border-ink text-[9px] font-bold uppercase tracking-widest transition-all ${
                  syncStatus.status === 'syncing' ? 'opacity-50 cursor-not-allowed' : 'hover:bg-ink hover:text-white'
                }`}
              >
                <RefreshCcw size={12} className={syncStatus.status === 'syncing' ? 'animate-spin' : ''} />
                Push
              </button>
            </div>
            
            <p className="text-[8px] text-muted text-center uppercase tracking-tighter">
              Manual Sync: Pull (latest from sheet) or Push (save app progress)
            </p>
          </div>
        </motion.aside>

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto px-10 lg:px-16 py-10">
          {/* Sync Status Overlay */}
          <AnimatePresence>
            {syncStatus.message && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`mb-10 p-4 border text-[11px] font-bold uppercase tracking-widest flex items-center justify-between ${
                  syncStatus.status === 'error' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-green-50 text-green-700 border-green-200'
                }`}
              >
                <span>{syncStatus.message}</span>
                <button onClick={() => setSyncStatus(prev => ({ ...prev, message: '' }))}>[ Close ]</button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-6 mb-10 pb-6 border-b border-line">
            <div className="relative flex-1">
              <Search className="absolute left-0 top-1/2 -translate-y-1/2 text-muted" size={16} />
              <input 
                type="text" 
                placeholder="SEARCH RECORDS..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-6 pr-4 py-2 border-b border-muted/20 focus:border-ink focus:outline-none transition-all text-[11px] font-bold uppercase tracking-widest bg-transparent"
              />
            </div>
            <div className="flex gap-4 items-center">
              <select 
                value={filterFormat}
                onChange={(e) => setFilterFormat(e.target.value as any)}
                className="bg-transparent text-[11px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer text-muted hover:text-ink transition-colors pb-2 border-b border-muted/20 focus:border-ink"
              >
                <option value="All">All Formats</option>
                {Array.from(new Set(HIGH_REPUBLIC_DATA.map(b => b.format))).sort().map(f => (
                  <option key={f} value={f}>{f}</option>
                ))}
              </select>
              
              <div className="sm:hidden">
                <select 
                  value={filterPhase}
                  onChange={(e) => setFilterPhase(e.target.value as any)}
                  className="bg-transparent text-[11px] font-bold uppercase tracking-widest focus:outline-none cursor-pointer text-muted"
                >
                  <option value="All">All Phases</option>
                  <option value="Phase 1">Phase 1</option>
                  <option value="Phase 2">Phase 2</option>
                  <option value="Phase 3">Phase 3</option>
                </select>
              </div>
            </div>
          </div>

          {/* List Header */}
          <div className="grid grid-cols-[40px_1fr_120px_100px] mb-4 pb-3 editorial-header-line text-[10px] font-black uppercase tracking-[0.2em] text-muted">
            <div></div>
            <div>Title & Description</div>
            <div className="hidden sm:block">Format</div>
            <div className="hidden sm:block">Phase</div>
          </div>

          {/* List Rows */}
          <div className="flex flex-col">
            <AnimatePresence mode='popLayout'>
              {filteredBooks.map((book) => (
                <motion.div 
                  layout
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  key={book.id}
                  className={`grid grid-cols-[40px_1fr_120px_100px] py-4 border-b border-line items-center group transition-opacity ${book.read ? 'opacity-40 line-through' : 'opacity-100 hover:bg-ink/5'}`}
                >
                  <div className="flex justify-center">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleRead(book.id);
                      }}
                      className={`custom-checkbox-square ${book.read ? 'checked' : ''}`}
                    >
                      {book.read && <Check size={12} className="text-white" strokeWidth={3} />}
                    </button>
                  </div>
                  
                  <div className="pr-4">
                    <a 
                      href={`https://www.google.com/search?q=site:starwars.fandom.com+${encodeURIComponent(`"${book.title}" High Republic`)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block"
                    >
                      <h3 className="font-serif text-[1.1rem] font-semibold leading-tight text-ink hover:text-accent transition-colors flex items-center gap-2">
                        {book.title}
                        <ExternalLink size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                      </h3>
                    </a>
                    <div className="sm:hidden flex gap-2 mt-1">
                      <span className="text-[9px] font-bold text-accent uppercase tracking-wider">{book.phase}</span>
                      <span className="text-[9px] font-medium text-muted uppercase tracking-wider">{book.format}</span>
                    </div>
                  </div>

                  <div className="hidden sm:block text-[11px] font-medium text-muted uppercase tracking-wider">
                    {book.format}
                  </div>

                  <div className="hidden sm:block text-[10px] font-black text-accent uppercase tracking-[0.1em]">
                    {book.phase}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredBooks.length === 0 && (
              <div className="py-20 text-center border-b border-line">
                <p className="font-serif italic text-lg text-muted">No records match your current search parameters.</p>
                <button 
                  onClick={() => { setSearch(''); setFilterPhase('All'); setFilterFormat('All'); }}
                  className="mt-4 text-[10px] font-black uppercase tracking-widest text-accent hover:underline"
                >
                  [ Clear Filter ]
                </button>
              </div>
            )}
          </div>
          
          <footer className="mt-20 pt-10 border-t border-line flex flex-col sm:flex-row justify-between items-center gap-6 opacity-60">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
              Published by S. Kheraj (2026)
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
