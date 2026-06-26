import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, deleteDoc, updateDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { db, auth } from '../firebase';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight, ArrowDownLeft, Plus, X, Check, PieChart} from 'lucide-react';

function Dashboard() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewDate, setViewDate] = useState(new Date());
  
  // Modal States
  const [selectedTx, setSelectedTx] = useState(null);
  const [editingTx, setEditingTx] = useState(null);
  
  // Edit Form States
  const [editCategory, setEditCategory] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editNote, setEditNote] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [userName, setUserName] = useState('User');

  // --- DYNAMIC GREETING LOGIC ---
  const currentHour = new Date().getHours();
  const greeting = currentHour < 12 ? 'Good morning' 
                 : currentHour < 18 ? 'Good afternoon' 
                 : 'Good evening';

  useEffect(() => {
    // 1. Wait for Firebase to confirm the user is logged in
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      if (user) {
        // --- SMARTER NAME SETTING ---
        if (user.displayName) {
          setUserName(user.displayName.split(' ')[0]);
        } else if (user.email) {
          // Premium Fallback: Grab the name from the email and capitalize it
          const emailName = user.email.split('@')[0];
          setUserName(emailName.charAt(0).toUpperCase() + emailName.slice(1));
        }
        
        // 2. ONLY run the database query if the user exists
        const q = query(
          collection(db, 'TRANSACTIONS'),
          where('user_id', '==', user.uid)
        );

        const unsubscribeSnapshot = onSnapshot(q, (snapshot) => {
          const docs = [];
          snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
          setTransactions(docs);
          setLoading(false);
        });

        return () => unsubscribeSnapshot();
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // --- DELETE LOGIC ---
  const handleDelete = async (id) => {
    try {
      await deleteDoc(doc(db, 'TRANSACTIONS', id));
      setSelectedTx(null);
      setConfirmingDelete(false);
    } catch (error) {
      console.error("Error deleting document: ", error);
    }
  };

  // --- EDIT LOGIC ---
  const openEditModal = () => {
    setEditCategory(selectedTx.category);
    setEditAmount(selectedTx.amount);
    setEditNote(selectedTx.note || '');
    setEditingTx(selectedTx);
    setSelectedTx(null);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editCategory || !editAmount) return;

    try {
      const txRef = doc(db, 'TRANSACTIONS', editingTx.id);
      await updateDoc(txRef, {
        category: editCategory,
        amount: parseFloat(editAmount),
        note: editNote.trim(),
      });
      setEditingTx(null);
    } catch (error) {
      console.error("Error updating document: ", error);
    }
  };

  // --- WEALTH CALCULATION ---
  const totalBalance = transactions.reduce((acc, t) => {
    return t.transaction_type === 'Income' ? acc + t.amount : acc - t.amount;
  }, 0);

  // --- TIME TRAVEL & DAILY FILTERING ---
  const handlePrevDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() - 1);
    setViewDate(newDate);
  };

  const handleNextDay = () => {
    const newDate = new Date(viewDate);
    newDate.setDate(newDate.getDate() + 1);
    setViewDate(newDate);
  };

  const isToday = viewDate.toDateString() === new Date().toDateString();

  const dailyTransactions = transactions
    .filter(t => t.timestamp && new Date(t.timestamp.seconds * 1000).toDateString() === viewDate.toDateString())
    .sort((a, b) => b.timestamp.seconds - a.timestamp.seconds);

  const daySpent = dailyTransactions.filter(t => t.transaction_type === 'Expense').reduce((a, b) => a + b.amount, 0);
  const dayEarned = dailyTransactions.filter(t => t.transaction_type === 'Income').reduce((a, b) => a + b.amount, 0);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-gradient-to-b from-indigo-50 via-slate-50 to-white sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-32">
        
        <div className="px-5 pt-14 relative z-10">
          
          <div className="mb-6 px-1">
            <p className="text-indigo-900/50 text-xs font-bold uppercase tracking-widest mb-1">{greeting}</p>
            <h1 className="text-3xl font-bold text-slate-900 tracking-tight">
              {userName}
            </h1>
          </div>

          <div className="bg-white rounded-[2rem] p-7 shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-white mb-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50 rounded-full blur-3xl -translate-y-10 translate-x-10"></div>
            <div className="relative z-10">
              <div className="flex justify-between items-center mb-4">
                <div className="h-10 w-10 bg-slate-50 rounded-full flex items-center justify-center">
                  <span className="text-slate-900 font-bold text-lg">₵</span>
                </div>
                <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
                  Active Vault
                </span>
              </div>
              <p className="text-slate-500 text-sm font-medium mb-1">Total Balance</p>
              <h2 className="text-[2.75rem] leading-none font-black text-slate-900 tracking-tighter">
                {totalBalance.toFixed(2)}
              </h2>
            </div>
          </div>

          {/* Create & Track Budget Button */}
          <Link to="/buckets" className="w-full bg-indigo-50/50 hover:bg-indigo-50 border border-indigo-100 text-indigo-600 rounded-[1.5rem] py-4 flex items-center justify-center space-x-2 font-bold mb-4 active:scale-95 transition-all">
            <PieChart className="w-5 h-5" />
            <span>Create a Budget!</span>
          </Link>

          {/* Streak mini-widget */}
          {(() => {
            const expensesByDate = {};
            transactions.forEach(t => {
              if (t.transaction_type === 'Expense' && t.timestamp) {
                const ds = new Date(t.timestamp.seconds * 1000).toDateString();
                expensesByDate[ds] = (expensesByDate[ds] || 0) + t.amount;
              }
            });
            const allDays = Object.keys(expensesByDate).map(s => new Date(s)).sort((a, b) => b - a);
            let streak = 0;
            const DAILY_LIMIT = 50;
            for (const day of allDays) {
              if (expensesByDate[day.toDateString()] <= DAILY_LIMIT) streak++;
              else break;
            }
            const todaySpent = expensesByDate[new Date().toDateString()] || 0;
            const remaining  = DAILY_LIMIT - todaySpent;
            return (
              <Link to="/streak" className="w-full bg-white border border-slate-100 rounded-[1.5rem] px-5 py-4 flex items-center justify-between mb-8 active:scale-95 transition-all shadow-sm">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">🔥</span>
                  <div>
                    <p className="text-[15px] font-bold text-slate-900">{streak} day streak</p>
                    <p className="text-[12px] text-slate-400 font-medium">
                      {remaining >= 0 ? `₵${remaining.toFixed(0)} left today` : `₵${Math.abs(remaining).toFixed(0)} over limit`}
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300" />
              </Link>
            );
          })()}

          <div className="flex items-center justify-between px-2 mb-4">
            <button onClick={handlePrevDay} className="p-2 -ml-2 text-indigo-600 hover:bg-indigo-50 rounded-full transition-colors active:scale-95">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-[17px] font-bold text-slate-900 tracking-tight">
              {isToday ? 'Today' : viewDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </h2>
            <button onClick={handleNextDay} disabled={isToday} className={`p-2 -mr-2 rounded-full transition-all ${isToday ? 'text-slate-300 cursor-default' : 'text-indigo-600 hover:bg-indigo-50 active:scale-95'}`}>
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_-10px_rgba(0,0,0,0.08)] border border-white overflow-hidden mb-8">
            {dailyTransactions.length > 0 ? (
              <div className="flex flex-col">
                {dailyTransactions.map((t, index) => {
                  const timeStr = new Date(t.timestamp.seconds * 1000).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
                  const isIncome = t.transaction_type === 'Income';

                  return (
                    <div key={t.id} className="relative">
                      <div onClick={() => setSelectedTx(t)} className="flex items-center justify-between p-4 px-5 active:bg-slate-50 transition-colors cursor-pointer">
                        <div className="flex items-center space-x-4">
                          <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-sm border border-white ${isIncome ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-500'}`}>
                            {isIncome ? <ArrowDownLeft className="w-5 h-5" strokeWidth={3} /> : <ArrowUpRight className="w-5 h-5" strokeWidth={3} />}
                          </div>
                          <div>
                            <p className="text-[17px] font-bold text-slate-900 tracking-tight mb-0.5">{t.category}</p>
                            <p className="text-[13px] text-slate-500 font-medium">{timeStr} • {t.payment_method}</p>
                            {t.note ? <p className="text-[12px] text-slate-400 italic mt-0.5">"{t.note}"</p> : null}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`text-[17px] font-bold tracking-tight ${isIncome ? 'text-emerald-600' : 'text-slate-900'}`}>
                            {isIncome ? '+' : '-'}₵{t.amount.toFixed(2)}
                          </p>
                        </div>
                      </div>
                      {index !== dailyTransactions.length - 1 && (
                        <div className="absolute bottom-0 left-[4.5rem] right-0 h-[1px] bg-slate-100"></div>
                      )}
                    </div>
                  );
                })}
                
                <div className="bg-slate-50/50 px-5 py-3.5 flex justify-between items-center border-t border-slate-100">
                  <span className="text-[13px] font-bold text-slate-400 uppercase tracking-wider">Day Summary</span>
                  <div className="text-[14px] font-bold">
                    <span className="text-emerald-600">In: ₵{dayEarned.toFixed(2)}</span>
                    <span className="mx-2 text-slate-300">|</span>
                    <span className="text-rose-500">Out: ₵{daySpent.toFixed(2)}</span>
                  </div>
                </div>

              </div>
            ) : (
              <div className="p-10 text-center flex flex-col items-center justify-center">
                <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3 border border-slate-100">
                  <div className="w-6 h-1 bg-slate-300 rounded-full"></div>
                </div>
                <p className="text-slate-500 font-medium text-[15px]">No transactions on this day.</p>
              </div>
            )}
          </div>

          <div className="flex space-x-3">
            <Link to="/new?type=Expense" className="flex-1 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 rounded-2xl py-3.5 flex items-center justify-center space-x-2 transition-colors border border-rose-100">
              <span className="text-[15px] font-bold tracking-tight">Expense</span>
            </Link>
            <Link to="/new?type=Income" className="flex-1 bg-slate-900 active:bg-slate-800 text-white rounded-2xl py-3.5 flex items-center justify-center space-x-2 transition-colors shadow-xl shadow-slate-900/20 border border-slate-800">
              <Plus className="w-5 h-5" strokeWidth={3} />
              <span className="text-[15px] font-bold tracking-tight">Income</span>
            </Link>
          </div>

        </div>

        {selectedTx && (
          <div className="absolute inset-0 z-50 flex items-end justify-center sm:rounded-[2rem] overflow-hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedTx(null)}></div>
            <div className="relative w-full px-4 pb-8 animate-slide-up">
              <div className="bg-white/90 backdrop-blur-xl rounded-2xl mb-2 overflow-hidden shadow-lg border border-white/20">
                <div className="px-4 py-4 border-b border-slate-200 text-center">
                  <p className="text-[13px] font-medium text-slate-500">
                    {selectedTx.category} • ₵{selectedTx.amount.toFixed(2)}
                  </p>
                </div>
                <button 
                  onClick={openEditModal}
                  className="w-full py-4 border-b border-slate-200 text-[17px] font-semibold text-indigo-600 active:bg-slate-100 transition-colors"
                >
                  Edit Transaction
                </button>
                <button 
                  onClick={() => {
                    if (confirmingDelete) {
                      handleDelete(selectedTx.id);
                    } else {
                      setConfirmingDelete(true);
                    }
                  }}
                  className={`w-full py-4 text-[17px] font-semibold transition-colors active:opacity-70 ${confirmingDelete ? 'bg-rose-500 text-white' : 'text-rose-500 active:bg-slate-100'}`}
                >
                  {confirmingDelete ? '⚠️ Tap again to confirm delete' : 'Delete Transaction'}
                </button>
              </div>
              <button onClick={() => { setSelectedTx(null); setConfirmingDelete(false); }} className="w-full py-4 bg-white/90 backdrop-blur-xl rounded-2xl text-[17px] font-bold text-slate-900 active:bg-slate-100 transition-colors shadow-lg border border-white/20">
                Cancel
              </button>
            </div>
          </div>
        )}

        {editingTx && (
          <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 sm:rounded-[2rem] overflow-hidden">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setEditingTx(null)}></div>
            <div className="bg-white rounded-[2rem] w-full max-w-sm p-6 relative z-10 shadow-2xl animate-fade-in border border-slate-100">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-slate-900">Edit Record</h3>
                <button onClick={() => setEditingTx(null)} className="p-2 bg-slate-50 rounded-full text-slate-400 hover:text-slate-900">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Title</label>
                  <input 
                    type="text" 
                    value={editCategory} 
                    onChange={(e) => setEditCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-lg font-bold rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Amount (₵)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    value={editAmount} 
                    onChange={(e) => setEditAmount(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-lg font-bold rounded-xl px-4 py-3 outline-none focus:border-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Note</label>
                  <textarea
                    value={editNote}
                    onChange={(e) => setEditNote(e.target.value)}
                    placeholder="Optional — what was this for?"
                    rows={2}
                    className="w-full bg-slate-50 border border-slate-200 text-slate-900 text-base rounded-xl px-4 py-3 outline-none focus:border-indigo-500 resize-none leading-snug"
                  />
                </div>
                <button type="submit" className="w-full py-4 mt-2 rounded-xl bg-indigo-600 text-white font-bold flex items-center justify-center space-x-2 hover:bg-indigo-700 transition-colors">
                  <Check className="w-5 h-5" />
                  <span>Update</span>
                </button>
              </form>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

export default Dashboard;