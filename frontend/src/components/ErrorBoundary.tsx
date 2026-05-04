import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertCircle, RefreshCw, Home } from 'lucide-react'
import Button from './ui/Button'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[System Crash] Uncaught error:', error, errorInfo)
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null })
    window.location.reload()
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#020203] flex items-center justify-center p-6 text-white font-sans">
          <div className="max-w-xl w-full text-center space-y-10 animate-fadeInUp">
            <div className="relative inline-block">
               <div className="absolute -inset-10 bg-brand-red/20 blur-3xl rounded-full animate-pulse" />
               <div className="relative h-24 w-24 bg-brand-red/10 border border-brand-red/20 rounded-[2.5rem] flex items-center justify-center mx-auto shadow-2xl shadow-brand-red/20">
                  <AlertCircle className="h-12 w-12 text-brand-red" />
               </div>
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-gradient-elite">System Breach</h1>
              <p className="text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                A critical runtime exception has been detected. The system has been halted to prevent further instability.
              </p>
            </div>

            <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl text-left overflow-hidden">
               <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-700 mb-3 italic">Diagnostic Data</p>
               <p className="font-mono text-[11px] text-brand-orange break-words opacity-70">
                  {this.state.error?.message || 'Unknown Exception Sequence'}
               </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4 pt-4">
              <Button onClick={this.handleReset} className="w-full h-16 btn-premium-gradient rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-brand-red/20">
                <RefreshCw className="w-4 h-4 mr-3" />
                Initialize Recovery
              </Button>
              <Button onClick={() => window.location.href = '/'} variant="secondary" className="w-full h-16 bg-white/5 border-white/10 rounded-2xl font-black uppercase tracking-widest text-xs">
                <Home className="w-4 h-4 mr-3" />
                Return to Surface
              </Button>
            </div>

            <p className="text-[9px] font-black uppercase tracking-[0.5em] text-slate-800 italic pt-10">
              ForYou Gym SaaS &bull; Operational Integrity v1.4.2
            </p>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
