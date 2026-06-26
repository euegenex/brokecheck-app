import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, query, where, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';
import { PRESET_CATEGORIES } from './Buckets';

function NewTransaction() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'Expense';

  const [type, setType]                 = useState(initialType);
  const [amount, setAmount]             = useState('');
  const [category, setCategory]         = useState('');
  const [isCustom, setIsCustom]         = useState(false);
  const [customCategory, setCustomCategory] = useState('');
  const [note, setNote]                 = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Live budgets for the budget indicator
  const [activeBudgets, setActiveBudgets]         = useState([]);
  const [budgetTransactions, setBudgetTransactions] = useState([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) return;

      const qBudgets = query(collection(db, 'BUDGETS'), where('user_id', '==', user.uid));
      const unsubBudgets = onSnapshot(qBudgets, (snap) => {
        const now = Date.now();
        const docs = [];
        snap.forEach(d => {
          const data = { id: d.id, ...d.data() };
          const endMs = data.end_date?.seconds * 1000;
          if (endMs >= now) docs.push(data); // only active (not expired)
        });
        setActiveBudgets(docs);
      });

      const qTx = query(collection(db, 'TRANSACTIONS'), where('user_id', '==', user.uid));
      const unsubTx = onSnapshot(qTx, (snap) => {
        const docs = [];
        snap.forEach(d => docs.push({ id: d.id, ...d.data() }));
        setBudgetTransactions(docs);
      });

      return () => { unsubBudgets(); unsubTx(); };
    });
    return () => unsubAuth();
  }, []);

  const finalCategory = isCustom ? customCategory.trim() : category;

  // Find a matching active budget for the selected category
  const matchedBudget = type === 'Expense' && finalCategory
    ? activeBudgets.find(b => b.category?.toLowerCase() === finalCategory.toLowerCase())
    : null;

  const budgetSpent = matchedBudget
    ? budgetTransactions
        .filter(t =>
          t.transaction_type === 'Expense' &&
          t.category?.toLowerCase() === matchedBudget.category?.toLowerCase() &&
          t.timestamp &&
          t.timestamp.seconds * 1000 >= matchedBudget.start_date?.seconds * 1000 &&
          t.timestamp.seconds * 1000 <= matchedBudget.end_date?.seconds * 1000
        )
        .reduce((sum, t) => sum + t.amount, 0)
    : 0;

  const budgetRemaining   = matchedBudget ? matchedBudget.limit - budgetSpent : 0;
  const budgetPercent     = matchedBudget ? Math.min((budgetSpent / matchedBudget.limit) * 100, 100) : 0;
  const wouldExceed       = matchedBudget && parseFloat(amount) > budgetRemaining;
  const budgetIsDanger    = budgetPercent >= 90;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!finalCategory) return;

    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'TRANSACTIONS'), {
        user_id: auth.currentUser.uid,
        transaction_type: type,
        amount: parseFloat(amount),
        category: finalCategory,
        note: note.trim(),
        payment_method: paymentMethod,
        timestamp: serverTimestamp(),
      });
      navigate('/');
    } catch (error) {
      console.error('Error adding document:', error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative flex flex-col">

        {/* Header */}
        <div className="bg-white px-5 pt-14 pb-4 shadow-sm z-10 sticky top-0 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-[#007AFF] hover:opacity-70 transition-opacity">
            <ChevronLeft className="w-6 h-6 -ml-2" />
            <span className="text-[17px]">Back</span>
          </button>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Add Record</h1>
          <div className="w-12" />
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-5 pt-6 pb-32 space-y-5">

          {/* Type toggle */}
          <div className="bg-[#E5E5EA] p-1 rounded-[10px] flex">
            {['Expense', 'Income'].map((t) => (
              <button key={t} type="button" onClick={() => setType(t)}
                className={`flex-1 py-1.5 text-[14px] font-semibold rounded-md transition-all ${type === t ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93]'}`}>
                {t}
              </button>
            ))}
          </div>

          {/* Amount */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/[0.02] text-center">
            <p className="text-[#8E8E93] text-[13px] font-bold uppercase tracking-wider mb-2">Amount</p>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-3xl font-semibold text-[#8E8E93]">₵</span>
              <input
                type="number" step="0.01" value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`text-5xl font-bold bg-transparent w-40 text-center outline-none ${type === 'Expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}
                required autoFocus
              />
            </div>
          </div>

          {/* Category — mandatory */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/[0.02] p-4">
            <p className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3">Category</p>
            <div className="grid grid-cols-3 gap-2">
              {PRESET_CATEGORIES.map(({ value, emoji }) => (
                <button key={value} type="button"
                  onClick={() => { setCategory(value); setIsCustom(false); }}
                  className={`py-2 px-2 rounded-xl text-[13px] font-bold border transition-all flex items-center space-x-1.5 ${
                    !isCustom && category === value
                      ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]'
                      : 'bg-[#F2F2F7] text-[#1C1C1E] border-transparent'
                  }`}>
                  <span>{emoji}</span>
                  <span className="truncate">{value}</span>
                </button>
              ))}
              <button type="button"
                onClick={() => { setIsCustom(true); setCategory(''); }}
                className={`py-2 px-2 rounded-xl text-[13px] font-bold border transition-all flex items-center space-x-1.5 ${
                  isCustom ? 'bg-[#1C1C1E] text-white border-[#1C1C1E]' : 'bg-[#F2F2F7] text-[#1C1C1E] border-transparent'
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
                className="mt-3 w-full bg-[#F2F2F7] text-[#1C1C1E] text-[15px] font-semibold rounded-xl px-4 py-3 outline-none"
                autoFocus
                required={isCustom}
              />
            )}
          </div>

          {/* Budget indicator — shows only when a matching active budget exists */}
          {matchedBudget && (
            <div className={`rounded-2xl px-4 py-3.5 border ${budgetIsDanger || wouldExceed ? 'bg-rose-50 border-rose-100' : 'bg-slate-50 border-slate-200'}`}>
              <div className="flex justify-between items-center mb-2">
                <p className={`text-[13px] font-bold ${budgetIsDanger || wouldExceed ? 'text-rose-600' : 'text-slate-600'}`}>
                  {matchedBudget.title || matchedBudget.category} budget
                </p>
                <p className={`text-[13px] font-black ${budgetIsDanger || wouldExceed ? 'text-rose-500' : 'text-slate-900'}`}>
                  ₵{budgetRemaining.toFixed(2)} left
                </p>
              </div>
              <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${budgetIsDanger ? 'bg-rose-500' : 'bg-slate-900'}`}
                  style={{ width: `${budgetPercent}%` }}
                />
              </div>
              {wouldExceed && (
                <p className="text-[12px] font-semibold text-rose-500 mt-2">
                  This will exceed your {matchedBudget.category} budget by ₵{(parseFloat(amount) - budgetRemaining).toFixed(2)}.
                </p>
              )}
            </div>
          )}

          {/* Note + Payment method */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/[0.02] overflow-hidden">
            <div className="p-4 px-5 flex items-start justify-between relative">
              <label className="text-[17px] font-semibold text-[#1C1C1E] whitespace-nowrap mr-4 pt-0.5">Note</label>
              <textarea
                value={note} onChange={(e) => setNote(e.target.value)}
                placeholder="Optional: what was this for?"
                rows={2}
                className="text-[15px] text-[#8E8E93] text-right outline-none w-full bg-transparent resize-none leading-snug"
              />
              <div className="absolute bottom-0 left-5 right-0 h-[1px] bg-[#E5E5EA]" />
            </div>
            <div className="p-4 px-5 flex items-center justify-between">
              <label className="text-[17px] font-semibold text-[#1C1C1E] whitespace-nowrap mr-4">Account</label>
              <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-[17px] text-[#8E8E93] text-right outline-none bg-transparent appearance-none">
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {/* Submit */}
          <button type="submit" disabled={isSubmitting || !finalCategory}
            className="w-full bg-[#1C1C1E] active:bg-[#3A3A3C] text-white rounded-2xl py-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-40">
            {isSubmitting
              ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              : <>
                  <CheckCircle2 className="w-5 h-5" />
                  <span className="text-[17px] font-bold">Save Transaction</span>
                </>
            }
          </button>

        </form>
      </div>
    </div>
  );
}

export default NewTransaction;