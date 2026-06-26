import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft } from 'lucide-react';

function History() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());

  useEffect(() => {
    // Auth-safe: wait for confirmed auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (!user) { setLoading(false); return; }

      const q = query(
        collection(db, 'TRANSACTIONS'),
        where('user_id', '==', user.uid)
      );

      const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
        const docs = [];
        snapshot.forEach((d) => docs.push({ id: d.id, ...d.data() }));
        // Sort newest first
        docs.sort((a, b) => (b.timestamp?.seconds ?? 0) - (a.timestamp?.seconds ?? 0));
        setTransactions(docs);
        setLoading(false);
      });

      return () => unsubscribeSnapshot();
    });

    return () => unsubscribeAuth();
  }, []);

  const dailyTransactions = transactions.filter(t => {
    if (!t.timestamp) return false;
    return new Date(t.timestamp.seconds * 1000).toDateString() === viewDate.toDateString();
  });

  const dayIncome  = dailyTransactions.filter(t => t.transaction_type === 'Income').reduce((a, b) => a + b.amount, 0);
  const dayExpense = dailyTransactions.filter(t => t.transaction_type === 'Expense').reduce((a, b) => a + b.amount, 0);

  const isToday = viewDate.toDateString() === new Date().toDateString();

  const goToPreviousDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() - 1);
    setViewDate(d);
  };

  const goToNextDay = () => {
    const d = new Date(viewDate);
    d.setDate(d.getDate() + 1);
    setViewDate(d);
  };

  const dateLabel = isToday
    ? 'Today'
    : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-slate-50 sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-32">

        <div className="px-5 pt-14">

          {/* Header with back button */}
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center space-x-3">
              <Link to="/" className="p-2 bg-white rounded-full shadow-sm active:scale-95 transition-transform">
                <ChevronLeft className="w-6 h-6 text-slate-900" />
              </Link>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Ledger</h1>
                <p className="text-xs text-slate-400 font-medium">{transactions.length} total records</p>
              </div>
            </div>
          </div>

          {/* Date navigator */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between px-4 py-3.5 mb-5">
            <button onClick={goToPreviousDay} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 active:scale-95 transition-all">
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="text-center">
              <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">{dateLabel}</h2>
              <p className="text-xs font-semibold text-slate-400">
                {viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={goToNextDay}
              disabled={isToday}
              className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:cursor-default active:scale-95 transition-all"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          {/* Daily summary */}
          <div className="bg-slate-900 rounded-[2rem] px-6 py-5 mb-5 flex justify-between items-center shadow-xl shadow-slate-900/20">
            <div>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Spent</p>
              <p className="text-2xl font-black text-rose-400 tracking-tight">₵{dayExpense.toFixed(2)}</p>
            </div>
            <div className="h-10 w-px bg-white/10" />
            <div className="text-right">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Earned</p>
              <p className="text-2xl font-black text-emerald-400 tracking-tight">₵{dayIncome.toFixed(2)}</p>
            </div>
          </div>

          {/* Transactions list */}
          <div className="bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden">
            {dailyTransactions.length > 0 ? (
              <div className="flex flex-col">
                {dailyTransactions.map((t, index) => {
                  const isIncome = t.transaction_type === 'Income';
                  const timeStr  = t.timestamp
                    ? new Date(t.timestamp.seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                    : '';
                  return (
                    <div key={t.id} className="relative">
                      <div className="flex items-center justify-between px-5 py-4">
                        <div className="flex items-center space-x-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border border-white ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                            {isIncome
                              ? <ArrowDownLeft className="w-5 h-5" strokeWidth={3} />
                              : <ArrowUpRight  className="w-5 h-5" strokeWidth={3} />}
                          </div>
                          <div>
                            <p className="text-[16px] font-bold text-slate-900 tracking-tight">{t.category}</p>
                            <p className="text-[13px] text-slate-400 font-medium">{timeStr}{t.payment_method ? ` · ${t.payment_method}` : ''}</p>
                            {t.note ? (
                              <p className="text-[12px] text-slate-400 italic mt-0.5">"{t.note}"</p>
                            ) : null}
                          </div>
                        </div>
                        <p className={`text-[16px] font-bold tracking-tight ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                          {isIncome ? '+' : '-'}₵{t.amount.toFixed(2)}
                        </p>
                      </div>
                      {index < dailyTransactions.length - 1 && (
                        <div className="absolute bottom-0 left-[4.5rem] right-0 h-px bg-slate-100" />
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-14">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-slate-100">
                  <div className="w-6 h-1 bg-slate-300 rounded-full" />
                </div>
                <p className="text-slate-400 font-medium text-[15px]">No transactions on this day.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default History;