import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import { 
  Building, 
  User, 
  Mail, 
  Phone, 
  Globe, 
  CheckCircle2, 
  ArrowLeft,
  Loader2,
  ShieldCheck
} from 'lucide-react'
import { api, getApiErrorMessage } from '../api/client'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'

export default function RegisterGymPage() {
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    owner_name: '',
    owner_email: '',
    phone: '',
    subdomain: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      await api.post('/api/public/register-gym/', formData)
      setSuccess(true)
    } catch (err) {
      setError(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    if (name === 'subdomain') {
      setFormData(prev => ({ ...prev, [name]: value.toLowerCase().replace(/[^a-z0-9-]/g, '') }))
    } else {
      setFormData(prev => ({ ...prev, [name]: value }))
    }
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        {/* Ambient Background */}
        <div className="absolute top-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-red/20 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-brand-orange/10 blur-[120px] rounded-full animate-pulse" />
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative z-10 w-full max-w-md"
        >
          <Card isShimmer className="p-12 text-center border-emerald-500/30 bg-emerald-500/[0.02]">
            <div className="h-20 w-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/40">
              <CheckCircle2 className="h-10 w-10 text-white" />
            </div>
            <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter mb-4">Registration Received</h2>
            <p className="text-slate-400 text-sm font-medium leading-relaxed mb-10">
              Your request has been received. Access will be enabled after approval.
            </p>
            <Link to="/" className="w-full block">
              <Button 
                className="w-full h-14 btn-premium-gradient text-white font-black uppercase tracking-widest italic"
              >
                Return to HQ
              </Button>
            </Link>
          </Card>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Premium Backdrop */}
      <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-brand-red/50 to-transparent" />
      <div className="absolute top-1/3 -left-1/4 w-1/2 h-1/2 bg-brand-red/10 blur-[160px] rounded-full" />
      <div className="absolute bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-brand-orange/5 blur-[160px] rounded-full" />
      
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Brand Header */}
        <div className="flex flex-col items-center mb-12">
          <div className="flex items-center gap-3 mb-6">
            <span className="text-2xl font-black text-white tracking-tighter italic uppercase">ForYou <span className="text-brand-red">Gym SaaS</span></span>
          </div>
          <h1 className="text-5xl font-black text-white uppercase italic tracking-tighter text-center">Start Your Gym</h1>
          <p className="text-slate-500 text-xs font-black uppercase tracking-[0.4em] mt-4">Authorized Access Only</p>
        </div>

        <Card isShimmer className="p-10 border-white/5 bg-white/[0.01]">
          <form onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Gym Details */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Gym Name</label>
                  <div className="relative group">
                    <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-brand-red transition-colors" />
                    <input
                      required
                      name="name"
                      value={formData.name}
                      onChange={handleChange}
                      placeholder="e.g. Iron Paradise"
                      className="w-full h-14 bg-black border border-white/5 rounded-2xl pl-12 pr-6 text-white placeholder-slate-700 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Desired URL</label>
                  <div className="relative group">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-brand-red transition-colors" />
                    <input
                      required
                      name="subdomain"
                      value={formData.subdomain}
                      onChange={handleChange}
                      placeholder="subdomain"
                      className="w-full h-14 bg-black border border-white/5 rounded-2xl pl-12 pr-32 text-white placeholder-slate-700 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20 transition-all font-bold font-mono text-sm"
                    />
                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black text-slate-700 uppercase">.gym.saas</div>
                  </div>
                </div>
              </div>

              {/* Owner Details */}
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Owner Full Name</label>
                  <div className="relative group">
                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-brand-red transition-colors" />
                    <input
                      required
                      name="owner_name"
                      value={formData.owner_name}
                      onChange={handleChange}
                      placeholder="Full Name"
                      className="w-full h-14 bg-black border border-white/5 rounded-2xl pl-12 pr-6 text-white placeholder-slate-700 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20 transition-all font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Work Email</label>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-brand-red transition-colors" />
                    <input
                      required
                      type="email"
                      name="owner_email"
                      value={formData.owner_email}
                      onChange={handleChange}
                      placeholder="email@example.com"
                      className="w-full h-14 bg-black border border-white/5 rounded-2xl pl-12 pr-6 text-white placeholder-slate-700 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20 transition-all font-bold"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black uppercase text-slate-600 tracking-widest ml-1">Phone Number</label>
               <div className="relative group">
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500 group-focus-within:text-brand-red transition-colors" />
                  <input
                    required
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="+1 (555) 000-0000"
                    className="w-full h-14 bg-black border border-white/5 rounded-2xl pl-12 pr-6 text-white placeholder-slate-700 focus:outline-none focus:border-brand-red/50 focus:ring-1 focus:ring-brand-red/20 transition-all font-bold"
                  />
               </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-brand-red/10 border border-brand-red/20 rounded-2xl p-4 flex items-center gap-3"
              >
                <div className="h-2 w-2 rounded-full bg-brand-red animate-pulse" />
                <span className="text-xs font-black text-brand-red uppercase tracking-tight">{error}</span>
              </motion.div>
            )}

            <div className="pt-4 flex flex-col gap-6">
               <Button 
                type="submit" 
                isLoading={loading}
                className="w-full h-16 btn-premium-gradient text-white text-lg font-black uppercase tracking-widest italic"
               >
                 {loading ? <Loader2 className="animate-spin h-6 w-6" /> : "Submit Registration"}
               </Button>
               
               <Link to="/" className="flex items-center justify-center gap-2 text-slate-700 hover:text-white transition-colors text-[10px] font-black uppercase tracking-[0.2em] group">
                  <ArrowLeft className="h-3 w-3 group-hover:-translate-x-1 transition-transform" />
                  Back to HQ
               </Link>
            </div>
          </form>
        </Card>
      </motion.div>
    </div>
  )
}
