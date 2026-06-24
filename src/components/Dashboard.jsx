import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { LogOut, PlusCircle } from 'lucide-react';

// Tailwind colors for the chart
const COLORS = ['#0f172a', '#334155', '#64748b', '#94a3b8', '#cbd5e1'];

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Real-time listener for the user's transactions
    const q = query(
      collection(db, 'TRANSACTIONS'),
      where('user_id', '==', auth.currentUser.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      
      // Sort by newest first in JavaScript (avoids Firebase index requirements for the prototype)
      docs.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0));
      
      setTransactions(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  // Calculate Totals
  const totalIncome = transactions
    .filter(t => t.transaction_type === 'Income')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const totalExpense = transactions
    .filter(t => t.transaction_type === 'Expense')
    .reduce((acc, curr) => acc + curr.amount, 0);

  const balance = totalIncome - totalExpense;

  // --- ALGORITHMIC GAMIFICATION: SAVINGS STREAK ---
  // Calculates consecutive days (counting backwards from today) where expenses were under 50 GHS
  const DAILY_BUDGET_LIMIT = 50; 

  const calculateStreak = () => {
    if (transactions.length === 0) return 0;

    // 1. Group all expenses by date
    const expensesByDate = {};
    transactions.forEach(t => {
      if (t.transaction_type === 'Expense' && t.timestamp) {
        const date = new Date(t.timestamp.seconds * 1000);
        const dateStr = date.toDateString(); // e.g., "Wed Jun 24 2026"
        expensesByDate[dateStr] = (expensesByDate[dateStr] || 0) + t.amount;
      }
    });

    // 2. Count backward day-by-day to find the streak
    let streak = 0;
    let checkDate = new Date(); // Starts exactly at current local time

    while (true) {
      const dateStr = checkDate.toDateString();
      const dailySpent = expensesByDate[dateStr] || 0; // If nothing logged, spent is 0

      if (dailySpent <= DAILY_BUDGET_LIMIT) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1); // Move to yesterday
      } else {
        break; // They overspent, streak is broken!
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // Prepare data for the Recharts Donut Chart (Expenses Only)
  const expensesByCategory = transactions
    .filter(t => t.transaction_type === 'Expense')
    .reduce((acc, curr) => {
      acc[curr.category] = (acc[curr.category] || 0) + curr.amount;
      return acc;
    }, {});

  const chartData = Object.keys(expensesByCategory).map(key => ({
    name: key,
    value: expensesByCategory[key]
  }));

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-20">
      {/* Header */}
      <div className="bg-white px-6 py-5 shadow-sm border-b border-slate-100 flex justify-between items-center">
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">BrokeCheck</h1>
          <p className="text-xs font-semibold text-slate-500 truncate w-40">{auth.currentUser.email}</p>
        </div>
        <button onClick={handleLogout} className="p-2 rounded-full bg-slate-100 text-slate-600 hover:bg-red-50 hover:text-red-600 transition-colors">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="max-w-md w-full mx-auto px-4 mt-6 space-y-6">
        
        {/* Balance Card */}
        <div className="bg-slate-900 rounded-3xl p-6 shadow-lg text-white">
          <p className="text-sm font-semibold text-slate-300 uppercase tracking-wider mb-1">Available Balance</p>
          <h2 className="text-4xl font-black mb-4">₵ {balance.toFixed(2)}</h2>
          <div className="flex justify-between border-t border-slate-700 pt-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">Income</p>
              <p className="text-sm font-bold text-green-400">₵ {totalIncome.toFixed(2)}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-medium">Expenses</p>
              <p className="text-sm font-bold text-red-400">₵ {totalExpense.toFixed(2)}</p>
            </div>
          </div>
        </div>
        {/* Gamification: Savings Streak */}
        <div className="bg-gradient-to-r from-amber-100 to-orange-100 rounded-2xl p-4 shadow-sm border border-orange-200 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-orange-800 mb-1">Savings Streak</p>
            <p className="text-sm font-medium text-orange-900">You've stayed under budget for <span className="font-black text-lg">{currentStreak}</span> days straight! 🔥</p>
          </div>
        </div>

        {/* Algorithmic Nudge (Only shows if balance > 50) */}
        {balance > 50 && (
          <div className="bg-blue-50 rounded-2xl p-4 shadow-sm border border-blue-100">
            <div className="flex items-start space-x-3">
              <div className="bg-blue-100 p-2 rounded-full mt-1">
                <span className="text-blue-600 font-bold text-lg">💡</span>
              </div>
              <div>
                <p className="text-sm font-bold text-blue-900">Healthy Surplus Detected!</p>
                <p className="text-xs font-medium text-blue-700 mt-1">
                  You have a surplus of ₵ {balance.toFixed(2)}. Consider diverting ₵ 20 into a micro-investment vehicle like Achieve or Databank to build long-term capital.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Analytics Chart */}
        {chartData.length > 0 ? (
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-4">Spending Breakdown</h3>
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    formatter={(value) => `₵ ${value.toFixed(2)}`}
                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', fontWeight: '600' }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-slate-100">
            <p className="text-slate-500 font-medium text-sm">No expenses logged yet.</p>
          </div>
        )}

        {/* Recent Transactions List */}
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3 px-2">Recent Logs</h3>
          <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
            {transactions.slice(0, 5).map((t) => (
              <div key={t.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.category}</p>
                  <p className="text-xs font-medium text-slate-400">{t.payment_method}</p>
                </div>
                <p className={`text-sm font-bold ${t.transaction_type === 'Income' ? 'text-green-600' : 'text-slate-900'}`}>
                  {t.transaction_type === 'Income' ? '+' : '-'} ₵{t.amount.toFixed(2)}
                </p>
              </div>
            ))}
            {transactions.length === 0 && (
              <p className="text-center text-xs text-slate-400 py-4">Your ledger is empty.</p>
            )}
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <Link 
        to="/new" 
        className="fixed bottom-6 right-6 bg-slate-900 text-white rounded-full p-4 shadow-lg hover:bg-slate-800 transition-transform hover:scale-105 active:scale-95"
      >
        <PlusCircle className="w-6 h-6" />
      </Link>
    </div>
  );
}

export default Dashboard;