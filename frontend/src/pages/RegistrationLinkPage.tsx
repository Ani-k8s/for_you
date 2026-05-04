import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, getApiErrorMessage } from '../api/client'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import { Building, Mail, Send, CheckCircle, ArrowRight } from 'lucide-react'

export default function RegistrationLinkPage() {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    name: '',
    subdomain: '',
    owner_email: '',
    message: ''
  })
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      await api.post('/api/gyms/requests/', formData)
      setSubmitted(true)
    } catch (err) {
      alert(getApiErrorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-12 text-center space-y-6 border-none shadow-2xl bg-slate-900/50 backdrop-blur-xl animate-fadeInUp">
          <div className="h-20 w-20 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-10 w-10 text-emerald-500" />
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight">Request Received!</h1>
          <p className="text-slate-400 font-medium leading-relaxed">
            Thank you for applying to join the ForYou Gym network. Our team will review your request and contact you at <span className="text-emerald-400">{formData.owner_email}</span> shortly.
          </p>
          <div className="pt-4">
            <Button variant="outline" className="w-full h-12" onClick={() => navigate('/')}>
              Back to Home
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 py-20 relative overflow-hidden">
      {/* Abstract Background Orbs */}
      <div className="absolute top-0 -left-20 w-96 h-96 bg-brand-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 -right-20 w-96 h-96 bg-blue-600/20 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative z-10">
        {/* Left Side: Branding/Info */}
        <div className="space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 bg-brand-500/10 text-brand-400 px-4 py-2 rounded-full text-xs font-black uppercase tracking-widest border border-brand-500/20">
              ForYou Gym Network
            </div>
            <h1 className="text-5xl lg:text-7xl font-black text-white leading-[1.1] tracking-tighter">
              Launch your <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-400 to-blue-500">premium gym</span> experience.
            </h1>
            <p className="text-xl text-slate-400 font-medium leading-relaxed max-w-lg">
              The all-in-one SaaS platform to manage members, billing, staff, and real-time engagement for modern fitness centers.
            </p>
          </div>

          <div className="space-y-6">
            <div className="flex items-start gap-4 group">
              <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-brand-500 group-hover:text-white transition-all border border-slate-800">
                <Building className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white">Full Multi-tenancy</h3>
                <p className="text-sm text-slate-500">Your own subdomain and private database isolation.</p>
              </div>
            </div>
            <div className="flex items-start gap-4 group">
              <div className="h-12 w-12 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-500 group-hover:bg-brand-500 group-hover:text-white transition-all border border-slate-800">
                <ArrowRight className="h-6 w-6" />
              </div>
              <div className="space-y-1">
                <h3 className="font-bold text-white">Automated Onboarding</h3>
                <p className="text-sm text-slate-500">Get approved and ready to launch in minutes.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form */}
        <Card className="p-10 border-none shadow-3xl bg-slate-900/40 backdrop-blur-2xl animate-fadeInUp">
          <div className="mb-8">
            <h2 className="text-2xl font-black text-white">Register Your Gym</h2>
            <p className="text-sm text-slate-500 mt-1">Fill out the details to request your gym dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Gym Name</label>
                <div className="relative">
                  <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input 
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-700"
                    placeholder="e.g. Iron Paradise"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Preferred Subdomain</label>
                <div className="relative group">
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-600 bg-slate-900 px-2 py-1 rounded">.foryougym.com</div>
                  <input 
                    className="w-full h-12 px-4 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-2 focus:ring-brand-500 transition-all font-mono text-sm"
                    placeholder="iron-paradise"
                    value={formData.subdomain}
                    onChange={(e) => setFormData({ ...formData, subdomain: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Owner Email</label>
                <div className="relative">
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-500" />
                  <input 
                    className="w-full h-12 pl-12 pr-4 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-2 focus:ring-brand-500 transition-all"
                    placeholder="owner@example.com"
                    type="email"
                    value={formData.owner_email}
                    onChange={(e) => setFormData({ ...formData, owner_email: e.target.value })}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest pl-1">Tell us more (Optional)</label>
                <textarea 
                  className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950/50 text-white focus:ring-2 focus:ring-brand-500 transition-all min-h-[100px] resize-none"
                  placeholder="Tell us about your gym location, member count, etc."
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                />
              </div>
            </div>

            <Button variant="primary" size="lg" className="w-full h-14 font-black shadow-brand-500/20 shadow-lg text-lg" isLoading={loading}>
              <span className="flex items-center gap-2">
                Send Request
                <Send className="h-5 w-5" />
              </span>
            </Button>
            
            <p className="text-center text-[10px] text-slate-600 font-medium">
              By submitting, you agree to our Terms of Service and Privacy Policy.
            </p>
          </form>
        </Card>
      </div>
    </div>
  )
}
