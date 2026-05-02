import { useState } from 'react'
import Card from '../components/ui/Card'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { FileText, Download, Table, FileSpreadsheet, PieChart, TrendingUp } from 'lucide-react'
import { useAuth } from '../auth/AuthContext'

export default function ReportsPage() {
  const { user } = useAuth()
  const role = user?.role
  
  const [startDate, setStartDate] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 1)
    return d.toISOString().split('T')[0]
  })
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0])

  const reports = [
    {
      id: 'member_list',
      name: 'Full Member Directory',
      description: 'Comprehensive list of all members with their current status and contact info.',
      type: 'pdf',
      endpoint: '/api/reports/members/',
      icon: FileText,
      roles: ['super_admin', 'gym_owner', 'staff']
    },
    {
      id: 'revenue_summary',
      name: 'Financial Revenue Report',
      description: 'Detailed breakdown of all payments, outstanding dues, and monthly totals.',
      type: 'excel',
      endpoint: '/api/reports/revenue/',
      icon: FileSpreadsheet,
      roles: ['super_admin', 'gym_owner']
    },
    {
      id: 'attendance_trends',
      name: 'Attendance Analytics',
      description: 'Daily check-in volumes and peak hour analysis for your facility.',
      type: 'pdf',
      endpoint: '/api/reports/attendance/',
      icon: TrendingUp,
      roles: ['super_admin', 'gym_owner', 'staff']
    }
  ]

  const filteredReports = reports.filter(r => role && r.roles.includes(role))

  function handleDownload(endpoint: string, exportType: string) {
    const url = `${endpoint}?export=${exportType}&start=${startDate}&end=${endDate}`
    window.open(url, '_blank')
  }

  return (
    <div className="animate-fadeInUp space-y-8 max-w-6xl mx-auto">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Analytics Center</h1>
          <p className="text-sm text-slate-500">Generate and export detailed business reports.</p>
        </div>
        
        <div className="flex gap-4 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">Start Date</label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="h-9 border-none bg-slate-50 dark:bg-slate-950" />
          </div>
          <div className="space-y-1">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest">End Date</label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="h-9 border-none bg-slate-50 dark:bg-slate-950" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredReports.map((report) => (
          <Card key={report.id} className="p-6 flex flex-col justify-between hover:border-brand-500/50 transition-all group overflow-hidden">
             <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:opacity-10 transition-opacity">
                <report.icon className="h-24 w-24" />
             </div>
             
             <div>
                <div className="h-12 w-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-500 mb-6 font-bold shadow-brand-500/10 shadow-lg group-hover:scale-110 transition-transform">
                   <report.icon className="h-6 w-6" />
                </div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">{report.name}</h3>
                <p className="text-sm text-slate-500 leading-relaxed min-h-[60px]">
                  {report.description}
                </p>
             </div>

             <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex items-center gap-3">
                <Button 
                  onClick={() => handleDownload(report.endpoint, report.type)} 
                  className="flex-1 gap-2 h-11"
                  variant={report.type === 'pdf' ? 'primary' : 'outline'}
                >
                  <Download className="h-4 w-4" /> Export as {report.type.toUpperCase()}
                </Button>
             </div>
          </Card>
        ))}

        {/* Dynamic Analytics Preview placeholder */}
        <Card className="p-6 border-dashed border-2 flex flex-col items-center justify-center text-center bg-slate-50/50 dark:bg-slate-950/20">
           <PieChart className="h-10 w-10 text-slate-300 dark:text-slate-700 mb-4" />
           <h4 className="text-sm font-bold text-slate-400 uppercase tracking-widest">Live Analytics</h4>
           <p className="text-xs text-slate-400 mt-1">Real-time data visualization (v1.0)</p>
        </Card>
      </div>

      <Card className="p-8 bg-slate-900 border-none relative overflow-hidden">
         <div className="absolute top-[-20%] right-[-10%] h-64 w-64 bg-brand-500/20 blur-[100px] rounded-full" />
         <div className="relative z-10 flex flex-col md:flex-row items-center gap-8">
            <div className="h-20 w-20 rounded-3xl bg-white/5 backdrop-blur-md flex items-center justify-center border border-white/10 shrink-0">
               <Table className="h-10 w-10 text-brand-500" />
            </div>
            <div>
               <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Need a Custom Report?</h2>
               <p className="text-sm text-slate-400 max-w-xl">
                 As a premium member, you have access to custom data queries. If you need a specialized report format or specific analytics, contact our support team.
               </p>
            </div>
            <Button variant="outline" className="md:ml-auto h-12 px-8 border-white/10 hover:bg-white/5">Request Custom Report</Button>
         </div>
      </Card>
    </div>
  )
}
