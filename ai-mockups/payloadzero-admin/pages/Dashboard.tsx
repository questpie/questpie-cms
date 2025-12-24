import React, { useState } from 'react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts';
import { Activity, Users, Scissors, Plus, X, Calendar, DollarSign, TrendingUp } from 'lucide-react';
import { WidgetConfig } from '../types';

const INITIAL_WIDGETS: WidgetConfig[] = [
  { id: '1', type: 'stats', title: 'Shop Performance', size: 'full' },
  { id: '2', type: 'chart', title: 'Weekly Revenue', size: 'half' },
  { id: '3', type: 'activity', title: 'Shop Floor Activity', size: 'half' },
];

const mockChartData = [
  { name: 'Mon', revenue: 450 },
  { name: 'Tue', revenue: 620 },
  { name: 'Wed', revenue: 800 },
  { name: 'Thu', revenue: 750 },
  { name: 'Fri', revenue: 1200 },
  { name: 'Sat', revenue: 1450 },
  { name: 'Sun', revenue: 300 },
];

const Dashboard: React.FC = () => {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(INITIAL_WIDGETS);
  const [isAdding, setIsAdding] = useState(false);

  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  const addWidget = (type: WidgetConfig['type']) => {
    const newWidget: WidgetConfig = {
      id: Date.now().toString(),
      type,
      title: type === 'stats' ? 'New Stats' : type === 'chart' ? 'New Chart' : 'Activity Feed',
      size: 'half'
    };
    setWidgets([...widgets, newWidget]);
    setIsAdding(false);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-row items-center md:items-end justify-between gap-4">
        <div>
           <h1 className="text-2xl md:text-4xl font-extrabold text-zinc-900 mb-1 tracking-tight">Today's Cut</h1>
           <p className="text-xs md:text-sm text-zinc-500 font-medium">Tuesday, Oct 24th • <span className="text-green-600 font-bold">OPEN</span></p>
        </div>
        
        <div className="relative">
          <button 
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 bg-primary-600 text-white px-3 py-2 md:px-5 md:py-2.5 hover:bg-primary-700 transition-colors font-bold text-xs md:text-sm tracking-wide shadow-lg shadow-primary-600/20"
          >
            <Plus size={18} strokeWidth={3} />
            <span className="hidden md:inline">ADD WIDGET</span>
          </button>
          
          {isAdding && (
            <div className="absolute right-0 top-14 w-56 bg-white border border-zinc-200 shadow-2xl z-20 flex flex-col animate-in fade-in slide-in-from-top-2">
              <button onClick={() => addWidget('stats')} className="text-left px-5 py-3 hover:bg-zinc-50 text-sm font-medium border-b border-zinc-100">Stats Overview</button>
              <button onClick={() => addWidget('chart')} className="text-left px-5 py-3 hover:bg-zinc-50 text-sm font-medium border-b border-zinc-100">Revenue Chart</button>
              <button onClick={() => addWidget('activity')} className="text-left px-5 py-3 hover:bg-zinc-50 text-sm font-medium">Recent Activity</button>
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {widgets.map((widget) => (
          <div 
            key={widget.id} 
            className={`
              bg-white border border-zinc-200 p-4 md:p-8 relative group shadow-sm hover:shadow-md transition-shadow
              ${widget.size === 'full' ? 'md:col-span-2' : 'md:col-span-1'}
            `}
          >
            <div className="flex justify-between items-center mb-6 md:mb-8">
              <h3 className="font-black text-zinc-900 uppercase tracking-widest text-[10px] md:text-xs flex items-center gap-2">
                <span className="w-2 h-2 bg-primary-500"></span>
                {widget.title}
              </h3>
              <button 
                onClick={() => removeWidget(widget.id)}
                className="text-zinc-300 hover:text-red-500 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X size={16} />
              </button>
            </div>

            {/* Widget Content */}
            {widget.type === 'stats' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="bg-zinc-50 p-4 md:p-5 border border-zinc-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Calendar size={64} />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-3">
                     <Calendar size={18} className="text-primary-600" />
                     <span className="text-xs uppercase font-bold tracking-wider">Appointments</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-zinc-900">12<span className="text-base md:text-lg text-zinc-400 font-normal">/15</span></p>
                  <p className="text-xs text-green-600 mt-2 font-bold flex items-center gap-1"><TrendingUp size={12}/> +3</p>
                </div>
                
                <div className="bg-zinc-50 p-4 md:p-5 border border-zinc-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <DollarSign size={64} />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-3">
                     <DollarSign size={18} className="text-primary-600" />
                     <span className="text-xs uppercase font-bold tracking-wider">Revenue</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-zinc-900">$1,450</p>
                  <p className="text-xs text-zinc-400 mt-2">Goal: $1,200</p>
                </div>
                
                <div className="bg-zinc-50 p-4 md:p-5 border border-zinc-100 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Scissors size={64} />
                  </div>
                  <div className="flex items-center gap-2 text-zinc-500 mb-3">
                     <Scissors size={18} className="text-primary-600" />
                     <span className="text-xs uppercase font-bold tracking-wider">Services</span>
                  </div>
                  <p className="text-2xl md:text-3xl font-black text-zinc-900">24</p>
                  <p className="text-xs text-zinc-400 mt-2">Top: Royal Shave</p>
                </div>
              </div>
            )}

            {widget.type === 'chart' && (
              <div className="h-48 md:h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={mockChartData}>
                    <defs>
                      <linearGradient id="colorRev" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#d97706" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#d97706" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f4f4f5" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 11, fontWeight: 600}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#a1a1aa', fontSize: 11}} tickFormatter={(val) => `$${val}`} />
                    <Tooltip 
                      cursor={{stroke: '#d97706', strokeWidth: 1}}
                      contentStyle={{borderRadius: 0, border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)', backgroundColor: '#18181b', color: 'white'}}
                      itemStyle={{color: '#fbbf24'}}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#d97706" strokeWidth={3} fillOpacity={1} fill="url(#colorRev)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}

            {widget.type === 'activity' && (
              <div className="space-y-4 md:space-y-6">
                {[
                  { text: 'New Appointment: James Bond', time: '10 min ago', type: 'appt' },
                  { text: 'Inventory Alert: Matte Clay Low', time: '1 hour ago', type: 'alert' },
                  { text: 'Marcus completed "Royal Shave"', time: '2 hours ago', type: 'done' }
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 pb-4 border-b border-zinc-50 last:border-0 last:pb-0">
                    <div className={`
                      w-8 h-8 flex items-center justify-center shrink-0 
                      ${item.type === 'appt' ? 'bg-blue-100 text-blue-600' : item.type === 'alert' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'}
                    `}>
                      {item.type === 'appt' ? <Calendar size={14} /> : item.type === 'alert' ? <Activity size={14} /> : <Scissors size={14} />}
                    </div>
                    <div>
                      <p className="text-xs md:text-sm font-semibold text-zinc-800">{item.text}</p>
                      <p className="text-[10px] md:text-xs text-zinc-400 mt-1 uppercase tracking-wide font-medium">{item.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;