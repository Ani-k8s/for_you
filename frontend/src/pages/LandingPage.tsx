import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import { 
  Zap, 
  Shield, 
  BarChart3, 
  Users, 
  ArrowRight,
  Activity,
  Lock,
  PlayCircle,
  Building,
  Target,
  Trophy,
  Menu,
  X,
  AlertCircle,
  ChevronRight,
  ShieldCheck
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import LoginForm from '../components/auth/LoginForm'
import Modal from '../components/ui/Modal'
import { getDashboardRoute } from '../auth/authHelpers'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-redirect if already logged in (Only if user profile is ready)
  useEffect(() => {
    if (isAuthenticated && user) {
      const target = getDashboardRoute(user.role)
      if (target !== '/') {
        console.log("[Auth] LandingPage auto-redirecting to:", target)
        navigate(target, { replace: true })
      }
    }
  }, [isAuthenticated, user, navigate])

  return (
    <div className="min-h-screen bg-[#020203] text-white selection:bg-brand-red/30 selection:text-white overflow-x-hidden font-sans">
      {/* Premium Navigation */}
      <nav className={`fixed top-0 inset-x-0 z-[100] border-b transition-all duration-500 ${scrolled ? 'bg-black/80 backdrop-blur-3xl border-white/10 py-3' : 'bg-transparent border-transparent py-5'}`}>
        <div className="max-w-7xl mx-auto px-6 flex items-center justify-between">
          <Link to="/" onClick={() => window.location.reload()} className="flex items-center gap-3 group">
             <div className="h-10 w-10 bg-gradient-to-br from-brand-red to-brand-orange rounded-xl flex items-center justify-center shadow-xl shadow-brand-red/20 group-hover:rotate-12 transition-all duration-500 border border-white/10">
                <Shield className="h-5 w-5 text-white" />
             </div>
             <span className="text-xl font-black tracking-tighter italic uppercase font-display">
               777C8 <span className="text-brand-red group-hover:text-brand-orange transition-colors">ELITE</span>
             </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
             <div className="flex items-center gap-8">
               <a href="#features" className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-white transition-all hover:translate-y-[-1px]">Features</a>
               <a href="#how-it-works" className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-400 hover:text-white transition-all hover:translate-y-[-1px]">How it Works</a>
             </div>
             <div className="h-4 w-px bg-white/10 mx-2" />
             <div className="flex items-center gap-6 relative z-10">
               <button 
                 onClick={() => setIsLoginOpen(true)} 
                 className="relative z-[110] text-[10px] font-black uppercase tracking-[0.25em] text-white hover:text-brand-red transition-colors py-2 px-4"
               >
                 Sign In
               </button>
               <Link to="/register" className="relative z-[110]">
                 <Button size="sm" className="h-11 px-8 btn-premium-gradient rounded-xl font-black uppercase tracking-widest text-[9px] shadow-lg shadow-brand-red/20 active:scale-95 transition-all">Get Started</Button>
               </Link>
             </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden h-12 w-12 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Menu Overlay */}
        <AnimatePresence>
          {isMobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="md:hidden border-t border-white/5 bg-black/95 backdrop-blur-3xl overflow-hidden"
            >
              <div className="flex flex-col p-8 gap-8">
                <a 
                  href="#features" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-black uppercase tracking-widest text-slate-400 hover:text-white"
                >
                  Features
                </a>
                <a 
                  href="#how-it-works" 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="text-lg font-black uppercase tracking-widest text-slate-400 hover:text-white"
                >
                  How it Works
                </a>
                <div className="h-px w-full bg-white/5" />
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false)
                    setIsLoginOpen(true)
                  }}
                  className="text-left text-lg font-black uppercase tracking-widest text-white hover:text-brand-red"
                >
                  Sign In
                </button>
                <Link 
                  to="/register" 
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Button className="w-full h-16 btn-premium-gradient rounded-2xl font-black uppercase tracking-widest text-xs shadow-lg shadow-brand-red/20">
                    Get Started
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden flex flex-col items-center justify-center min-h-[90vh]">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-brand-red/10 blur-[120px] rounded-full pointer-events-none animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-brand-orange/10 blur-[120px] rounded-full pointer-events-none animate-pulse" style={{ animationDelay: '2s' }} />
        
        <div className="max-w-7xl w-full relative z-10 text-center flex flex-col items-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="flex flex-col items-center w-full"
          >
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 mb-10 group cursor-default backdrop-blur-md hover:border-brand-red/30 transition-all duration-500">
              <span className="text-[9px] font-black uppercase tracking-[0.4em] text-slate-400">
                Trusted by <span className="text-white">500+</span> Elite Gyms worldwide
              </span>
            </div>

            <h1 className="text-5xl sm:text-7xl md:text-8xl lg:text-[110px] font-black uppercase italic tracking-tighter leading-[0.9] mb-10 text-gradient-elite max-w-[1200px] px-4">
              COMMAND YOUR <br />
              <span className="text-white">FITNESS EMPIRE</span>
            </h1>

            <p className="text-base sm:text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-14 max-w-2xl mx-auto px-6 opacity-80">
              The only platform built for high-performance gym management. <br className="hidden md:block" />
              Streamline operations, automate billing, and scale with absolute precision.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 w-full px-6">
              <Link to="/register" className="w-full sm:w-auto">
                <Button className="w-full sm:w-auto h-20 px-12 text-lg font-black uppercase tracking-widest btn-premium-gradient group shadow-2xl shadow-brand-red/30 rounded-2xl active:scale-95 transition-all">
                  Launch Your Gym
                  <ArrowRight className="ml-3 w-6 h-6 group-hover:translate-x-2 transition-transform" />
                </Button>
              </Link>
              <a href="#features" className="w-full sm:w-auto">
                <Button variant="secondary" className="w-full sm:w-auto h-20 px-12 text-lg font-black uppercase tracking-widest border-white/10 bg-white/[0.02] hover:bg-white/[0.05] rounded-2xl transition-all active:scale-95 shadow-xl">
                  Explore System
                </Button>
              </a>
            </div>
          </motion.div>
        </div>

        <div className="max-w-[1200px] w-full mx-auto mt-40 pt-16 border-t border-white/5 relative opacity-50">
           <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 px-6 bg-[#020203] text-[9px] font-black uppercase tracking-[0.5em] text-slate-700 whitespace-nowrap">
              Integrated Ecosystem
           </div>
           <div className="flex flex-wrap items-center justify-center gap-12 md:gap-24 grayscale hover:grayscale-0 transition-all duration-1000 cursor-default">
              <div className="flex items-center gap-3 font-black uppercase tracking-tighter text-xl italic text-white"><Activity className="w-6 h-6 text-brand-red" /> Performance</div>
              <div className="flex items-center gap-3 font-black uppercase tracking-tighter text-xl italic text-white"><Target className="w-6 h-6 text-brand-orange" /> Precision</div>
              <div className="flex items-center gap-3 font-black uppercase tracking-tighter text-xl italic text-white"><Trophy className="w-6 h-6 text-brand-yellow" /> Mastery</div>
           </div>
        </div>
      </section>

      {/* Feature Grid */}
      <section id="features" className="py-40 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="flex flex-col items-center text-center mb-32"
          >
            <Badge intent="primary" className="mb-6 h-6 px-4 font-black uppercase tracking-[0.3em] text-[9px]">Platform Capabilities</Badge>
            <h2 className="text-4xl md:text-7xl font-black uppercase italic tracking-tighter mb-6 leading-none">Built for <span className="text-gradient-elite">Scale</span></h2>
            <p className="text-slate-500 max-w-xl font-medium">Enterprise-grade features packed into a professional, intuitive interface designed for maximum efficiency.</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <FeatureCard 
              icon={<Users />}
              title="Member Command"
              description="Real-time member tracking, contract management, and intelligent engagement analytics."
            />
            <FeatureCard 
              icon={<Zap />}
              title="Instant Access"
              description="Proprietary QR attendance system for frictionless entry and automated check-ins."
            />
            <FeatureCard 
              icon={<Building />}
              title="Multi-Tenant Core"
              description="Secure isolation for every gym with custom branding and dedicated subdomain routing."
            />
            <FeatureCard 
              icon={<BarChart3 />}
              title="Neural Analytics"
              description="Predictive reporting on revenue growth, member churn, and peak equipment utilization."
            />
            <FeatureCard 
              icon={<Lock />}
              title="Vault Security"
              description="Bank-level encryption for payments and sensitive member data protection."
            />
            <FeatureCard 
              icon={<Trophy />}
              title="Leaderboards"
              description="Gamify gym participation with automated member challenges and performance rankings."
            />
          </div>
        </div>
      </section>

      {/* Workflow Section */}
      <section id="how-it-works" className="py-40 bg-white/[0.01] border-y border-white/5 px-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-red/5 blur-[120px] rounded-full pointer-events-none" />
        <div className="max-w-7xl mx-auto">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-32 items-center">
              <div className="order-2 lg:order-1">
                 <Badge intent="neutral" className="mb-8 h-6 px-4 font-black uppercase tracking-[0.3em] text-[9px] border-white/10">The Onboarding Process</Badge>
                 <h2 className="text-5xl md:text-7xl font-black uppercase italic tracking-tighter leading-[0.9] mb-16">
                    Launch in <br />
                    <span className="text-gradient-elite">Record Time</span>
                 </h2>
                 <div className="space-y-16">
                    <StepCard 
                      num="01"
                      title="Digital Registration"
                      desc="Deploy your gym infrastructure in seconds with our automated onboarding engine."
                    />
                    <StepCard 
                      num="02"
                      title="Elite Verification"
                      desc="Our system validates your credentials and activates your custom-branded domain."
                    />
                    <StepCard 
                      num="03"
                      title="Full Operation"
                      desc="Access your command center and begin transforming your gym's operational efficiency."
                    />
                 </div>
              </div>
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                className="relative order-1 lg:order-2"
              >
                 <div className="absolute inset-0 bg-brand-red/10 blur-[140px] rounded-full" />
                 <Card isShimmer className="relative p-2 rounded-[3rem] border-white/10 overflow-hidden bg-white/5 active-glow-brand shadow-2xl">
                    <div className="aspect-video rounded-[2.5rem] bg-black/40 backdrop-blur-xl flex items-center justify-center group cursor-pointer overflow-hidden relative">
                       <img src="https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&q=80" className="absolute inset-0 w-full h-full object-cover opacity-20 group-hover:scale-110 transition-transform duration-1000" alt="Platform" />
                       <div className="relative z-10 flex flex-col items-center">
                         <div className="w-24 h-24 rounded-full bg-brand-red flex items-center justify-center shadow-2xl shadow-brand-red/50 group-hover:scale-110 transition-transform duration-500">
                           <PlayCircle className="w-10 h-10 text-white fill-white" />
                         </div>
                         <span className="mt-8 text-[10px] font-black uppercase tracking-[0.5em] text-white">System Walkthrough</span>
                       </div>
                    </div>
                 </Card>
              </motion.div>
           </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-60 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-brand-red/5 blur-[160px] rounded-full pointer-events-none" />
        <div className="max-w-5xl mx-auto relative z-10">
           <h2 className="text-5xl md:text-[100px] font-black uppercase italic tracking-tighter leading-[0.85] mb-16">
              Ready to <br />
              <span className="text-gradient-elite">Ascend?</span>
           </h2>
           <Link to="/register">
             <Button className="h-24 px-20 text-2xl font-black uppercase tracking-[0.2em] italic btn-premium-gradient shadow-2xl shadow-brand-red/40 rounded-2xl hover:scale-105 active:scale-95 transition-all">
               Join The Elite <ArrowRight className="ml-4 w-8 h-8" />
             </Button>
           </Link>
           <p className="mt-12 text-slate-600 text-[10px] font-black uppercase tracking-[0.5em]">No long-term contracts &bull; 24/7 Support &bull; Enterprise Reliability</p>
        </div>
      </section>

      <footer className="py-32 border-t border-white/5 bg-[#010102] relative">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8 items-start mb-20">
            <div className="md:col-span-1">
               <div className="flex items-center gap-3 mb-8">
                  <Shield className="h-6 w-6 text-brand-red" />
                  <span className="text-xl font-black tracking-tighter italic uppercase font-display">777C8 <span className="text-brand-red">ELITE</span></span>
               </div>
               <p className="text-xs font-medium text-slate-500 leading-relaxed">The definitive operating system for high-performance fitness facilities.</p>
            </div>
            <div className="space-y-6">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-white">Product</h5>
               <ul className="space-y-4">
                  <li><a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Features</a></li>
                  <li><a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Security</a></li>
                  <li><a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Enterprise</a></li>
               </ul>
            </div>
            <div className="space-y-6">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-white">Company</h5>
               <ul className="space-y-4">
                  <li><a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">About</a></li>
                  <li><a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Support</a></li>
                  <li><a href="#" className="text-xs text-slate-500 hover:text-white transition-colors">Legal</a></li>
               </ul>
            </div>
            <div className="space-y-6">
               <h5 className="text-[10px] font-black uppercase tracking-widest text-white">System Status</h5>
               <div className="flex items-center gap-3">
                  <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">All Systems Operational</span>
               </div>
            </div>
         </div>
         <div className="text-center pt-20 border-t border-white/5">
            <p className="text-[9px] font-black text-slate-700 uppercase tracking-[0.4em] mb-4">&copy; 2026 777C8 Elite Platform. All Rights Reserved.</p>
            <p className="text-[8px] font-bold text-slate-800 uppercase tracking-[0.1em]">Designed for Performance &bull; Engineered for Scale</p>
         </div>
      </footer>

      {/* Standardized Login Modal */}
      <Modal 
        open={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        title="Secure Command Access"
        className="max-w-lg bg-[#050505] rounded-[3rem] shadow-[0_0_100px_rgba(255,26,26,0.1)] border border-white/10"
      >
        <div className="p-4">
           <div className="flex flex-col items-center mb-10">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl font-black text-white italic tracking-tighter uppercase">777C8</span>
                <span className="text-2xl font-black italic tracking-tighter uppercase text-gradient-elite">ELITE</span>
              </div>
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-600">Verification Required</p>
           </div>
           <LoginForm />
           <div className="mt-10 text-center">
              <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-700">Encrypted Terminal Session v1.0.4</p>
           </div>
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        .text-gradient-premium {
          background: linear-gradient(135deg, #facc15 0%, #ef4444 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .btn-premium-gradient {
          background: linear-gradient(135deg, #ff1a1a 0%, #ff6a00 100%);
          position: relative;
          z-index: 1;
        }
        .btn-premium-gradient::before {
          content: '';
          position: absolute;
          inset: 0;
          background: linear-gradient(135deg, #ff6a00 0%, #ff1a1a 100%);
          z-index: -1;
          opacity: 0;
          transition: opacity 0.5s ease-out;
          border-radius: inherit;
        }
        .btn-premium-gradient:hover::before {
          opacity: 1;
        }
      `}} />
    </div>
  )
}

function FeatureCard({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
    >
      <Card isShimmer className="group p-12 bg-white/[0.01] hover:bg-white/[0.02] transition-all duration-700 border-white/5 hover:border-brand-red/30 cursor-default shadow-2xl shadow-black relative overflow-hidden rounded-[2.5rem]">
         <div className="h-20 w-20 bg-white/[0.03] text-brand-red rounded-3xl flex items-center justify-center mb-12 group-hover:scale-110 group-hover:bg-brand-red group-hover:text-white transition-all duration-700 border border-white/5 group-hover:shadow-[0_0_40px_rgba(255,26,26,0.3)] group-hover:rotate-6">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-9 h-9' }) : icon}
         </div>
         <h3 className="text-3xl font-black text-white uppercase italic mb-6 tracking-tight group-hover:text-gradient-elite transition-all duration-500 font-display">{title}</h3>
         <p className="text-sm font-medium text-slate-500 leading-relaxed group-hover:text-slate-300 transition-colors duration-500">{description}</p>
         
         <div className="absolute top-4 right-4 opacity-[0.02] group-hover:opacity-[0.08] transition-opacity duration-1000">
            {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, { className: 'w-32 h-32' }) : icon}
         </div>
      </Card>
    </motion.div>
  )
}

function StepCard({ num, title, desc }: { num: string, title: string, desc: string }) {
  return (
    <div className="flex gap-10 group">
       <div className="relative text-7xl font-black text-white/[0.03] uppercase tracking-tighter italic group-hover:text-brand-red/20 transition-colors duration-700 leading-none">{num}</div>
       <div className="pt-2">
          <h4 className="text-2xl font-black text-white uppercase italic tracking-tight mb-3 group-hover:translate-x-2 transition-transform duration-700 font-display">{title}</h4>
          <p className="text-sm font-medium text-slate-500 leading-relaxed max-w-md group-hover:text-slate-400 transition-colors duration-700">{desc}</p>
       </div>
    </div>
  )
}

function Badge({ children, intent = 'primary', className = '' }: { children: React.ReactNode, intent?: 'primary' | 'neutral', className?: string }) {
  const styles = intent === 'primary' 
    ? 'bg-brand-red/10 border-brand-red/20 text-brand-red shadow-[0_0_20px_rgba(255,26,26,0.1)]'
    : 'bg-white/5 border-white/10 text-slate-400'
  
  return (
    <div className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors ${styles} ${className}`}>
      {children}
    </div>
  )
}
