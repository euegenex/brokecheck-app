import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, addDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ChevronLeft, Plus, Trash2, Calendar, Target, AlertCircle, X } from 'lucide-react';

// Shared category list — imported by NewTransaction too via a shared constants file
// but duplicated here for self-containment
export const PRESET_CATEGORIES = [
  { value: 'Food',           emoji: '🍲', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { value: 'Transport',      emoji: '🚌', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'Academics',      emoji: '📚', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { value: 'Shopping',       emoji: '🛍️', color: 'bg-pink-50 text-pink-700 border-pink-200' },
  { value: 'Bills',          emoji: '⚡', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { value: 'Housing',        emoji: '🏠', color: 'bg-orange-50 text-orange-700 border-orange-200' },
  { value: 'Family',         emoji: '👨‍👩‍👧', color: 'bg-rose-50 text-rose-700 border-rose-200' },
  { value: 'Health',         emoji: '💊', color: 'bg-teal-50 text-teal-700 border-teal-200' },
  { value: 'Savings',        emoji: '🏦', color: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  { value: 'Flex',           emoji: '🎮', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'Miscellaneous',  emoji: '📦', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

const getCategoryMeta = (value) =>
  PRESET_CATEGORIES.find(c => c.value === value) ?? { value, emoji: '📌', color: 'bg-slate-50 text-slate-700 border-slate-200' };

const BAR_COLORS = {
  Food: 'bg-emerald-500', Transport: 'bg-blue-500', Academics: 'bg-indigo-500',
  Shopping: 'bg-pink-500', Bills: 'bg-amber-500', Housing: 'bg-orange-500',
  Family: 'bg-rose-500', Health: 'bg-teal-500', Savings: 'bg-cyan-500',
  Flex: 'bg-purple-500', Miscellaneous: 'bg-slate-400',
};
const getBarColor = (category) => BAR_COLORS[category] ?? 'bg-slate-400';

function Buckets() {
  const [transactions, setTransactions] = useState([]);
  const [userBudgets, setUserBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [totalBalance, setTotalBalance] = useState(0);
  const [isCreating, setIsCreating] = useState(false);

  // Form state
  const [budgetName, setBudgetName]       = useState('');
  const [budgetAmount, setBudgetAmount]   = useState('');
  const [budgetCategory, setBudgetCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [isCustom, setIsCustom]           = useState(false);
  const [durationType, setDurationType]   = useState('days');
  const [startDate, setStartDate]         = useState('');
  const [endDate, setEndDate]             = useState('');
  const [numDays, setNumDays]             = useState('');
  const [saving, setSaving]               = useState(false);
  const [formError, setFormError]         = useState('');

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }

      const qTx = query(collection(db, 'TRANSACTIONS'), where('user_id', '==', user.uid));
      const unsubTx = onSnapshot(qTx, (snapshot) => {
        const docs = [];
        let balance = 0;
        snapshot.forEach((d) => {
          const data = d.data();
          docs.push({ id: d.id, ...data });
          if (data.transaction_type === 'Income') balance += data.amount;
          else balance -= data.amount;
        });
        setTransactions(docs);
        setTotalBalance(balance);
      });

      const qBudgets = query(collection(db, 'BUDGETS'), where('user_id', '==', user.uid));
      const unsubBudgets = onSnapshot(qBudgets, (snapshot) => {
        const docs = [];
        snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
        setUserBudgets(docs.sort((a, b) => (b.created_at?.seconds ?? 0) - (a.created_at?.seconds ?? 0)));
        setLoading(false);
      });

      return () => { unsubTx(); unsubBudgets(); };
    });
    return () => unsubscribeAuth();
  }, []);

  const resetForm = () => {
    setBudgetName(''); setBudgetAmount(''); setBudgetCategory('');
    setCustomCategory(''); setIsCustom(false);
    setDurationType('days'); setStartDate(''); setEndDate('');
    setNumDays(''); setFormError('');
  };

  const finalCategory = isCustom ? customCategory.trim() : budgetCategory;

  const handleCreateBudget = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!finalCategory) { setFormError('Please pick or enter a category.'); return; }

    let start, end;
    if (durationType === 'days') {
      const days = parseInt(numDays);
      if (!days || days < 1) { setFormError('Enter a valid number of days (minimum 1).'); return; }
      start = new Date(); start.setHours(0, 0, 0, 0);
      end = new Date(start); end.setDate(end.getDate() + days - 1); end.setHours(23, 59, 59, 999);
    } else {
      if (!startDate || !endDate) { setFormError('Please pick a start and end date.'); return; }
      start = new Date(startDate); start.setHours(0, 0, 0, 0);
      end = new Date(endDate); end.setHours(23, 59, 59, 999);
      if (end < start) { setFormError('End date must be on or after start date.'); return; }
    }

    const limit = parseFloat(budgetAmount);
    if (!limit || limit <= 0) { setFormError('Enter a valid budget amount.'); return; }

    // Warn if a budget for the same category overlaps — but don't block
    const overlap = userBudgets.find(b => {
      if (b.category.toLowerCase() !== finalCategory.toLowerCase()) return false;
      const bStart = b.start_date?.seconds * 1000;
      const bEnd   = b.end_date?.seconds * 1000;
      return start.getTime() <= bEnd && end.getTime() >= bStart;
    });
    if (overlap) {
      setFormError(`You already have a "${finalCategory}" budget that overlaps this period. Only one active budget per category at a time is recommended.`);
      return;
    }

    try {
      setSaving(true);
      await addDoc(collection(db, 'BUDGETS'), {
        user_id: auth.currentUser.uid,
        title: budgetName.trim() || finalCategory,
        category: finalCategory,
        limit,
        start_date: start,
        end_date: end,
        created_at: serverTimestamp(),
      });
      resetForm();
      setIsCreating(false);
    } catch (err) {
      console.error('Error creating budget:', err);
      setFormError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteBudget = async (id) => {
    try { await deleteDoc(doc(db, 'BUDGETS', id)); }
    catch (err) { console.error('Error deleting budget:', err); }
  };

  const getDaysLeft = (endMillis) => {
    const now = Date.now();
    if (endMillis < now) return null;
    return Math.ceil((endMillis - now) / (1000 * 60 * 60 * 24));
  };

  const daysPreview = durationType === 'days' && numDays
    ? (() => {
        const days = parseInt(numDays);
        if (!days || days < 1) return null;
        const d = new Date(); d.setDate(d.getDate() + days - 1);
        return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
      })()
    : null;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans">
      <div className="w-full max-w-md bg-slate-50 sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-32">
        <div className="px-5 pt-14 relative z-10">

          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Link to="/" className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-transform">
                <ChevronLeft className="w-6 h-6 text-slate-900" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Budgets</h1>
                <p className="text-xs text-slate-400 font-medium">{userBudgets.length} budget{userBudgets.length !== 1 ? 's' : ''}</p>
              </div>
            </div>
            <button onClick={() => setIsCreating(true)}
              className="p-2.5 bg-slate-900 text-white rounded-full shadow-lg active:scale-95 transition-transform">
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* How it works banner */}
          <div className="bg-slate-900 rounded-2xl px-4 py-3.5 mb-6 flex items-start space-x-3">
            <span className="text-lg mt-0.5">💡</span>
            <p className="text-slate-300 text-[13px] leading-relaxed font-medium">
              Each budget tracks expenses in its category within the set period. Log a transaction under "Food" and it automatically counts toward your Food budget.
            </p>
          </div>

          {/* Empty state */}
          {userBudgets.length === 0 ? (
            <div className="bg-white rounded-[2rem] p-10 text-center border border-slate-100 shadow-sm mt-4">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-8 h-8 text-slate-400" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">No Budgets Yet</h3>
              <p className="text-slate-500 text-[15px] mb-6">
                Set a spending cap for any category over any period of time.
              </p>
              <button onClick={() => setIsCreating(true)}
                className="w-full py-4 bg-slate-900 text-white rounded-xl font-bold active:bg-slate-800 transition-colors">
                Create a Budget
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {userBudgets.map((b) => {
                const startMillis = b.start_date?.seconds * 1000;
                const endMillis   = b.end_date?.seconds * 1000;
                const meta        = getCategoryMeta(b.category);

                // KEY FIX: only count expenses that match this budget's category exactly
                const spent = transactions
                  .filter(t =>
                    t.transaction_type === 'Expense' &&
                    t.timestamp &&
                    t.category?.toLowerCase() === b.category?.toLowerCase() &&
                    t.timestamp.seconds * 1000 >= startMillis &&
                    t.timestamp.seconds * 1000 <= endMillis
                  )
                  .reduce((sum, t) => sum + t.amount, 0);

                const percent   = Math.min((spent / b.limit) * 100, 100);
                const isDanger  = percent >= 90;
                const isWarning = percent >= 70 && percent < 90;
                const barColor  = isDanger ? 'bg-rose-500' : isWarning ? 'bg-amber-400' : getBarColor(b.category);
                const daysLeft  = getDaysLeft(endMillis);
                const isExpired = daysLeft === null;

                return (
                  <div key={b.id} className={`bg-white rounded-[1.5rem] p-5 shadow-sm border border-slate-100 relative overflow-hidden ${isExpired ? 'opacity-60' : ''}`}>

                    {isExpired && (
                      <div className="absolute top-3 right-3 bg-slate-100 text-slate-400 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full">
                        Expired
                      </div>
                    )}
                    {!isExpired && (
                      <div className={`absolute top-3 right-12 text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full ${daysLeft <= 2 ? 'bg-rose-50 text-rose-500' : 'bg-emerald-50 text-emerald-600'}`}>
                        {daysLeft}d left
                      </div>
                    )}

                    <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center space-x-3">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl border ${meta.color}`}>
                          {meta.emoji}
                        </div>
                        <div>
                          <h4 className="text-[17px] font-bold text-slate-900 tracking-tight">{b.title}</h4>
                          <p className="text-[12px] text-slate-400 font-medium mt-0.5">{b.category}</p>
                          <p className="text-[11px] text-slate-300 font-medium flex items-center space-x-1 mt-0.5">
                            <Calendar className="w-3 h-3" />
                            <span>
                              {new Date(startMillis).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} to {new Date(endMillis).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button onClick={() => handleDeleteBudget(b.id)}
                        className="p-1.5 text-slate-300 hover:text-rose-500 rounded-full transition-colors active:scale-95">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex justify-between items-end mb-2">
                      <p className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">Spent</p>
                      <p className={`text-[17px] font-bold tracking-tight ${isDanger ? 'text-rose-500' : 'text-slate-900'}`}>
                        ₵{spent.toFixed(2)} <span className="text-xs text-slate-400 font-medium">/ ₵{b.limit.toFixed(2)}</span>
                      </p>
                    </div>

                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden mb-2">
                      <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${percent}%` }} />
                    </div>

                    <div className="flex justify-between items-center">
                      <p className="text-[12px] text-slate-400 font-medium">{percent.toFixed(0)}% used</p>
                      <p className="text-[12px] font-bold text-slate-500">₵{Math.max(b.limit - spent, 0).toFixed(2)} remaining</p>
                    </div>

                    {isDanger && (
                      <p className="text-xs font-bold text-rose-500 mt-3 flex items-center space-x-1 animate-pulse">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Budget nearly exhausted!</span>
                      </p>
                    )}
                    {isWarning && !isDanger && (
                      <p className="text-xs font-bold text-amber-500 mt-3 flex items-center space-x-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Getting close, spend carefully.</span>
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* CREATE BUDGET MODAL */}
        {isCreating && (
          <div className="absolute inset-0 z-[60] flex items-end justify-center sm:rounded-[3rem] overflow-hidden">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => { setIsCreating(false); resetForm(); }} />
            <div className="relative w-full bg-white rounded-t-[2rem] p-6 pb-10 max-h-[94%] overflow-y-auto">

              <div className="flex justify-between items-center mb-1">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">New Budget</h3>
                <button onClick={() => { setIsCreating(false); resetForm(); }}
                  className="p-2 bg-slate-100 rounded-full text-slate-500 active:scale-95 transition-all">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <p className="text-slate-400 text-sm mb-5">Only expenses in the chosen category will count toward this budget.</p>

              {/* Balance pill */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 mb-5 flex justify-between items-center">
                <span className="text-slate-600 text-sm font-semibold">Current balance</span>
                <span className="text-slate-900 font-black text-lg">₵{totalBalance.toFixed(2)}</span>
              </div>

              <form onSubmit={handleCreateBudget} className="space-y-5">

                {/* Category picker */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">Category</label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    {PRESET_CATEGORIES.map(({ value, emoji }) => (
                      <button key={value} type="button"
                        onClick={() => { setBudgetCategory(value); setIsCustom(false); }}
                        className={`py-2 px-2 rounded-xl text-sm font-bold border transition-all flex items-center space-x-1.5 ${
                          !isCustom && budgetCategory === value
                            ? 'bg-slate-900 text-white border-slate-900'
                            : 'bg-slate-50 text-slate-700 border-slate-200'
                        }`}>
                        <span>{emoji}</span>
                        <span className="truncate">{value}</span>
                      </button>
                    ))}
                    <button type="button"
                      onClick={() => { setIsCustom(true); setBudgetCategory(''); }}
                      className={`py-2 px-2 rounded-xl text-sm font-bold border transition-all flex items-center space-x-1.5 ${
                        isCustom ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-700 border-slate-200'
                      }`}>
                      <span>✏️</span>
                      <span>Custom</span>
                    </button>
                  </div>
                  {isCustom && (
                    <input
                      type="text"
                      placeholder="e.g. Girlfriend Tax, Church Offering"
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold rounded-xl px-4 py-3 outline-none focus:border-slate-900"
                      autoFocus
                      required={isCustom}
                    />
                  )}
                </div>

                {/* Budget title (optional) */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">
                    Budget Name <span className="normal-case font-normal text-slate-300">(optional)</span>
                  </label>
                  <input
                    type="text"
                    placeholder={finalCategory ? `e.g. ${finalCategory} this week` : 'Give it a name'}
                    value={budgetName}
                    onChange={(e) => setBudgetName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold rounded-xl px-4 py-3 outline-none focus:border-slate-900"
                  />
                </div>

                {/* Spend limit */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Spend Limit (₵)</label>
                  <input
                    type="number" step="0.01" min="0.01" placeholder="0.00"
                    value={budgetAmount} onChange={(e) => setBudgetAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold rounded-xl px-4 py-3 outline-none focus:border-slate-900"
                    required
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5 block">Duration</label>
                  <div className="flex bg-slate-100 rounded-xl p-1 mb-3">
                    {[['days', 'Number of Days'], ['range', 'Pick Dates']].map(([val, label]) => (
                      <button key={val} type="button" onClick={() => setDurationType(val)}
                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${durationType === val ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}>
                        {label}
                      </button>
                    ))}
                  </div>

                  {durationType === 'days' ? (
                    <div>
                      <input
                        type="number" min="1" max="365" placeholder="e.g. 3"
                        value={numDays} onChange={(e) => setNumDays(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base font-bold rounded-xl px-4 py-3 outline-none focus:border-slate-900"
                        required={durationType === 'days'}
                      />
                      {daysPreview && (
                        <p className="text-xs text-slate-500 font-semibold mt-1.5 pl-1">
                          Starts today, ends {daysPreview}
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {[['Start', 'startDate', startDate, setStartDate, ''], ['End', 'endDate', endDate, setEndDate, startDate]].map(([label, key, val, setter, minVal]) => (
                        <div key={key}>
                          <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1 block">{label}</label>
                          <input type="date" value={val} min={minVal || undefined}
                            onChange={(e) => setter(e.target.value)}
                            className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-xl px-3 py-3 outline-none focus:border-slate-900"
                            required={durationType === 'range'}
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {formError && (
                  <p className="text-sm font-semibold text-rose-500 flex items-start space-x-1.5">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{formError}</span>
                  </p>
                )}

                <button type="submit" disabled={saving}
                  className="w-full py-4 rounded-xl bg-slate-900 text-white font-bold text-[17px] transition-colors disabled:opacity-60 flex items-center justify-center">
                  {saving
                    ? <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    : <span>Save Budget</span>
                  }
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Buckets;