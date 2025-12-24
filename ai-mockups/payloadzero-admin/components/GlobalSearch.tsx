import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Hash, FileText, ArrowRight, Settings } from 'lucide-react';
import { COLLECTIONS, MOCK_DATA } from '../constants';

interface GlobalSearchProps {
  isOpen: boolean;
  onClose: () => void;
}

const GlobalSearch: React.FC<GlobalSearchProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
        setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Search Logic
  const results: any[] = [];
  if (query.trim()) {
      COLLECTIONS.forEach(col => {
          const docs = MOCK_DATA[col.slug] || [];
          docs.forEach(doc => {
             const title = doc[col.admin.useAsTitle] || doc.id;
             // Naive search across all values
             const match = Object.values(doc).some(val => 
                String(val).toLowerCase().includes(query.toLowerCase())
             );
             
             if (match) {
                 results.push({
                     type: col.type,
                     collectionLabel: col.labels.singular,
                     title: title,
                     slug: col.slug,
                     id: doc.id,
                     link: col.type === 'global' ? `/globals/${col.slug}` : `/collections/${col.slug}/${doc.id}`
                 });
             }
          });
      });
  }

  const handleSelect = (link: string) => {
      navigate(link);
      onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal */}
      <div className="relative w-full max-w-2xl bg-white shadow-2xl rounded-xl overflow-hidden flex flex-col animate-in fade-in slide-in-from-top-4 duration-200">
        <div className="flex items-center px-4 py-4 border-b border-zinc-100">
            <Search className="text-zinc-400 w-5 h-5 mr-3" />
            <input 
                ref={inputRef}
                type="text" 
                placeholder="Search everywhere..." 
                className="flex-1 text-lg outline-none placeholder:text-zinc-300 text-zinc-800"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
            />
            <button onClick={onClose} className="text-xs bg-zinc-100 px-2 py-1 rounded text-zinc-500 font-bold">ESC</button>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2 bg-zinc-50/50">
            {query === '' && (
                <div className="p-8 text-center text-zinc-400">
                    <p className="text-sm">Type to search for appointments, customers, services, or settings.</p>
                </div>
            )}
            
            {query !== '' && results.length === 0 && (
                <div className="p-8 text-center text-zinc-400">
                    <p className="text-sm">No results found for "{query}".</p>
                </div>
            )}

            {results.length > 0 && (
                <div className="space-y-1">
                    {results.map((res, i) => (
                        <button 
                            key={i}
                            onClick={() => handleSelect(res.link)}
                            className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-primary-50 hover:text-primary-700 group transition-colors text-left"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded bg-white border border-zinc-200 flex items-center justify-center text-zinc-400 group-hover:border-primary-200 group-hover:text-primary-500">
                                    {res.type === 'global' ? <Settings size={14}/> : <FileText size={14}/>}
                                </div>
                                <div>
                                    <p className="font-semibold text-sm text-zinc-800 group-hover:text-primary-900">{res.title}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-[10px] uppercase font-bold text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded group-hover:bg-primary-100 group-hover:text-primary-600">
                                            {res.collectionLabel}
                                        </span>
                                        {res.type !== 'global' && <span className="text-[10px] text-zinc-400 font-mono">#{res.id}</span>}
                                    </div>
                                </div>
                            </div>
                            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 text-primary-400 -translate-x-2 group-hover:translate-x-0 transition-all" />
                        </button>
                    ))}
                </div>
            )}
        </div>
        
        <div className="bg-zinc-50 border-t border-zinc-200 p-2 text-[10px] text-zinc-400 flex justify-between px-4">
             <span>ProTip: Use arrow keys to navigate</span>
             <span>PayloadZero Admin</span>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
