import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { TrendingUp, RefreshCw, ExternalLink, ChevronRight } from 'lucide-react';

const PLATFORMS = [
  {
    id: 'acheive',
    name: 'Acheive',
    tagline: 'Goal-based savings for students',
    minAmount: 1,
    color: 'bg-emerald-50 border-emerald-100',
    accent: 'text-emerald-700',
    dot: 'bg-emerald-500',
    url: 'https://acheive.com.gh',
  },
  {
    id: 'mtn-pension',
    name: 'MTN Pension (Provident Fund)',
    tagline: 'MoMo-linked, starts from ₵5',
    minAmount: 5,
    color: 'bg-yellow-50 border-yellow-100',
    accent: 'text-yellow-700',
    dot: 'bg-yellow-400',
    url: 'https://www.mtn.com.gh',
  },
  {
    id: 'ecobank',
    name: 'Ecobank Xpress Account',
    tagline: 'Savings with interest, no minimum',
    minAmount: 0,
    color: 'bg-blue-50 border-blue-100',
    accent: 'text-blue-700',
    dot: 'bg-blue-500',
    url: 'https://ecobank.com/gh',
  },
  {
    id: 'fido',
    name: 'Fido',
    tagline: 'Short-term savings and micro-credit',
    minAmount: 10,
    color: 'bg-purple-50 border-purple-100',
    accent: 'text-purple-700',
    dot: 'bg-purple-500',
    url: 'https://fido.money',
  },
  {
    id: 'susu',
    name: 'Digital Susu (MoMo)',
    tagline: 'Group savings via Mobile Money',
    minAmount: 5,
    color: 'bg-orange-50 border-orange-100',
    accent: 'text-orange-700',
    dot: 'bg-orange-400',
    url: 'https://www.mtn.com.gh',
  },
];

function Invest() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [advice, setAdvice]             = useState(null);
  const [generating, setGenerating]     = useState(false);
  const [error, setError]               = useState('');

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }
      const q = query(collection(db, 'TRANSACTIONS'), where('user_id', '==', user.uid));
      const unsub = onSnapshot(q, (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        setTransactions(docs);
        setLoading(false);
      });
      return () => unsub();
    });
    return () => unsubAuth();
  }, []);

  // Derive financial summary from real data
  const buildFinancialSummary = () => {
    const now     = new Date();
    const msInDay = 1000 * 60 * 60 * 24;

    const totalBalance = transactions.reduce((acc, t) =>
      t.transaction_type === 'Income' ? acc + t.amount : acc - t.amount, 0);

    // Last 30 days
    const last30 = transactions.filter(t => t.timestamp &&
      (now - new Date(t.timestamp.seconds * 1000)) <= 30 * msInDay);

    const monthlyIncome  = last30.filter(t => t.transaction_type === 'Income').reduce((a, b) => a + b.amount, 0);
    const monthlyExpense = last30.filter(t => t.transaction_type === 'Expense').reduce((a, b) => a + b.amount, 0);
    const monthlySavings = monthlyIncome - monthlyExpense;

    // Top spending categories
    const catTotals = {};
    last30.filter(t => t.transaction_type === 'Expense').forEach(t => {
      catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
    });
    const topCategories = Object.entries(catTotals)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([cat, amt]) => `${cat} (₵${amt.toFixed(2)})`);

    const savingsRate = monthlyIncome > 0
      ? ((monthlySavings / monthlyIncome) * 100).toFixed(1)
      : 0;

    return {
      totalBalance: totalBalance.toFixed(2),
      monthlyIncome: monthlyIncome.toFixed(2),
      monthlyExpense: monthlyExpense.toFixed(2),
      monthlySavings: monthlySavings.toFixed(2),
      savingsRate,
      topCategories: topCategories.join(', ') || 'not enough data yet',
      txCount: transactions.length,
    };
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setError('');
    setAdvice(null);

    const summary = buildFinancialSummary();

    const platforms = PLATFORMS.map(p => `- ${p.name}: ${p.tagline}, minimum ₵${p.minAmount}`).join('\n');

    const prompt = `You are a friendly, no-nonsense financial advisor for Ghanaian tertiary students. 
You give practical, specific, actionable investment advice based on the student's real financial data.
Avoid jargon. Be direct and encouraging. Reference their actual numbers. Never be preachy.
Do not use em dashes. Do not use bullet points with hyphens — use numbered lists or plain paragraphs.
Keep your response under 280 words.

Here is the student's financial snapshot from BrokeCheck, their personal finance app:
- Current balance: ₵${summary.totalBalance}
- Income last 30 days: ₵${summary.monthlyIncome}
- Expenses last 30 days: ₵${summary.monthlyExpense}
- Net savings last 30 days: ₵${summary.monthlySavings}
- Savings rate: ${summary.savingsRate}%
- Top spending categories: ${summary.topCategories}
- Total transactions logged: ${summary.txCount}

Available Ghanaian investment platforms for students:
${platforms}

Give them specific advice on:
1. How much they can realistically start investing given their current numbers
2. Which 1 or 2 platforms make the most sense for them right now and why
3. One concrete action they can take this week

Be honest if their numbers are tight. If their balance is very low or savings are negative, acknowledge that and give them a path to get ready to invest first.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-6',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }],
        }),
      });

      const data = await response.json();
      const text = data.content?.map(c => c.text || '').join('') || '';
      if (!text) throw new Error('Empty response');
      setAdvice(text.trim());
    } catch (err) {
      console.error('Invest advice error:', err);
      setError('Could not load advice right now. Check your connection and try again.');
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  const summary = buildFinancialSummary();

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-32">
        <div className="px-5 pt-14">

          {/* Header */}
          <div className="mb-6">
            <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-widest mb-1">Your Money, Working</p>
            <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">Invest</h1>
          </div>

          {/* Balance snapshot */}
          <div className="bg-[#1C1C1E] rounded-[2rem] p-6 mb-6 flex justify-between items-center">
            <div>
              <p className="text-slate-400 text-[12px] font-bold uppercase tracking-widest mb-1">Balance</p>
              <p className="text-white text-[28px] font-black tracking-tighter">₵{summary.totalBalance}</p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-[12px] font-bold uppercase tracking-widest mb-1">Saved (30d)</p>
              <p className={`text-[22px] font-black tracking-tighter ${parseFloat(summary.monthlySavings) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {parseFloat(summary.monthlySavings) >= 0 ? '+' : ''}₵{summary.monthlySavings}
              </p>
            </div>
          </div>

          {/* Advice card */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm p-6 mb-6">
            {!advice && !generating && (
              <div className="text-center py-4">
                <div className="w-14 h-14 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                  <TrendingUp className="w-7 h-7 text-slate-400" />
                </div>
                <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-2">Get Personalised Advice</h3>
                <p className="text-[#8E8E93] text-[14px] leading-relaxed mb-6">
                  Based on your real balance and spending, get specific recommendations on where to put your cedis to work, even if it's a small amount.
                </p>
                <button
                  onClick={handleGenerate}
                  className="w-full py-4 bg-[#1C1C1E] text-white rounded-xl font-bold text-[16px] active:bg-[#3A3A3C] transition-colors"
                >
                  Show Me Where to Invest
                </button>
              </div>
            )}

            {generating && (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-2 border-[#1C1C1E] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                <p className="text-[#8E8E93] text-[14px] font-medium">Analysing your finances...</p>
              </div>
            )}

            {advice && !generating && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-[17px] font-bold text-[#1C1C1E]">Your Advice</h3>
                  <button onClick={handleGenerate}
                    className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900 active:scale-95 transition-all border border-slate-100">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
                <p className="text-[15px] text-[#1C1C1E] leading-relaxed whitespace-pre-line">{advice}</p>
              </div>
            )}

            {error && (
              <div className="text-center py-4">
                <p className="text-rose-500 text-[14px] font-medium mb-4">{error}</p>
                <button onClick={handleGenerate}
                  className="w-full py-3 bg-[#1C1C1E] text-white rounded-xl font-bold text-[15px]">
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Platforms directory */}
          <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-widest mb-3 px-1">Platforms Available to You</p>
          <div className="space-y-3 mb-8">
            {PLATFORMS.map((p) => (
              <a key={p.id} href={p.url} target="_blank" rel="noopener noreferrer"
                className={`flex items-center justify-between bg-white rounded-2xl px-5 py-4 border shadow-sm active:scale-95 transition-all ${p.color}`}>
                <div className="flex items-center space-x-3">
                  <div className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${p.dot}`} />
                  <div>
                    <p className={`text-[15px] font-bold ${p.accent}`}>{p.name}</p>
                    <p className="text-[12px] text-[#8E8E93] font-medium">{p.tagline}</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-[#8E8E93] flex-shrink-0" />
              </a>
            ))}
          </div>

          {/* Disclaimer */}
          <p className="text-[11px] text-[#8E8E93] text-center leading-relaxed px-4 pb-4">
            This is not a 100% financial advice. Always do your own research before investing. Platform details may change, verify before committing any funds.
          </p>

        </div>
      </div>
    </div>
  );
}

export default Invest;