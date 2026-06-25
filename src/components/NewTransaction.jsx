import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { ChevronLeft, CheckCircle2 } from 'lucide-react';

function NewTransaction() {
  const navigate = useNavigate();
  
  // 1. Instantly read the URL to see if they clicked Income or Expense
  const [searchParams] = useSearchParams();
  const initialType = searchParams.get('type') || 'Expense';

  // States
  const [type, setType] = useState(initialType);
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Mobile Money');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!amount || !category) return;
    
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, 'TRANSACTIONS'), {
        user_id: auth.currentUser.uid,
        transaction_type: type,
        amount: parseFloat(amount),
        category,
        payment_method: paymentMethod,
        timestamp: serverTimestamp()
      });
      // Route back to the home page smoothly
      navigate('/');
    } catch (error) {
      console.error("Error adding document: ", error);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative flex flex-col">
        
        {/* Header */}
        <div className="bg-white px-5 pt-14 pb-4 shadow-sm z-10 sticky top-0 flex items-center justify-between">
          <button onClick={() => navigate(-1)} className="flex items-center text-[#007AFF] hover:opacity-70 transition-opacity">
            <ChevronLeft className="w-6 h-6 -ml-2" />
            <span className="text-[17px]">Back</span>
          </button>
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Add Record</h1>
          <div className="w-12"></div> {/* Spacer for perfect centering */}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 px-5 pt-6 pb-32 space-y-6">
          
          {/* iOS Segmented Control for Type */}
          <div className="bg-[#E5E5EA] p-1 rounded-[10px] flex">
            <button
              type="button"
              onClick={() => setType('Expense')}
              className={`flex-1 py-1.5 text-[14px] font-semibold rounded-md transition-all ${type === 'Expense' ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93] hover:text-[#1C1C1E]'}`}
            >
              Expense
            </button>
            <button
              type="button"
              onClick={() => setType('Income')}
              className={`flex-1 py-1.5 text-[14px] font-semibold rounded-md transition-all ${type === 'Income' ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93] hover:text-[#1C1C1E]'}`}
            >
              Income
            </button>
          </div>

          {/* Amount Input */}
          <div className="bg-white rounded-2xl p-6 shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/[0.02] text-center">
            <p className="text-[#8E8E93] text-[13px] font-bold uppercase tracking-wider mb-2">Amount</p>
            <div className="flex items-center justify-center space-x-1">
              <span className="text-3xl font-semibold text-[#8E8E93]">₵</span>
              <input
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className={`text-5xl font-bold bg-transparent w-40 text-center outline-none ${type === 'Expense' ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}
                required
                autoFocus
              />
            </div>
          </div>

          {/* Details Grouped List */}
          <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.03)] border border-black/[0.02] overflow-hidden">
            
            {/* Category */}
            <div className="p-4 px-5 flex items-center justify-between relative">
              <label className="text-[17px] font-semibold text-[#1C1C1E] whitespace-nowrap mr-4">Title</label>
              <input
                type="text"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g. Lunch, Salary"
                className="text-[17px] text-[#8E8E93] text-right outline-none w-full bg-transparent"
                required
              />
              <div className="absolute bottom-0 left-5 right-0 h-[1px] bg-[#E5E5EA]"></div>
            </div>

            {/* Payment Method */}
            <div className="p-4 px-5 flex items-center justify-between">
              <label className="text-[17px] font-semibold text-[#1C1C1E] whitespace-nowrap mr-4">Account</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="text-[17px] text-[#8E8E93] text-right outline-none bg-transparent appearance-none"
              >
                <option value="Mobile Money">Mobile Money</option>
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
            
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1C1C1E] active:bg-[#3A3A3C] text-white rounded-2xl py-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-8"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-[17px] font-bold">Save Transaction</span>
              </>
            )}
          </button>
        </form>

      </div>
    </div>
  );
}

export default NewTransaction;