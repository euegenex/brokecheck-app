import React, { useState } from 'react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';

function NewTransaction() {
  const [type, setType] = useState('Expense');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Food');
  const [paymentMethod, setPaymentMethod] = useState('MoMo');
  const [status, setStatus] = useState({ loading: false, success: false, error: '' });
  const navigate = useNavigate();

  const categories = type === 'Expense' 
    ? ['Food', 'Transport', 'Airtime', 'Academic', 'Other']
    : ['Allowance', 'Salary', 'Gift', 'Other'];

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || isNaN(amount)) return setStatus({ ...status, error: 'Please enter a valid amount' });

    setStatus({ loading: true, success: false, error: '' });

    try {
      await addDoc(collection(db, 'TRANSACTIONS'), {
        user_id: auth.currentUser.uid,
        transaction_type: type,
        amount: parseFloat(amount),
        category: category,
        payment_method: paymentMethod,
        timestamp: serverTimestamp()
      });

      setStatus({ loading: false, success: true, error: '' });
      
      // Auto-redirect back to dashboard after 1.5 seconds
      setTimeout(() => navigate('/'), 1500);
      
    } catch (err) {
      setStatus({ loading: false, success: false, error: 'Failed to save transaction.' });
    }
  };

  if (status.success) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 p-4">
        <div className="flex flex-col items-center p-8 bg-white rounded-2xl shadow-sm border border-slate-100">
          <CheckCircle2 className="w-16 h-16 text-green-500 mb-4" />
          <h2 className="text-xl font-bold text-slate-800">Transaction Saved</h2>
          <p className="text-sm text-slate-500 mt-2">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-8">
      {/* Mobile Header */}
      <div className="bg-white px-4 py-4 shadow-sm border-b border-slate-100 flex items-center mb-6">
        <Link to="/" className="text-slate-500 hover:text-slate-900 transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </Link>
        <h1 className="flex-1 text-center text-lg font-bold text-slate-800 pr-6">New Log</h1>
      </div>

      <div className="max-w-md w-full mx-auto px-4">
        {status.error && (
          <div className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 border border-red-100">
            {status.error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 space-y-6">
          
          {/* Type Toggle */}
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => { setType('Expense'); setCategory('Food'); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${type === 'Expense' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => { setType('Income'); setCategory('Allowance'); }}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg transition-colors ${type === 'Income' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500'}`}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Amount (GHS)</label>
            <div className="relative">
              <span className="absolute left-4 top-3 text-slate-400 font-semibold">₵</span>
              <input
                type="number"
                step="0.01"
                required
                className="w-full rounded-xl border border-slate-200 pl-10 pr-4 py-3 text-lg font-bold text-slate-900 focus:border-slate-400 focus:outline-none"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          {/* Two-Column Grid for Dropdowns */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Category</label>
              <select 
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-slate-400 focus:outline-none bg-white"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-2">Method</label>
              <select 
                className="w-full rounded-xl border border-slate-200 px-3 py-3 text-sm focus:border-slate-400 focus:outline-none bg-white"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="MoMo">MoMo</option>
                <option value="Physical Cash">Physical Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
              </select>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={status.loading}
            className="w-full mt-4 rounded-xl bg-slate-900 py-4 text-sm font-bold text-white hover:bg-slate-800 transition-colors shadow-sm disabled:bg-slate-400"
          >
            {status.loading ? 'Saving...' : `Log ${type}`}
          </button>
        </form>
      </div>
    </div>
  );
}

export default NewTransaction;