import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import { Search, User, Dumbbell, Users, Loader2, X } from 'lucide-react'

type SearchResult = {
  id: string
  name: string
  type: 'member' | 'gym' | 'user'
  subdomain?: string
  role?: string
}

export default function GlobalSearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<{ members: SearchResult[], gyms: SearchResult[], users: SearchResult[] } | null>(null)
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (query.length < 2) {
      setResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res = await api.get(`/api/search/?q=${encodeURIComponent(query)}`)
        setResults(res.data)
        setIsOpen(true)
      } catch (err) {
        console.error('Search error:', err)
      } finally {
        setLoading(false)
      }
    }, 400)

    return () => clearTimeout(timer)
  }, [query])

  const handleSelect = (item: SearchResult) => {
    setIsOpen(false)
    setQuery('')
    if (item.type === 'member') navigate(`/members/${item.id}`)
    else if (item.type === 'gym') navigate(`/gyms/${item.id}`)
    else if (item.type === 'user') navigate(`/users/${item.id}`)
  }

  const hasResults = results && (results.members.length > 0 || results.gyms.length > 0 || results.users.length > 0)

  return (
    <div className="relative w-full max-w-md hidden sm:block" ref={containerRef}>
      <div className="relative group">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 pointer-events-none group-focus-within:text-brand-500 transition-colors" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Smart search (ctrl + k)..."
          className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-500" />}
        {query && !loading && (
          <button onClick={() => setQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2">
            <X className="h-4 w-4 text-slate-400 hover:text-slate-600" />
          </button>
        )}
      </div>

      {isOpen && results && (
        <div className="absolute top-full left-0 right-0 mt-2 max-h-[400px] overflow-y-auto rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-2xl z-50 p-2 animate-in fade-in slide-in-from-top-2 duration-200">
          {!hasResults ? (
            <div className="p-8 text-center">
              <p className="text-sm font-medium text-slate-500 italic">No matches found for "{query}"</p>
            </div>
          ) : (
            <div className="space-y-4 p-2">
              {results.gyms.length > 0 && (
                <div>
                  <h4 className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Gym Hubs</h4>
                  {results.gyms.map(gym => (
                    <button key={gym.id} onClick={() => handleSelect(gym)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left group">
                      <div className="h-8 w-8 rounded-lg bg-brand-500/10 flex items-center justify-center text-brand-600">
                        <Dumbbell className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">{gym.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">{gym.subdomain}.localhost</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.members.length > 0 && (
                <div>
                  <h4 className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Gym Members</h4>
                  {results.members.map(m => (
                    <button key={m.id} onClick={() => handleSelect(m)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left group">
                      <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-blue-500 transition-colors">{m.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium">Digital Profile</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {results.users.length > 0 && (
                <div>
                  <h4 className="px-3 mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">Staff & Ops</h4>
                  {results.users.map(u => (
                    <button key={u.id} onClick={() => handleSelect(u)} className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-colors text-left group">
                      <div className="h-8 w-8 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-600">
                        <User className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-brand-500 transition-colors">{u.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium italic">{u.role?.toUpperCase()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
