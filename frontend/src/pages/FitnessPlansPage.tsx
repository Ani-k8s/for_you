import { useEffect, useState } from 'react'
import { api, getApiErrorMessage } from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import { Activity, Plus, Dumbbell, Utensils, ArrowRight } from 'lucide-react'

type WorkoutPlan = {
  id: string
  name: string
  description: string
  content: any
  created_at: string
}

type DietPlan = {
  id: string
  name: string
  description: string
  content: any
  created_at: string
}

export default function FitnessPlansPage() {
  const [workouts, setWorkouts] = useState<WorkoutPlan[]>([])
  const [diets, setDiets] = useState<DietPlan[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'workouts' | 'diets'>('workouts')

  useEffect(() => {
    fetchData()
  }, [])

  async function fetchData() {
    try {
      setLoading(true)
      const [wRes, dRes] = await Promise.all([
        api.get('/api/fitness/workout/'),
        api.get('/api/fitness/diet/')
      ])
      setWorkouts(wRes.data.results || [])
      setDiets(dRes.data.results || [])
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-8 animate-fadeInUp">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white tracking-tight italic uppercase tracking-tighter flex items-center gap-2">
            777c8 <span className="text-brand-500">Elite</span> Plans
          </h1>
          <p className="text-slate-500 text-sm font-medium">Manage and assign workout and nutrition plans to members.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className={`h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest ${view === 'workouts' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : ''}`} onClick={() => setView('workouts')}>
            Workout Plans
          </Button>
          <Button variant="outline" className={`h-11 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest ${view === 'diets' ? 'bg-brand-500/10 text-brand-400 border-brand-500/20' : ''}`} onClick={() => setView('diets')}>
            Nutrition Plans
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Create Card */}
        <Card className="h-full border-2 border-dashed border-slate-800 bg-white/[0.02] flex flex-col items-center justify-center p-12 group hover:border-brand-500/50 transition-all cursor-pointer">
          <div className="h-16 w-16 rounded-3xl bg-slate-900 flex items-center justify-center text-slate-500 group-hover:bg-brand-500 group-hover:text-white transition-all transform group-hover:scale-110 mb-4 shadow-xl">
             <Plus className="h-8 w-8" />
          </div>
          <p className="text-sm font-black text-slate-500 uppercase tracking-widest group-hover:text-brand-400">Add New Plan</p>
        </Card>

        {loading ? (
          Array.from({ length: 2 }).map((_, i) => (
             <Card key={i} className="h-64 bg-slate-900/40 animate-pulse">
                <div />
             </Card>
          ))
        ) : (
          (view === 'workouts' ? workouts : diets).map((plan) => (
            <Card key={plan.id} className="p-0 border-slate-800 bg-slate-900/40 backdrop-blur-xl shadow-2xl group transition-all hover:scale-[1.02]">
              <div className="p-6 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="h-12 w-12 rounded-2xl bg-white/[0.05] flex items-center justify-center text-brand-500 border border-white/5">
                    {view === 'workouts' ? <Dumbbell className="h-6 w-6" /> : <Utensils className="h-6 w-6" />}
                  </div>
                  <Badge intent="neutral">{plan.created_at.split('T')[0]}</Badge>
                </div>
                <div>
                   <h3 className="text-xl font-black text-white truncate">{plan.name}</h3>
                   <p className="text-sm text-slate-500 line-clamp-2 mt-1 leading-relaxed">{plan.description || 'No description provided'}</p>
                </div>
                <div className="pt-2 flex items-center justify-between border-t border-white/5">
                    <span className="text-[10px] font-black text-brand-500 uppercase tracking-widest">Plan Active</span>
                    <Button variant="outline" size="sm" className="h-8 w-8 p-0 min-w-0 rounded-lg group-hover:bg-brand-500 transition-colors">
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Profile/Assignment Section */}
      <Card className="p-8 border-none bg-gradient-to-br from-brand-600/10 to-blue-600/10 border border-brand-500/10 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Activity className="h-32 w-32" />
        </div>
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="max-w-md">
                <h2 className="text-2xl font-black text-white tracking-tight uppercase italic mb-2">Member Assignments</h2>
                <p className="text-sm text-slate-400 font-medium">Assign customized plans to members and track their fitness journey and body metrics.</p>
            </div>
            <Button variant="primary" className="h-12 px-8 font-black uppercase text-xs tracking-[0.2em] shadow-brand-500/20 shadow-lg gap-3">
                Bulk Assignment
                <ArrowRight className="h-4 w-4" />
            </Button>
        </div>
      </Card>
    </div>
  )
}
