import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Sparkles, PieChart as PieChartIcon, ListFilter, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Date formatting helper for standard HTML5 inputs (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split('T')[0];

  // Master Control States - Now using Custom Date Ranges
  const [startDate, setStartDate] = useState(getTodayStr());
  const [endDate, setEndDate] = useState(getTodayStr());
  const [flowType, setFlowType] = useState('Expense'); // 'Expense' or 'Income'
  const [chartType, setChartType] = useState('Donut');

  const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#5856D6', '#5AC8FA', '#FF2D55'];

  useEffect(() => {
    const q = query(
      collection(db, 'TRANSACTIONS'),
      where('user_id', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // --- 1. DYNAMIC DATA FILTERING BY EXACT DATES ---
  // Create Date objects from inputs (forcing start of day to end of day)
  const startObj = new Date(`${startDate}T00:00:00`);
  const endObj = new Date(`${endDate}T23:59:59`);

  // First, get ALL transactions in this date range (for the footer summary)
  const periodTransactions = transactions.filter(t => {
    if (!t.timestamp) return false;
    const tDate = new Date(t.timestamp.seconds * 1000);
    return tDate >= startObj && tDate <= endObj;
  });

  // Calculate Period Master Summary
  const periodIncome = periodTransactions.filter(t => t.transaction_type === 'Income').reduce((a, b) => a + b.amount, 0);
  const periodExpense = periodTransactions.filter(t => t.transaction_type === 'Expense').reduce((a, b) => a + b.amount, 0);
  const periodNet = periodIncome - periodExpense;

  // Next, filter specifically for the chosen flow type (for charts and insights)
  const chartTransactions = periodTransactions.filter(t => t.transaction_type === flowType);

  // --- 2. CATEGORY AGGREGATION & MATH ---
  const totalChartAmount = chartTransactions.reduce((a, b) => a + b.amount, 0);
  const txCount = chartTransactions.length;

  const categoryTotals = {};
  chartTransactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });

  const categoryData = Object.entries(categoryTotals)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // --- 3. ADVANCED BEHAVIORAL INSIGHTS ENGINE ---
  let insightMessage = "";
  if (categoryData.length === 0) {
    insightMessage = `Your records are completely clean. You tracked 0 ${flowType.toLowerCase()}s during this selected period.`;
  } else {
    const topCategory = categoryData[0].name;
    // Using .toFixed(1) fixes the 100% rounding bug!
    const topPercentage = ((categoryData[0].value / totalChartAmount) * 100).toFixed(1);
    const avgTx = (totalChartAmount / txCount).toFixed(2);
    const actionWord = flowType === 'Expense' ? 'spent' : 'collected';
    const singularWord = flowType === 'Expense' ? 'purchase' : 'deposit';

    let secondCategoryText = "";
    if (categoryData.length > 1) {
      const secondCategory = categoryData[1].name;
      const secondPercentage = ((categoryData[1].value / totalChartAmount) * 100).toFixed(1);
      secondCategoryText = ` followed by ${secondCategory} at ${secondPercentage}%.`;
    }

    insightMessage = `You ${actionWord} ₵${totalChartAmount.toFixed(2)} across ${txCount} transactions, averaging ₵${avgTx} per ${singularWord}. Your biggest driver was ${topCategory}, making up ${topPercentage}% of your total${secondCategoryText}`;
  }

  // Custom Apple-style Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-xl border border-slate-100 p-3 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.15)]">
          <p className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-widest mb-1">{payload[0].name}</p>
          <p className="text-[22px] font-bold text-[#1C1C1E] tracking-tighter">{`₵ ${payload[0].value.toFixed(2)}`}</p>
        </div>
      );
    }
    return null;
  };

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
          
          <div className="mb-4 px-1 flex justify-between items-end">
            <div>
              <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-widest mb-1">Deep Dive</p>
              <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">Analytics</h1>
            </div>
            <Calendar className="w-8 h-8 text-[#8E8E93] opacity-20" />
          </div>

          {/* --- EXACT DATE & FLOW CONTROLS --- */}
          <div className="mb-6 space-y-4">
            
            {/* Custom Date Picker Cards */}
            <div className="flex space-x-3">
              <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-black/[0.02]">
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">From Date</label>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] font-semibold text-[#1C1C1E]"
                />
              </div>
              <div className="flex-1 bg-white rounded-2xl p-3 shadow-sm border border-black/[0.02]">
                <label className="text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider block mb-1">To Date</label>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-transparent outline-none text-[15px] font-semibold text-[#1C1C1E]"
                />
              </div>
            </div>

            {/* Flow Type Filter */}
            <div className="bg-[#E5E5EA] p-1 rounded-[12px] flex">
              <button
                onClick={() => setFlowType('Expense')}
                className={`flex-1 py-2 text-[15px] font-semibold rounded-[10px] transition-all ${flowType === 'Expense' ? 'bg-white text-[#FF3B30] shadow-sm' : 'text-[#8E8E93] hover:text-[#1C1C1E]'}`}
              >
                Expenses
              </button>
              <button
                onClick={() => setFlowType('Income')}
                className={`flex-1 py-2 text-[15px] font-semibold rounded-[10px] transition-all ${flowType === 'Income' ? 'bg-white text-[#34C759] shadow-sm' : 'text-[#8E8E93] hover:text-[#1C1C1E]'}`}
              >
                Income
              </button>
            </div>
          </div>

          {/* --- SMART BEHAVIORAL INSIGHTS --- */}
          <div className={`rounded-[2rem] p-6 shadow-lg mb-8 relative overflow-hidden transition-colors duration-500 ${flowType === 'Expense' ? 'bg-[#1C1C1E]' : 'bg-[#198734]'}`}>
            <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full blur-2xl -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex items-center space-x-2 mb-3">
                <div className="bg-white/10 p-2 rounded-full backdrop-blur-md">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <h3 className="text-white font-bold text-[15px]">Data Insight</h3>
              </div>
              <p className="text-white/90 text-[15px] leading-relaxed font-medium">
                {insightMessage}
              </p>
            </div>
          </div>

          {/* --- INTERACTIVE CHART EXPLORER --- */}
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] mb-8 overflow-hidden">
            <div className="p-5 border-b border-[#F2F2F7]">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <PieChartIcon className="w-5 h-5 text-[#8E8E93]" />
                  <h3 className="text-[17px] font-bold text-[#1C1C1E]">Visuals</h3>
                </div>
              </div>
              <div className="bg-[#F2F2F7] p-1 rounded-[10px] flex">
                {['Donut', 'Pie', 'Bar'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setChartType(type)}
                    className={`flex-1 py-1.5 text-[14px] font-semibold rounded-[8px] transition-all ${chartType === type ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93] hover:text-[#1C1C1E]'}`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-5 h-[320px] w-full flex items-center justify-center">
              {categoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  {chartType === 'Donut' || chartType === 'Pie' ? (
                    <PieChart>
                      <Pie
                        data={categoryData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="45%"
                        outerRadius={90}
                        innerRadius={chartType === 'Donut' ? 65 : 0}
                        paddingAngle={chartType === 'Donut' ? 3 : 0}
                        stroke="none"
                      >
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '13px', fontWeight: '600', color: '#8E8E93', paddingTop: '20px' }} />
                    </PieChart>
                  ) : (
                    <BarChart data={categoryData} layout="vertical" margin={{ top: 0, right: 20, left: 20, bottom: 0 }}>
                      <XAxis type="number" hide />
                      <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 13, fill: '#1C1C1E', fontWeight: 600 }} width={80} />
                      <Tooltip content={<CustomTooltip />} cursor={{fill: '#F2F2F7', radius: 12}}/>
                      <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                        {categoryData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Bar>
                    </BarChart>
                  )}
                </ResponsiveContainer>
              ) : (
                <div className="text-center text-[#8E8E93] text-[15px] font-medium">
                  No data to visualize.
                </div>
              )}
            </div>
          </div>

          {/* --- PERIOD MASTER SUMMARY FOOTER --- */}
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
              <div className="flex justify-between items-center pt-2">
                <span className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">Net Flow</span>
                <span className={`text-[22px] font-black tracking-tighter ${periodNet >= 0 ? 'text-[#1C1C1E]' : 'text-[#FF3B30]'}`}>
                  {periodNet >= 0 ? '' : '-'}₵{Math.abs(periodNet).toFixed(2)}
                </span>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Analytics;