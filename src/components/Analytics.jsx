import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Sparkles, PieChart as PieChartIcon, ListFilter, Calendar, TrendingUp, Zap, BarChart2 } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, AreaChart, Area, CartesianGrid
} from 'recharts';

const getPresetRange = (preset) => {
  const today = new Date();
  const toStr = (d) => d.toISOString().split('T')[0];
  if (preset === 'today') { const s = toStr(today); return { start: s, end: s }; }
  if (preset === 'week') {
    const start = new Date(today); start.setDate(today.getDate() - today.getDay());
    return { start: toStr(start), end: toStr(today) };
  }
  if (preset === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1);
    return { start: toStr(start), end: toStr(today) };
  }
  return null;
};

const PRESETS = [
  { id: 'today', label: 'Today' },
  { id: 'week',  label: 'This Week' },
  { id: 'month', label: 'This Month' },
  { id: 'custom', label: 'Custom' },
];

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#5AC8FA', '#FF2D55'];

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  const getTodayStr = () => new Date().toISOString().split('T')[0];
  const [activePreset, setActivePreset] = useState('month');
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(getTodayStr());
  const [flowType, setFlowType] = useState('Expense');
  const [chartType, setChartType] = useState('Donut');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }
      const q = query(collection(db, 'TRANSACTIONS'), where('user_id', '==', user.uid));
      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
        setTransactions(docs);
        setLoading(false);
      });
      return () => unsubscribeSnapshot();
    });
    return () => unsubscribeAuth();
  }, []);

  const handlePreset = (id) => {
    setActivePreset(id);
    if (id !== 'custom') { const range = getPresetRange(id); setStartDate(range.start); setEndDate(range.end); }
  };
  const handleCustomDate = (field, value) => {
    setActivePreset('custom');
    if (field === 'start') setStartDate(value); else setEndDate(value);
  };

  const startObj = new Date(`${startDate}T00:00:00`);
  const endObj   = new Date(`${endDate}T23:59:59`);

  const periodTransactions = transactions.filter(t => {
    if (!t.timestamp) return false;
    const d = new Date(t.timestamp.seconds * 1000);
    return d >= startObj && d <= endObj;
  });

  const periodIncome  = periodTransactions.filter(t => t.transaction_type === 'Income').reduce((a, b) => a + b.amount, 0);
  const periodExpense = periodTransactions.filter(t => t.transaction_type === 'Expense').reduce((a, b) => a + b.amount, 0);
  const periodNet     = periodIncome - periodExpense;
  const savingsRate   = periodIncome > 0 ? ((periodNet / periodIncome) * 100) : null;

  const chartTransactions = periodTransactions.filter(t => t.transaction_type === flowType);
  const totalChartAmount  = chartTransactions.reduce((a, b) => a + b.amount, 0);
  const txCount           = chartTransactions.length;

  // --- Category breakdown ---
  const categoryTotals = {};
  const categoryCount  = {};
  chartTransactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
    categoryCount[t.category]  = (categoryCount[t.category]  || 0) + 1;
  });
  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value, count: categoryCount[name] }))
    .sort((a, b) => b.value - a.value);

  // --- Daily trend data ---
  const dailyTrend = (() => {
    if (!startDate || !endDate) return [];
    const map = {};
    chartTransactions.forEach(t => {
      if (!t.timestamp) return;
      const d = new Date(t.timestamp.seconds * 1000);
      const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      map[key] = (map[key] || 0) + t.amount;
    });

    // Build full date range so gaps show as 0
    const result = [];
    const cursor = new Date(startObj);
    while (cursor <= endObj) {
      const key = cursor.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      result.push({ date: key, amount: map[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  })();

  const hasMultipleDays = dailyTrend.length > 1;

  // --- 4. Biggest single transaction ---
  const biggestTx = chartTransactions.length > 0
    ? chartTransactions.reduce((max, t) => t.amount > max.amount ? t : max, chartTransactions[0])
    : null;

  // --- 5. Day of week breakdown ---
  const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const dowTotals = Array(7).fill(0);
  chartTransactions.forEach(t => {
    if (!t.timestamp) return;
    const dow = new Date(t.timestamp.seconds * 1000).getDay();
    dowTotals[dow] += t.amount;
  });
  const dowData    = DAYS.map((day, i) => ({ day, amount: dowTotals[i] }));
  const maxDowAmt  = Math.max(...dowTotals);
  const peakDayIdx = dowTotals.indexOf(maxDowAmt);
  const hasDowData = maxDowAmt > 0;

  // Insight
  let insightMessage = '';
  if (categoryData.length === 0) {
    insightMessage = `No ${flowType.toLowerCase()}s recorded for this period.`;
  } else {
    const top    = categoryData[0];
    const topPct = ((top.value / totalChartAmount) * 100).toFixed(1);
    const avg    = (totalChartAmount / txCount).toFixed(2);
    const verb   = flowType === 'Expense' ? 'spent' : 'collected';
    const noun   = flowType === 'Expense' ? 'purchase' : 'deposit';
    let second   = '';
    if (categoryData.length > 1) {
      const s = categoryData[1];
      second = ` followed by ${s.name} at ${((s.value / totalChartAmount) * 100).toFixed(1)}%.`;
    }
    insightMessage = `You ${verb} ₵${totalChartAmount.toFixed(2)} across ${txCount} transactions, averaging ₵${avg} per ${noun}. Biggest driver: ${top.name} at ${topPct}%.${second}`;
  }

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl border border-slate-100 p-3 rounded-2xl shadow-xl">
          {label && <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1">{label}</p>}
          <p className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1">{payload[0].name ?? payload[0].dataKey}</p>
          <p className="text-[20px] font-bold text-[#1C1C1E] tracking-tighter">₵{Number(payload[0].value).toFixed(2)}</p>
        </div>
      );
    }
    return null;
  };

  const trendColor = flowType === 'Expense' ? '#FF3B30' : '#34C759';
  const trendFill  = flowType === 'Expense' ? '#FF3B30' : '#34C759';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-32">
        <div className="px-5 pt-14">

          {/* Header */}
          <div className="mb-5 px-1 flex justify-between items-end">
            <div>
              <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-widest mb-1">Deep Dive</p>
              <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">Analytics</h1>
            </div>
            <Calendar className="w-8 h-8 text-[#8E8E93] opacity-20" />
          </div>

          {/* Preset chips */}
          <div className="flex space-x-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
            {PRESETS.map(({ id, label }) => (
              <button key={id} onClick={() => handlePreset(id)}
                className={`flex-shrink-0 px-4 py-1.5 rounded-full text-[13px] font-bold transition-all border ${
                  activePreset === id ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]' : 'bg-white text-[#8E8E93] border-[#E5E5EA]'
                }`}>
                {label}
              </button>
            ))}
          </div>

          {/* Date pickers */}
          <div className="flex space-x-3 mb-4">
            {[['From', 'start', startDate], ['To', 'end', endDate]].map(([label, field, val]) => (
              <div key={field} className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-black/[0.02]">
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">{label}</label>
                <input type="date" value={val}
                  onChange={(e) => handleCustomDate(field, e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] font-semibold text-[#1C1C1E]" />
              </div>
            ))}
          </div>

          {/* Flow type toggle */}
          <div className="bg-[#E5E5EA] p-1 rounded-[12px] flex mb-6">
            {['Expense', 'Income'].map((t) => (
              <button key={t} onClick={() => setFlowType(t)}
                className={`flex-1 py-2 text-[15px] font-semibold rounded-[10px] transition-all ${
                  flowType === t
                    ? `bg-white shadow-sm ${t === 'Expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'}`
                    : 'text-[#8E8E93]'
                }`}>
                {t === 'Expense' ? 'Expenses' : 'Income'}
              </button>
            ))}
          </div>

          {/* Insight card */}
          <div className={`rounded-[2rem] p-6 shadow-lg mb-6 relative overflow-hidden transition-colors duration-500 ${flowType === 'Expense' ? 'bg-[#1C1C1E]' : 'bg-[#198734]'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10" />
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-white/10 p-2 rounded-full"><Sparkles className="w-5 h-5 text-white" /></div>
                <h3 className="text-white font-bold text-[15px]">Data Insight</h3>
              </div>
              <p className="text-white/90 text-[15px] leading-relaxed font-medium">{insightMessage}</p>
            </div>
          </div>

          {/* ── 1. SPENDING TREND LINE CHART ── */}
          {hasMultipleDays && (
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] mb-6 overflow-hidden">
              <div className="px-5 pt-5 pb-3 flex items-center space-x-2">
                <TrendingUp className="w-5 h-5 text-[#8E8E93]" />
                <h3 className="text-[17px] font-bold text-[#1C1C1E]">Daily Trend</h3>
              </div>
              <div className="h-[180px] w-full px-2 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={dailyTrend} margin={{ top: 10, right: 16, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%"  stopColor={trendFill} stopOpacity={0.15} />
                        <stop offset="95%" stopColor={trendFill} stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" vertical={false} />
                    <XAxis
                      dataKey="date"
                      axisLine={false} tickLine={false}
                      tick={{ fontSize: 11, fill: '#8E8E93', fontWeight: 600 }}
                      interval={Math.ceil(dailyTrend.length / 5) - 1}
                    />
                    <YAxis hide />
                    <Tooltip content={<CustomTooltip />} />
                    <Area
                      type="monotone" dataKey="amount"
                      stroke={trendColor} strokeWidth={2.5}
                      fill="url(#trendGrad)" dot={false} activeDot={{ r: 5, fill: trendColor, strokeWidth: 0 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── 2. CATEGORY CHART + BREAKDOWN LIST ── */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] mb-6 overflow-hidden">
            <div className="p-5 border-b border-[#F2F2F7]">
              <div className="flex items-center space-x-2 mb-4">
                <PieChartIcon className="w-5 h-5 text-[#8E8E93]" />
                <h3 className="text-[17px] font-bold text-[#1C1C1E]">By Category</h3>
              </div>
              <div className="bg-[#F2F2F7] p-1 rounded-[10px] flex">
                {['Donut', 'Pie', 'Bar'].map((type) => (
                  <button key={type} onClick={() => setChartType(type)}
                    className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[8px] transition-all ${chartType === type ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93]'}`}>
                    {type}
                  </button>
                ))}
              </div>
            </div>

            {/* Chart */}
            <div className="h-[280px] w-full flex items-center justify-center px-2 pt-4">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'Bar' ? (
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false}
                        tick={{ fontSize: 13, fill: '#1C1C1E', fontWeight: 600 }} width={80} />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: '#F2F2F7', radius: 12 }} />
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={22}>
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  ) : (
                    <PieChart>
                      <Pie data={categoryData} dataKey="value" nameKey="name"
                        cx="50%" cy="45%" outerRadius={85}
                        innerRadius={chartType === 'Donut' ? 60 : 0}
                        paddingAngle={chartType === 'Donut' ? 3 : 0} stroke="none">
                        {categoryData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle"
                        wrapperStyle={{ fontSize: '12px', fontWeight: '600', color: '#8E8E93', paddingTop: '16px' }} />
                    </PieChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-[#8E8E93] text-[15px] font-medium">No data to visualize.</p>
              )}
            </div>

            {/* ── Category breakdown list ── */}
            {categoryData.length > 0 && (
              <div className="px-5 pb-5 pt-3 border-t border-[#F2F2F7] mt-2 space-y-4">
                {categoryData.map((cat, i) => {
                  const pct = totalChartAmount > 0 ? (cat.value / totalChartAmount) * 100 : 0;
                  return (
                    <div key={cat.name}>
                      <div className="flex justify-between items-center mb-1.5">
                        <div className="flex items-center space-x-2">
                          <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-[15px] font-semibold text-[#1C1C1E]">{cat.name}</span>
                          <span className="text-[12px] text-[#8E8E93] font-medium">{cat.count} tx</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[15px] font-bold text-[#1C1C1E]">₵{cat.value.toFixed(2)}</span>
                          <span className="text-[12px] text-[#8E8E93] font-medium ml-1.5">{pct.toFixed(1)}%</span>
                        </div>
                      </div>
                      <div className="w-full h-1.5 bg-[#F2F2F7] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700"
                          style={{ width: `${pct}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* ── 4. BIGGEST SINGLE TRANSACTION ── */}
          {biggestTx && (
            <>
              <div className="mb-2 px-1 flex items-center space-x-2">
                <Zap className="w-5 h-5 text-[#8E8E93]" />
                <h3 className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">Biggest Transaction</h3>
              </div>
              <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] p-5 mb-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold shadow-sm ${flowType === 'Expense' ? 'bg-[#FFEBEA] text-[#FF3B30]' : 'bg-[#EBF9EE] text-[#34C759]'}`}>
                      {flowType === 'Expense' ? '↑' : '↓'}
                    </div>
                    <div>
                      <p className="text-[18px] font-black text-[#1C1C1E] tracking-tight">{biggestTx.category}</p>
                      {biggestTx.note ? (
                        <p className="text-[13px] text-[#8E8E93] italic mt-0.5">"{biggestTx.note}"</p>
                      ) : null}
                      <p className="text-[12px] text-[#8E8E93] font-medium mt-0.5">
                        {biggestTx.timestamp
                          ? new Date(biggestTx.timestamp.seconds * 1000).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
                          : ''}
                        {biggestTx.payment_method ? ` · ${biggestTx.payment_method}` : ''}
                      </p>
                    </div>
                  </div>
                  <p className={`text-[22px] font-black tracking-tighter ${flowType === 'Expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
                    ₵{biggestTx.amount.toFixed(2)}
                  </p>
                </div>
                <div className="mt-4 bg-[#F2F2F7] rounded-xl px-4 py-2.5">
                  <p className="text-[13px] text-[#8E8E93] font-medium">
                    This single transaction is{' '}
                    <span className="font-bold text-[#1C1C1E]">
                      {totalChartAmount > 0 ? ((biggestTx.amount / totalChartAmount) * 100).toFixed(1) : 0}%
                    </span>{' '}
                    of your total {flowType.toLowerCase()}s this period.
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── 5. DAY OF WEEK BREAKDOWN ── */}
          {hasDowData && (
            <>
              <div className="mb-2 px-1 flex items-center space-x-2">
                <BarChart2 className="w-5 h-5 text-[#8E8E93]" />
                <h3 className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">By Day of Week</h3>
              </div>
              <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] p-5 mb-6">
                <div className="flex items-end justify-between h-28 mb-3 space-x-1.5">
                  {dowData.map((d, i) => {
                    const heightPct = maxDowAmt > 0 ? (d.amount / maxDowAmt) * 100 : 0;
                    const isPeak    = i === peakDayIdx && d.amount > 0;
                    return (
                      <div key={d.day} className="flex-1 flex flex-col items-center justify-end h-full">
                        <div className="w-full flex flex-col items-center justify-end" style={{ height: '80%' }}>
                          <div
                            className={`w-full rounded-t-lg transition-all duration-700 ${isPeak ? (flowType === 'Expense' ? 'bg-[#FF3B30]' : 'bg-[#34C759]') : 'bg-[#E5E5EA]'}`}
                            style={{ height: `${Math.max(heightPct, d.amount > 0 ? 4 : 0)}%` }}
                          />
                        </div>
                        <p className={`text-[11px] font-bold mt-1.5 ${isPeak ? (flowType === 'Expense' ? 'text-[#FF3B30]' : 'text-[#34C759]') : 'text-[#8E8E93]'}`}>
                          {d.day}
                        </p>
                      </div>
                    );
                  })}
                </div>
                <div className={`rounded-xl px-4 py-2.5 ${flowType === 'Expense' ? 'bg-[#FFEBEA]' : 'bg-[#EBF9EE]'}`}>
                  <p className={`text-[13px] font-medium ${flowType === 'Expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
                    <span className="font-black">{DAYS[peakDayIdx]}</span> is your biggest {flowType.toLowerCase()} day: ₵{maxDowAmt.toFixed(2)} on average.
                    {flowType === 'Expense' ? ' Watch your spending then.' : ' Great earning day!'}
                  </p>
                </div>
              </div>
            </>
          )}

          {/* ── 3. PERIOD REPORT with savings rate ── */}
          <div className="mb-2 px-1 flex items-center space-x-2">
            <ListFilter className="w-5 h-5 text-[#8E8E93]" />
            <h3 className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">Period Report</h3>
          </div>
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden mb-8">
            <div className="p-5 flex flex-col space-y-4">
              <div className="flex justify-between items-center pb-4 border-b border-[#F2F2F7]">
                <span className="text-[16px] font-semibold text-[#1C1C1E]">Total Received</span>
                <span className="text-[17px] font-bold text-[#34C759]">+₵{periodIncome.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[#F2F2F7]">
                <span className="text-[16px] font-semibold text-[#1C1C1E]">Total Spent</span>
                <span className="text-[17px] font-bold text-[#FF3B30]">-₵{periodExpense.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center pb-4 border-b border-[#F2F2F7]">
                <span className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">Net Flow</span>
                <span className={`text-[22px] font-black tracking-tighter ${periodNet >= 0 ? 'text-[#1C1C1E]' : 'text-[#FF3B30]'}`}>
                  {periodNet < 0 ? '-' : ''}₵{Math.abs(periodNet).toFixed(2)}
                </span>
              </div>

              {/* Savings rate */}
              {savingsRate !== null ? (
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[15px] font-semibold text-[#1C1C1E]">Savings Rate</span>
                    <span className={`text-[20px] font-black tracking-tight ${
                      savingsRate >= 20 ? 'text-[#34C759]' : savingsRate >= 0 ? 'text-[#FF9500]' : 'text-[#FF3B30]'
                    }`}>
                      {savingsRate.toFixed(1)}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${
                        savingsRate >= 20 ? 'bg-[#34C759]' : savingsRate >= 0 ? 'bg-[#FF9500]' : 'bg-[#FF3B30]'
                      }`}
                      style={{ width: `${Math.min(Math.max(savingsRate, 0), 100)}%` }}
                    />
                  </div>
                  <p className="text-[12px] text-[#8E8E93] font-medium mt-1.5">
                    {savingsRate >= 20
                      ? 'Great! you\'re saving a healthy chunk of your income.'
                      : savingsRate >= 0
                      ? 'You\'re in the green but savings are slim. Try to push past 20%.'
                      : 'Spending exceeds income this period. Time to cut back.'}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex justify-between items-center">
                    <span className="text-[15px] font-semibold text-[#1C1C1E]">Savings Rate</span>
                    <span className="text-[15px] font-medium text-[#8E8E93]">No income logged</span>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Analytics;