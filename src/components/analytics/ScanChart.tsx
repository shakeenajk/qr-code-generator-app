import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ScanChartProps {
  data: { date: string; scans: number }[];
}

export default function ScanChart({ data }: ScanChartProps) {
  if (data.length === 0 || data.every(d => d.scans === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-64 md:h-72">
        <p className="text-sm font-semibold text-gray-700 dark:text-slate-300">No scans yet</p>
        <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Share your QR code to start tracking.</p>
      </div>
    );
  }

  return (
    <div
      className="w-full h-64 md:h-72"
      aria-label="Scan volume over last 30 days"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="scanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.25} />
              <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: '#9ca3af' }}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: '#1e293b',
              border: '1px solid #334155',
              borderRadius: '8px',
              fontSize: '12px',
              color: '#f1f5f9',
            }}
            cursor={{ stroke: '#6366f1', strokeWidth: 1 }}
          />
          <Area
            type="monotone"
            dataKey="scans"
            stroke="#4F46E5"
            fill="url(#scanGradient)"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: '#4F46E5' }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
