import React from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card } from '../components/ui/Card';
import { ArrowUpRight, ArrowDownRight, Users, Phone, PhoneCall, Wallet } from 'lucide-react';

const data = [
  { name: 'Mon', calls: 140 },
  { name: 'Tue', calls: 230 },
  { name: 'Wed', calls: 190 },
  { name: 'Thu', calls: 280 },
  { name: 'Fri', calls: 350 },
  { name: 'Sat', calls: 120 },
  { name: 'Sun', calls: 80 },
];

const StatCard = ({ title, value, trend, trendUp, icon: Icon, color }: any) => (
  <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-start justify-between">
    <div>
      <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
      <h3 className="text-2xl font-bold text-slate-900">{value}</h3>
      <div className={`flex items-center mt-2 text-xs font-medium ${trendUp ? 'text-emerald-600' : 'text-red-600'}`}>
        {trendUp ? <ArrowUpRight className="w-3 h-3 mr-1" /> : <ArrowDownRight className="w-3 h-3 mr-1" />}
        {trend} vs last week
      </div>
    </div>
    <div className={`p-3 rounded-lg ${color}`}>
      <Icon className="w-5 h-5 text-white" />
    </div>
  </div>
);

const Dashboard: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-500">Overview of your AI communication performance.</p>
        </div>
        <div className="flex gap-2">
          <button className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Export Report
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-200">
            + New Campaign
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Total Calls" 
          value="1,248" 
          trend="12.5%" 
          trendUp={true} 
          icon={PhoneCall} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Active Agents" 
          value="8" 
          trend="2 new" 
          trendUp={true} 
          icon={Users} 
          color="bg-indigo-500" 
        />
        <StatCard 
          title="Numbers Active" 
          value="12" 
          trend="0%" 
          trendUp={true} 
          icon={Phone} 
          color="bg-violet-500" 
        />
        <StatCard 
          title="Twilio Spend" 
          value="$248.50" 
          trend="4.2%" 
          trendUp={false} 
          icon={Wallet} 
          color="bg-slate-800" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Call Volume (Last 7 Days)">
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data}>
                  <defs>
                    <linearGradient id="colorCalls" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} dy={10} />
                  <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                  />
                  <Area type="monotone" dataKey="calls" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#colorCalls)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </Card>
        </div>
        
        <div className="space-y-6">
            <Card title="Recent Activity">
                <div className="space-y-4">
                    {[1,2,3,4].map((i) => (
                        <div key={i} className="flex items-start gap-3 pb-3 border-b border-slate-50 last:border-0 last:pb-0">
                            <div className="w-2 h-2 mt-2 rounded-full bg-emerald-500"></div>
                            <div>
                                <p className="text-sm font-medium text-slate-800">New lead captured</p>
                                <p className="text-xs text-slate-500">Agent "Sales Bot 01" via +1 (555) 123-4567</p>
                                <p className="text-xs text-slate-400 mt-1">2 mins ago</p>
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
            <Card className="bg-gradient-to-br from-indigo-600 to-indigo-800 text-white">
                <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold">Upgrade Plan</h3>
                    <Wallet className="w-5 h-5 text-indigo-200"/>
                </div>
                <p className="text-sm text-indigo-100 mb-4">You are nearing your 5,000 minute limit for this month.</p>
                <button className="w-full py-2 bg-white text-indigo-700 rounded-lg text-sm font-bold shadow hover:bg-indigo-50 transition-colors">
                    View Billing
                </button>
            </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;