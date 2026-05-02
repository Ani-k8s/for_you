import { useState, useEffect } from 'react'
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion'
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
  CheckCircle2,
  ChevronRight,
  Star,
  Quote,
  LayoutDashboard,
  Smartphone,
  Globe
} from 'lucide-react'
import Button from '../components/ui/Button'
import Card from '../components/ui/Card'
import LoginForm from '../components/auth/LoginForm'
import Modal from '../components/ui/Modal'
import { useAuth } from '../auth/AuthContext'

export default function LandingPage() {
  const navigate = useNavigate()
  const { isAuthenticated, user } = useAuth()
  const [isLoginOpen, setIsLoginOpen] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)

  const { scrollY } = useScroll()
  const headerBg = useTransform(scrollY, [0, 50], ["rgba(0,0,0,0)", "rgba(0,0,0,0.8)"])
  const headerBlur = useTransform(scrollY, [0, 50], ["blur(0px)", "blur(12px)"])

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  // Auto-redirect if already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      const getDashboardRoute = (u: any) => {
        if (u.role === 'gym_owner') return '/dashboard/owner'
        if (u.role === 'staff') return '/dashboard/trainer'
        if (u.role === 'super_admin') return '/dashboard/super-admin'
        if (u.role === 'member') return '/dashboard/member'
        return '/'
      }
      navigate(getDashboardRoute(user), { replace: true })
    }
  }, [isAuthenticated, user, navigate])

  return (
    <div className="min-h-screen bg-[#050508] text-white selection:bg-indigo-500/30 selection:text-white overflow-x-hidden font-sans">
      {/* Premium Navbar */}
      <motion.nav 
        style={{ backgroundColor: headerBg, backdropFilter: headerBlur }}
        className={`fixed top-0 inset-x-0 z-[100] border-b transition-colors duration-500 ${scrolled ? 'border-white/5' : 'border-transparent'}`}
      >
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
             <div className="h-10 w-10 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-xl shadow-indigo-500/20 group-hover:rotate-12 transition-all duration-500 border border-white/10">
                <LayoutDashboard className="h-5 w-5 text-white" />
             </div>
             <span className="text-xl font-bold tracking-tight">
               Fit<span className="text-indigo-500">Flow</span>
             </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-10">
             <div className="flex items-center gap-8">
               <a href="#features" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Features</a>
               <a href="#pricing" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Pricing</a>
               <a href="#testimonials" className="text-sm font-medium text-slate-400 hover:text-white transition-colors">Customers</a>
             </div>
             <div className="h-4 w-px bg-white/10 mx-2" />
             <div className="flex items-center gap-4">
               <button 
                 onClick={() => setIsLoginOpen(true)} 
                 className="text-sm font-medium text-white hover:text-indigo-400 transition-colors px-4"
               >
                 Log In
               </button>
               <Link to="/register">
                 <Button size="sm" className="h-11 px-6 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-600/20 transition-all active:scale-95">
                   Get Started
                 </Button>
               </Link>
             </div>
          </div>

          {/* Mobile Menu Toggle */}
          <button 
            className="md:hidden h-10 w-10 flex items-center justify-center rounded-xl bg-white/5 border border-white/10 text-white"
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
              className="md:hidden border-t border-white/5 bg-[#050508]/fb9 backdrop-blur-3xl overflow-hidden"
            >
              <div className="flex flex-col p-8 gap-6">
                <a href="#features" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-slate-400 hover:text-white">Features</a>
                <a href="#pricing" onClick={() => setIsMobileMenuOpen(false)} className="text-lg font-bold text-slate-400 hover:text-white">Pricing</a>
                <div className="h-px w-full bg-white/5" />
                <button 
                  onClick={() => { setIsMobileMenuOpen(false); setIsLoginOpen(true); }}
                  className="text-left text-lg font-bold text-white hover:text-indigo-400"
                >
                  Log In
                </button>
                <Link to="/register" onClick={() => setIsMobileMenuOpen(false)}>
                  <Button className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 rounded-2xl font-bold text-white shadow-lg shadow-indigo-600/20">
                    Get Started Free
                  </Button>
                </Link>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-48 pb-32 px-6 overflow-hidden min-h-screen flex flex-col items-center">
        {/* Animated Background */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-[1400px] pointer-events-none overflow-hidden">
           <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] bg-indigo-600/10 blur-[120px] rounded-full animate-pulse" />
           <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }} />
        </div>

        <div className="max-w-7xl mx-auto w-full relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <div className="inline-flex items-center px-4 py-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 mb-8 backdrop-blur-md">
                <Zap className="h-4 w-4 text-indigo-400 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">Next-Gen Gym Management</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] tracking-tight mb-8">
                Run Your Gym <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-400 to-fuchsia-400">Like a Pro</span>
              </h1>
              <p className="text-lg md:text-xl text-slate-400 font-medium leading-relaxed mb-12 max-w-xl">
                Manage members, payments, and sessions effortlessly with our smart SaaS solution. Everything you need to scale your fitness empire in one place.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <Link to="/register" className="w-full sm:w-auto">
                  <Button className="w-full sm:w-auto h-16 px-10 text-base font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-xl shadow-indigo-600/30 transition-all hover:scale-105 active:scale-95 group">
                    Get Started Free
                    <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <button onClick={() => setIsLoginOpen(true)} className="w-full sm:w-auto h-16 px-10 text-base font-bold bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all">
                  View Live Demo
                </button>
              </div>

              <div className="mt-16 flex items-center gap-8 opacity-50">
                 <div className="flex -space-x-3">
                   {[1,2,3,4].map(i => (
                     <div key={i} className="w-10 h-10 rounded-full border-2 border-[#050508] bg-slate-800 flex items-center justify-center overflow-hidden">
                       <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${i + 10}`} alt="User" />
                     </div>
                   ))}
                 </div>
                 <div className="text-sm">
                    <div className="flex items-center gap-1 text-yellow-500 mb-1">
                      {[1,2,3,4,5].map(i => <Star key={i} className="w-3 h-3 fill-current" />)}
                    </div>
                    <p className="font-bold text-white italic">Trusted by 200+ gym owners</p>
                 </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="relative"
            >
              <div className="absolute -inset-4 bg-indigo-600/20 blur-[100px] rounded-full animate-pulse" />
              <div className="relative rounded-3xl border border-white/10 bg-[#0a0a0f] p-3 shadow-2xl overflow-hidden group">
                 <div className="absolute inset-0 bg-gradient-to-br from-indigo-600/5 to-transparent pointer-events-none" />
                 <img 
                    src="https://images.unsplash.com/photo-1540344299657-411029a9934f?auto=format&fit=crop&q=80&w=1200" 
                    alt="Dashboard Preview" 
                    className="rounded-2xl w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-700"
                 />
                 <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-sm">
                    <div className="w-16 h-16 rounded-full bg-white text-black flex items-center justify-center shadow-2xl">
                       <PlayCircle className="w-8 h-8 ml-1 fill-current" />
                    </div>
                 </div>
              </div>

              {/* Floating Cards */}
              <div className="absolute -bottom-10 -left-10 w-48 p-5 bg-[#12121a] border border-white/10 rounded-2xl shadow-2xl animate-float hidden md:block">
                 <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Today's Revenue</p>
                 <p className="text-2xl font-bold text-white">$2,450.00</p>
                 <div className="mt-3 flex items-center gap-2 text-[10px] text-emerald-400 font-bold">
                    <Activity className="w-3 h-3" /> +12.5% increase
                 </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="py-32 px-6 relative">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h2 className="text-indigo-400 font-bold uppercase tracking-[0.2em] text-xs mb-4">Core Capabilities</h2>
            <h3 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">Designed for Modern Fitness</h3>
            <p className="text-slate-500 max-w-xl mx-auto">Enterprise-grade features packed into a clean, intuitive interface designed for owners, trainers, and members.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<Users className="w-8 h-8" />}
              title="Member Management"
              desc="Digital waivers, contract management, and comprehensive activity history for every member."
            />
            <FeatureCard 
              icon={<Zap className="w-8 h-8" />}
              title="Automated Billing"
              desc="Recurrent payments, automated invoices, and failed payment recovery out of the box."
            />
            <FeatureCard 
              icon={<Smartphone className="w-8 h-8" />}
              title="Mobile Access"
              desc="Contactless check-ins with QR technology. Members can book classes from their phone."
            />
            <FeatureCard 
              icon={<BarChart3 className="w-8 h-8" />}
              title="Revenue Analytics"
              desc="Detailed financial reports and churn analysis to help you make data-driven decisions."
            />
            <FeatureCard 
              icon={<Lock className="w-8 h-8" />}
              title="Secure Storage"
              desc="Bank-level encryption for all member data and financial information. Fully GDPR compliant."
            />
            <FeatureCard 
              icon={<Globe className="w-8 h-8" />}
              title="Multi-Location Support"
              desc="Manage multiple gyms under one organization with dedicated subdomain routing."
            />
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-32 bg-white/[0.02] border-y border-white/5 relative overflow-hidden">
        <div className="max-w-7xl mx-auto px-6 text-center">
           <div className="mb-20">
              <h3 className="text-3xl md:text-5xl font-bold mb-8">Management Simplified</h3>
              <p className="text-slate-400 max-w-2xl mx-auto">Get a bird's-eye view of your entire operation from a single, powerful dashboard.</p>
           </div>
           <div className="relative max-w-5xl mx-auto">
              <div className="absolute inset-0 bg-indigo-500/10 blur-[160px] rounded-full pointer-events-none" />
              <img 
                src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&q=80&w=2000" 
                className="rounded-[2.5rem] border border-white/10 shadow-2xl animate-float-up shadow-indigo-500/10"
                alt="Dashboard Mockup"
              />
           </div>
        </div>
      </section>

      {/* Testimonials */}
      <section id="testimonials" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-24">
            <h3 className="text-4xl md:text-5xl font-bold mb-6">Loved by Gym Owners</h3>
            <p className="text-slate-500">Join the elite facilities transforming their business with FitFlow.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <TestimonialCard 
              name="Sarah Jenkins"
              gym="Iron Peak Fitness"
              quote="Switching to FitFlow was the best decision we made. Our member retention has increased by 15% in just 3 months."
              image="https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah"
            />
            <TestimonialCard 
              name="Mark Thompson"
              gym="Apex Performance"
              quote="The automated billing system saved me 10+ hours a week. I can finally focus on coaching rather than chasing payments."
              image="https://api.dicebear.com/7.x/avataaars/svg?seed=Mark"
            />
            <TestimonialCard 
              name="David Chen"
              gym="Urban Strength"
              quote="The QR check-in system is flawless. Our members love the mobile experience, and the analytics are top-notch."
              image="https://api.dicebear.com/7.x/avataaars/svg?seed=David"
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-32 px-6 bg-white/[0.01]">
         <div className="max-w-7xl mx-auto">
            <div className="text-center mb-24">
              <h3 className="text-4xl md:text-6xl font-bold mb-6">Simple, Transparent Pricing</h3>
              <p className="text-slate-500">Scale your gym with a plan that fits your growth.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-10 max-w-6xl mx-auto">
               <PricingCard 
                 title="Basic"
                 price="49"
                 features={['Up to 100 members', 'Basic Analytics', 'Mobile App Access', 'Email Support']}
               />
               <PricingCard 
                 title="Pro"
                 price="99"
                 popular
                 features={['Unlimited members', 'Advanced Analytics', 'Automated Billing', 'Staff Management', 'Priority Support']}
               />
               <PricingCard 
                 title="Enterprise"
                 price="199"
                 features={['Multi-Location Support', 'Custom Branding', 'API Access', 'Dedicated Account Manager', '24/7 Phone Support']}
               />
            </div>
         </div>
      </section>

      {/* CTA Footer Section */}
      <section className="py-40 px-6 text-center relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-indigo-600/5 blur-[160px] rounded-full pointer-events-none" />
        <div className="max-w-4xl mx-auto relative z-10">
           <h2 className="text-5xl md:text-7xl font-bold leading-tight mb-12 italic tracking-tighter">
              Ready to <span className="text-indigo-400 underline decoration-indigo-600/30">Transform</span> Your Gym?
           </h2>
           <Link to="/register">
             <Button className="h-20 px-16 text-xl font-bold bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl shadow-2xl shadow-indigo-600/40 hover:scale-105 active:scale-95 transition-all">
               Start Your 14-Day Free Trial
             </Button>
           </Link>
           <p className="mt-10 text-slate-500 text-sm font-medium">No credit card required &bull; Cancel anytime &bull; 5-minute setup</p>
        </div>
      </section>

      <footer className="py-24 border-t border-white/5 bg-[#030305]">
         <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-16 md:gap-8 mb-20">
            <div className="md:col-span-1">
               <div className="flex items-center gap-3 mb-8">
                  <LayoutDashboard className="h-6 w-6 text-indigo-500" />
                  <span className="text-xl font-bold tracking-tight">FitFlow</span>
               </div>
               <p className="text-sm text-slate-500 leading-relaxed max-w-xs">Elevating gym management with intelligent automation and world-class design.</p>
            </div>
            <div>
               <h5 className="text-xs font-bold uppercase tracking-widest text-white mb-8">Product</h5>
               <ul className="space-y-4 text-sm text-slate-500">
                  <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
                  <li><a href="#pricing" className="hover:text-white transition-colors">Pricing</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Roadmap</a></li>
               </ul>
            </div>
            <div>
               <h5 className="text-xs font-bold uppercase tracking-widest text-white mb-8">Company</h5>
               <ul className="space-y-4 text-sm text-slate-500">
                  <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                  <li><a href="#" className="hover:text-white transition-colors">Legal</a></li>
               </ul>
            </div>
            <div>
               <h5 className="text-xs font-bold uppercase tracking-widest text-white mb-8">Support</h5>
               <div className="flex items-center gap-2 text-indigo-400 mb-6">
                  <Globe className="h-4 w-4" />
                  <span className="text-xs font-bold">English (US)</span>
               </div>
               <p className="text-xs text-slate-600">&copy; 2026 FitFlow SaaS Technologies.</p>
            </div>
         </div>
      </footer>

      {/* Premium Login Modal (Glassmorphism) */}
      <Modal 
        open={isLoginOpen} 
        onClose={() => setIsLoginOpen(false)}
        className="max-w-lg bg-[#0a0a0f]/80 backdrop-blur-3xl rounded-[2.5rem] border border-white/10 shadow-[0_0_100px_rgba(79,70,229,0.1)]"
      >
        <div className="p-4">
           <div className="flex flex-col items-center mb-10">
              <div className="h-16 w-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mb-6 border border-indigo-600/20 shadow-inner">
                <Shield className="h-8 w-8 text-indigo-400" />
              </div>
              <h4 className="text-2xl font-bold text-white mb-2">Welcome Back</h4>
              <p className="text-sm text-slate-500">Secure access to your gym dashboard</p>
           </div>
           <LoginForm />
        </div>
      </Modal>

      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        .text-indigo-gradient {
          background: linear-gradient(135deg, #818cf8 0%, #c084fc 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
      `}} />
    </div>
  )
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <Card isShimmer className="p-10 bg-white/[0.02] border-white/5 hover:border-indigo-500/30 hover:bg-white/[0.04] transition-all duration-500 rounded-3xl group">
       <div className="h-16 w-16 bg-indigo-500/10 text-indigo-400 rounded-2xl flex items-center justify-center mb-8 group-hover:scale-110 group-hover:bg-indigo-500 group-hover:text-white transition-all duration-500">
          {icon}
       </div>
       <h4 className="text-xl font-bold text-white mb-4">{title}</h4>
       <p className="text-sm text-slate-500 leading-relaxed group-hover:text-slate-400 transition-colors">{desc}</p>
    </Card>
  )
}

function TestimonialCard({ name, gym, quote, image }: { name: string, gym: string, quote: string, image: string }) {
  return (
    <Card className="p-10 bg-[#0a0a0f] border-white/5 rounded-3xl relative overflow-hidden group">
       <Quote className="absolute -top-4 -right-4 w-24 h-24 text-white/[0.02] group-hover:text-indigo-500/5 transition-colors" />
       <div className="flex items-center gap-1 text-indigo-400 mb-8">
          {[1,2,3,4,5].map(i => <Star key={i} className="w-4 h-4 fill-current" />)}
       </div>
       <p className="text-base text-slate-300 italic mb-10 relative z-10 leading-relaxed">"{quote}"</p>
       <div className="flex items-center gap-4">
          <img src={image} className="w-12 h-12 rounded-full border border-white/10" alt={name} />
          <div>
             <p className="text-sm font-bold text-white">{name}</p>
             <p className="text-xs text-slate-500">{gym}</p>
          </div>
       </div>
    </Card>
  )
}

function PricingCard({ title, price, features, popular = false }: { title: string, price: string, features: string[], popular?: boolean }) {
  return (
    <Card className={`p-10 flex flex-col h-full rounded-[2.5rem] border-white/5 bg-[#0a0a0f] relative overflow-hidden transition-all duration-500 hover:translate-y-[-8px] ${popular ? 'border-indigo-500/50 shadow-2xl shadow-indigo-600/10 scale-105 z-10' : ''}`}>
       {popular && (
         <div className="absolute top-0 right-0 px-6 py-2 bg-indigo-600 text-white text-[10px] font-black uppercase tracking-widest rounded-bl-2xl shadow-xl">
           Recommended
         </div>
       )}
       <div className="mb-10">
          <p className="text-xs font-black uppercase tracking-[0.2em] text-slate-500 mb-4">{title}</p>
          <div className="flex items-baseline gap-1">
             <span className="text-4xl font-bold text-white">${price}</span>
             <span className="text-sm text-slate-500 font-medium">/month</span>
          </div>
       </div>
       <ul className="space-y-4 mb-12 flex-1">
          {features.map((f, i) => (
            <li key={i} className="flex items-center gap-3 text-sm text-slate-400">
               <CheckCircle2 className="w-4 h-4 text-indigo-500" />
               {f}
            </li>
          ))}
       </ul>
       <Button className={`w-full h-14 rounded-2xl font-bold transition-all active:scale-95 ${popular ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl shadow-indigo-600/30' : 'bg-white/5 hover:bg-white/10 text-white border border-white/10'}`}>
         Choose Plan
       </Button>
    </Card>
  )
}
