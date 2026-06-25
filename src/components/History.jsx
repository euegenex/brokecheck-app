import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, Home, LayoutList } from 'lucide-react';

function History() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // This state controls which "Sheet" the user is looking at (defaults to today)
  const [viewDate, setViewDate] = useState(new Date());

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

  // --- LOGBOOK ENGINE: Filter transactions for the selected day ---
  const dailyTransactions = transactions.filter(t => {
    if (!t.timestamp) return false;
    const tDate = new Date(t.timestamp.seconds * 1000);
    return tDate.toDateString() === viewDate.toDateString();
  });

  // Calculate the total spent/earned on this specific sheet
  const dayIncome = dailyTransactions.filter(t => t.transaction_type === 'Income').reduce((a, b) => a + b.amount, 0);
  const dayExpense = dailyTransactions.filter(t => t.transaction_type === 'Expense').reduce((a, b) => a + b.amount, 0);

  // Time Travel Functions
  const goToPreviousDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() - 1);
    setViewDate(newDate);
  };

  const goToNextDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(viewDate.getDate() + 1);
    setViewDate(newDate);
  };

  // Format the date header (e.g., "Mon, Jun 24")
  const dateLabel = viewDate.toDateString() === new Date().toDateString() 
    ? "Today" 
    : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Header */}
      <div className="bg-white px-6 py-5 shadow-sm border-b border-slate-100">
        <h1 className="text-xl font-black text-slate-900 tracking-tight text-center">Ledger</h1>
      </div>

      <div className="max-w-md w-full mx-auto px-4 mt-6 space-y-6">
        
        {/* The Logbook Date Controller */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 flex items-center justify-between p-4">
          <button onClick={goToPreviousDay} className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600">
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <div className="text-center">
            <h2 className="text-lg font-bold text-slate-800">{dateLabel}</h2>
            <p className="text-xs font-semibold text-slate-400">Daily Sheet</p>
          </div>

          <button 
            onClick={goToNextDay} 
            disabled={viewDate.toDateString() === new Date().toDateString()}
            className="p-2 bg-slate-50 rounded-full hover:bg-slate-100 text-slate-600 disabled:opacity-30 disabled:hover:bg-slate-50"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>

        {/* Daily Summary Card */}
        <div className="bg-slate-900 rounded-2xl p-5 shadow-md text-white flex justify-between items-center">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Spent</p>
            <p className="text-2xl font-black text-red-400">₵ {dayExpense.toFixed(2)}</p>
          </div>
          <div className="text-right">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-1">Total Earned</p>
            <p className="text-xl font-bold text-green-400">₵ {dayIncome.toFixed(2)}</p>
          </div>
        </div>

        {/* The Transactions for this Specific Day */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden">
          {dailyTransactions.length > 0 ? (
            dailyTransactions.map((t) => (
              <div key={t.id} className="flex justify-between items-center p-4 border-b border-slate-50 last:border-0">
                <div>
                  <p className="text-sm font-bold text-slate-800">{t.category}</p>
                  <p className="text-xs font-medium text-slate-400">{t.payment_method}</p>
                </div>
                <p className={`text-sm font-bold ${t.transaction_type === 'Income' ? 'text-green-600' : 'text-slate-900'}`}>
                  {t.transaction_type === 'Income' ? '+' : '-'} ₵{t.amount.toFixed(2)}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="text-sm font-medium text-slate-400">No transactions recorded on this date.</p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 pb-safe pt-2 px-6 flex justify-around items-center h-16 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)]">
        <Link to="/" className="flex flex-col items-center text-slate-400 hover:text-slate-900 transition-colors">
          <Home className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">Home</span>
        </Link>
        <Link to="/history" className="flex flex-col items-center text-slate-900 transition-colors">
          <LayoutList className="w-6 h-6 mb-1" />
          <span className="text-[10px] font-bold">History</span>
        </Link>
      </div>
    </div>
  );
}

export default History;