import React from 'react';
import { Card } from '../components/ui/Card';
import { Play, Download, ExternalLink, Calendar, Clock, User } from 'lucide-react';

const Calls: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Call Logs</h1>
          <p className="text-slate-500">History, recordings, and analytics.</p>
        </div>
        <div className="flex gap-2">
            <input type="date" className="border-slate-200 rounded-lg text-sm" />
            <button className="px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">Filter</button>
        </div>
      </div>

      <Card>
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4">Contact</th>
                        <th className="px-6 py-4">Agent</th>
                        <th className="px-6 py-4">Duration</th>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4 text-right">Recording</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <tr key={i} className="hover:bg-slate-50 transition-colors cursor-pointer group">
                            <td className="px-6 py-4">
                                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${i % 3 === 0 ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'}`}>
                                    {i % 3 === 0 ? 'Failed' : 'Completed'}
                                </span>
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">+1 (555) 123-456{i}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">Dr. Sarah (Dental)</td>
                            <td className="px-6 py-4 text-sm text-slate-600 font-mono">04:12</td>
                            <td className="px-6 py-4 text-sm text-slate-500">Oct 24, 2:30 PM</td>
                            <td className="px-6 py-4 text-right">
                                <div className="flex justify-end gap-2 opacity-60 group-hover:opacity-100 transition-opacity">
                                    <button className="p-1.5 rounded-md hover:bg-indigo-50 text-indigo-600">
                                        <Play className="w-4 h-4" />
                                    </button>
                                    <button className="p-1.5 rounded-md hover:bg-slate-100 text-slate-600">
                                        <ExternalLink className="w-4 h-4" />
                                    </button>
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
      </Card>
    </div>
  );
};

export default Calls;