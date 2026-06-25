import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { Shield, LogOut, Bell, ChevronLeft, Target, Wallet } from 'lucide-react';

function Settings() {
  const navigate = useNavigate();
  const user = auth.currentUser;
  
  // Dual-Layer Engine States
  const [dailyLimit, setDailyLimit] = useState(50);
  const [minimumBalance, setMinimumBalance] = useState(100); // The new safety net
  
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const displayName = user?.displayName || user?.email?.split('@')[0] || 'User';
  const initial = displayName.charAt(0).toUpperCase();

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
  }, [user]);

  const handleSaveLimits = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'USER_SETTINGS', user.uid), {
        daily_limit: Number(dailyLimit),
        minimum_balance: Number(minimumBalance)
      }, { merge: true });
      setMessage('Limits updated successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error saving limits.');
    }
    setIsSaving(false);
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/login');
    } catch (error) {
      console.error("Error logging out:", error);
    }
  };

  const handlePasswordReset = async () => {
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMessage('Password reset email sent!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      setMessage('Error sending reset email.');
    }
  };

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-32">
        
        {/* iOS Header */}
        <div className="bg-[#F2F2F7] px-5 pt-14 pb-4 sticky top-0 z-20 flex justify-center items-center">
          <h1 className="text-[17px] font-semibold text-[#1C1C1E]">Settings</h1>
        </div>

        <div className="px-5 pt-2 space-y-8">
          
          {/* Profile Card */}
          <div className="bg-white rounded-[2rem] p-6 shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] flex items-center space-x-4">
            <div className="h-16 w-16 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white text-2xl font-bold shadow-md">
              {initial}
            </div>
            <div className="flex-1">
              <h2 className="text-[20px] font-bold text-[#1C1C1E] tracking-tight">{displayName}</h2>
              <p className="text-[15px] font-medium text-[#8E8E93]">{user?.email}</p>
            </div>
          </div>

          {message && (
            <div className="bg-[#EBF9EE] border border-[#34C759]/20 text-[#198734] text-[14px] font-bold p-3 rounded-2xl text-center shadow-sm">
              {message}
            </div>
          )}

          {/* Dual-Layer Limits Engine */}
          <div>
            <h3 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2">Behavioral Limits</h3>
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
              
              {/* Daily Spending Limit */}
              <div className="p-5 flex items-center justify-between relative">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#FFF4E5] p-2 rounded-xl">
                    <Target className="w-5 h-5 text-[#FF9500]" />
                  </div>
                  <div>
                    <label className="text-[16px] font-semibold text-[#1C1C1E] block">Daily Spend Cap</label>
                    <span className="text-[12px] text-[#8E8E93] font-medium">Powers your Streak</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[16px] font-semibold text-[#8E8E93]">₵</span>
                  <input 
                    type="number" 
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-16 bg-transparent text-right text-[17px] font-bold text-[#1C1C1E] outline-none"
                  />
                </div>
                <div className="absolute bottom-0 left-[4rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </div>

              {/* Overall Wealth Floor */}
              <div className="p-5 flex items-center justify-between relative">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#EBF9EE] p-2 rounded-xl">
                    <Wallet className="w-5 h-5 text-[#34C759]" />
                  </div>
                  <div>
                    <label className="text-[16px] font-semibold text-[#1C1C1E] block">Vault Minimum</label>
                    <span className="text-[12px] text-[#8E8E93] font-medium">Alert if balance drops below</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[16px] font-semibold text-[#8E8E93]">₵</span>
                  <input 
                    type="number" 
                    value={minimumBalance}
                    onChange={(e) => setMinimumBalance(e.target.value)}
                    className="w-16 bg-transparent text-right text-[17px] font-bold text-[#1C1C1E] outline-none"
                  />
                </div>
              </div>

              {/* Save Button inside the block */}
              <div className="p-4 bg-[#FAFAFC] border-t border-[#E5E5EA]">
                <button 
                  onClick={handleSaveLimits}
                  disabled={isSaving}
                  className="w-full bg-[#1C1C1E] active:bg-[#3A3A3C] text-white font-bold py-3.5 rounded-xl transition-colors disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : 'Update Limits'}
                </button>
              </div>

            </div>
          </div>

          {/* Account Security */}
          <div>
            <h3 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2">Account</h3>
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
              
              <button onClick={handlePasswordReset} className="w-full p-5 flex items-center justify-between active:bg-[#FAFAFC] transition-colors relative">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#E5F1FF] p-2 rounded-xl">
                    <Shield className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <span className="text-[16px] font-semibold text-[#1C1C1E]">Reset Password</span>
                </div>
                <div className="absolute bottom-0 left-[4rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </button>
              
              <button onClick={handleLogout} className="w-full p-5 flex items-center justify-between active:bg-[#FFEBEA] transition-colors">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#FFEBEA] p-2 rounded-xl">
                    <LogOut className="w-5 h-5 text-[#FF3B30]" />
                  </div>
                  <span className="text-[16px] font-semibold text-[#FF3B30]">Sign Out</span>
                </div>
              </button>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Settings;