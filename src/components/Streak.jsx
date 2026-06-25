import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { Flame, Trophy, AlertTriangle, ShieldCheck, Target, Wallet } from 'lucide-react';

function Streak() {
  const [transactions, setTransactions] = useState([]);
  const [dailyLimit, setDailyLimit] = useState(50);
  const [minimumBalance, setMinimumBalance] = useState(100);
  const [loading, setLoading] = useState(true);

  const user = auth.currentUser;

  useEffect(() => {
    const fetchSettings = async () => {
      if (user) {
        const docRef = doc(db, 'USER_SETTINGS', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.daily_limit) setDailyLimit(data.daily_limit);
          if (data.minimum_balance) setMinimumBalance(data.minimum_balance);
        }
      }
    };
    fetchSettings();

    const q = query(
      collection(db, 'TRANSACTIONS'),
      where('user_id', '==', user?.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = [];
      snapshot.forEach((doc) => docs.push({ id: doc.id, ...doc.data() }));
      setTransactions(docs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- LAYER 1: DAILY STREAK CALCULATION ---
  const calculateStreak = () => {
    if (transactions.length === 0) return 0;

    const expensesByDate = {};
    transactions.forEach(t => {
      if (t.transaction_type === 'Expense' && t.timestamp) {
        const dateStr = new Date(t.timestamp.seconds * 1000).toDateString();
        expensesByDate[dateStr] = (expensesByDate[dateStr] || 0) + t.amount;
      }
    });

    let streak = 0;
    let checkDate = new Date();

    while (true) {
      const dateStr = checkDate.toDateString();
      const dailySpent = expensesByDate[dateStr] || 0;

      if (dailySpent <= dailyLimit) {
        streak++;
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
    return streak;
  };

  const currentStreak = calculateStreak();

  // --- LAYER 1: TODAY'S NUDGE LOGIC ---
  const todayStr = new Date().toDateString();
  const todaySpent = transactions
    .filter(t => t.transaction_type === 'Expense' && t.timestamp && new Date(t.timestamp.seconds * 1000).toDateString() === todayStr)
    .reduce((a, b) => a + b.amount, 0);

  const remainingBudget = dailyLimit - todaySpent;
  const isOverBudget = remainingBudget < 0;
  const isDangerZone = remainingBudget > 0 && remainingBudget <= (dailyLimit * 0.2);

  // --- LAYER 2: VAULT HEALTH (MINIMUM BALANCE) LOGIC ---
  const totalBalance = transactions.reduce((acc, t) => {
    return t.transaction_type === 'Income' ? acc + t.amount : acc - t.amount;
  }, 0);

  const vaultBuffer = totalBalance - minimumBalance;
  const isVaultDanger = totalBalance < minimumBalance;
  // Warning if you are within 20% of your minimum floor
  const isVaultWarning = vaultBuffer >= 0 && vaultBuffer <= (minimumBalance * 0.2); 
  
  // Visual fill calculation (caps at 100% when you have 1.5x your minimum)
  const healthFillPercentage = Math.min((totalBalance / (minimumBalance * 1.5)) * 100, 100);

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
          
          {/* Header */}
          <div className="mb-6 px-1 flex justify-between items-end">
            <div>
              <p className="text-[#8E8E93] text-xs font-bold uppercase tracking-widest mb-1">Discipline</p>
              <h1 className="text-3xl font-bold text-[#1C1C1E] tracking-tight">Gamification</h1>
            </div>
            <Target className="w-8 h-8 text-[#8E8E93] opacity-20" />
          </div>

          {/* 1. THE STREAK DISPLAY CARD */}
          <div className="bg-[#1C1C1E] rounded-[2rem] p-8 shadow-lg text-center relative overflow-hidden mb-8">
            <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-[#FF9500]/20 to-transparent"></div>
            <div className="relative z-10 flex flex-col items-center">
              <div className="bg-white/10 p-4 rounded-full backdrop-blur-md mb-4 shadow-[0_0_30px_rgba(255,149,0,0.3)]">
                <Flame className="w-12 h-12 text-[#FF9500] animate-pulse" />
              </div>
              <h2 className="text-[5rem] leading-none font-black text-white tracking-tighter mb-2">
                {currentStreak}
              </h2>
              <p className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-widest">Day Streak</p>
              <div className="mt-4 inline-block bg-white/10 px-4 py-1.5 rounded-full backdrop-blur-sm border border-white/5">
                <p className="text-xs text-white/80 font-medium">Under ₵{dailyLimit} limit</p>
              </div>
            </div>
          </div>

          {/* 2. REAL-TIME BEHAVIORAL NUDGE */}
          <div className={`rounded-[2rem] p-6 shadow-sm border mb-8 transition-colors duration-300 ${isOverBudget ? 'bg-[#FFEBEA] border-[#FF3B30]/10' : isDangerZone ? 'bg-[#FFF4E5] border-[#FF9500]/10' : 'bg-[#EBF9EE] border-[#34C759]/10'}`}>
            <div className="flex items-start space-x-4">
              <div className={`p-3 rounded-2xl ${isOverBudget ? 'bg-[#FF3B30]/10 text-[#FF3B30]' : isDangerZone ? 'bg-[#FF9500]/10 text-[#FF9500]' : 'bg-[#34C759]/10 text-[#34C759]'}`}>
                {isOverBudget ? <AlertTriangle className="w-6 h-6" /> : isDangerZone ? <AlertTriangle className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6" />}
              </div>
              <div className="flex-1">
                <h3 className={`text-[16px] font-bold tracking-tight mb-1 ${isOverBudget ? 'text-[#FF3B30]' : isDangerZone ? 'text-[#FF9500]' : 'text-[#198734]'}`}>
                  {isOverBudget ? 'Streak Broken Today' : isDangerZone ? 'Approaching Limit' : 'Safe Zone'}
                </h3>
                <p className={`text-[14px] font-medium leading-relaxed ${isOverBudget ? 'text-[#FF3B30]/80' : isDangerZone ? 'text-[#FF9500]/80' : 'text-[#198734]/80'}`}>
                  {isOverBudget 
                    ? `You exceeded your ₵${dailyLimit} limit by ₵${Math.abs(remainingBudget).toFixed(2)}.` 
                    : isDangerZone 
                    ? `Careful! You only have ₵${remainingBudget.toFixed(2)} left before you break your streak.` 
                    : `You have ₵${remainingBudget.toFixed(2)} remaining for today. Keep it up!`}
                </p>
              </div>
            </div>
          </div>

          {/* 3. MILESTONES (iOS Grouped List) */}
          <div className="mb-2 px-1 flex items-center space-x-2">
            <Trophy className="w-5 h-5 text-[#8E8E93]" />
            <h3 className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">Milestones</h3>
          </div>
          
          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden mb-8">
            <div className="flex flex-col">
              <div className={`relative flex items-center justify-between p-5 transition-colors ${currentStreak >= 3 ? 'bg-white' : 'bg-[#F2F2F7] opacity-60'}`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStreak >= 3 ? 'bg-[#FFF4E5] text-[#FF9500]' : 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[16px] font-semibold text-[#1C1C1E]">3-Day Planner</span>
                </div>
                {currentStreak >= 3 && <div className="text-[13px] font-bold text-[#FF9500] uppercase tracking-wider">Unlocked</div>}
                <div className="absolute bottom-0 left-[4.5rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </div>

              <div className={`relative flex items-center justify-between p-5 transition-colors ${currentStreak >= 7 ? 'bg-white' : 'bg-[#F2F2F7] opacity-60'}`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStreak >= 7 ? 'bg-[#E5F1FF] text-[#007AFF]' : 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[16px] font-semibold text-[#1C1C1E]">7-Day Saver</span>
                </div>
                {currentStreak >= 7 && <div className="text-[13px] font-bold text-[#007AFF] uppercase tracking-wider">Unlocked</div>}
                <div className="absolute bottom-0 left-[4.5rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </div>

              <div className={`relative flex items-center justify-between p-5 transition-colors ${currentStreak >= 30 ? 'bg-white' : 'bg-[#F2F2F7] opacity-60'}`}>
                <div className="flex items-center space-x-4">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${currentStreak >= 30 ? 'bg-[#EBF9EE] text-[#34C759]' : 'bg-[#E5E5EA] text-[#8E8E93]'}`}>
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <span className="text-[16px] font-semibold text-[#1C1C1E]">30-Day Master</span>
                </div>
                {currentStreak >= 30 && <div className="text-[13px] font-bold text-[#34C759] uppercase tracking-wider">Unlocked</div>}
              </div>
            </div>
          </div>

          {/* 4. LAYER 2: VAULT HEALTH WIDGET */}
          <div className="mb-2 px-1 flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-[#8E8E93]" />
            <h3 className="text-[15px] font-bold text-[#8E8E93] uppercase tracking-wider">Vault Health</h3>
          </div>

          <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden mb-8 p-6">
            <div className="flex justify-between items-end mb-4">
              <div>
                <p className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">Total Wealth</p>
                <h3 className={`text-[28px] font-black tracking-tighter ${isVaultDanger ? 'text-[#FF3B30]' : 'text-[#1C1C1E]'}`}>
                  ₵{totalBalance.toFixed(2)}
                </h3>
              </div>
              <div className="text-right">
                <p className="text-[12px] font-bold text-[#8E8E93] uppercase tracking-wider mb-1">Safety Floor</p>
                <p className="text-[16px] font-bold text-[#1C1C1E]">₵{minimumBalance.toFixed(2)}</p>
              </div>
            </div>

            {/* Health Bar */}
            <div className="h-3 w-full bg-[#F2F2F7] rounded-full overflow-hidden mb-4">
              <div 
                className={`h-full rounded-full transition-all duration-1000 ${isVaultDanger ? 'bg-[#FF3B30]' : isVaultWarning ? 'bg-[#FF9500]' : 'bg-[#34C759]'}`} 
                style={{ width: `${Math.max(healthFillPercentage, 2)}%` }} // Ensures at least a tiny sliver is visible
              ></div>
            </div>

            {/* Contextual Warning Panel */}
            <div className={`p-4 rounded-2xl ${isVaultDanger ? 'bg-[#FFEBEA]' : isVaultWarning ? 'bg-[#FFF4E5]' : 'bg-[#EBF9EE]'}`}>
              <p className={`text-[14px] font-medium leading-relaxed ${isVaultDanger ? 'text-[#FF3B30]' : isVaultWarning ? 'text-[#FF9500]' : 'text-[#198734]'}`}>
                {isVaultDanger 
                  ? `Critical: Your balance has dropped ₵${Math.abs(vaultBuffer).toFixed(2)} below your safety floor.` 
                  : isVaultWarning 
                  ? `Warning: You are only ₵${vaultBuffer.toFixed(2)} away from hitting your vault floor.` 
                  : `Secure: Your wealth is ₵${vaultBuffer.toFixed(2)} above your required minimum.`}
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Streak;