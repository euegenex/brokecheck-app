import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth, db } from '../firebase';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { Target, Wallet, User, Mail, Lock, ChevronRight, ShieldCheck } from 'lucide-react';

function Register() {
  const navigate = useNavigate();
  
  // Account States
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Behavioral Limit States
  const [dailyLimit, setDailyLimit] = useState(50);
  const [minimumBalance, setMinimumBalance] = useState(100);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!email || !password || !name) {
      setError("Please fill out all account fields.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await updateProfile(user, { displayName: name });

      await setDoc(doc(db, 'USER_SETTINGS', user.uid), {
        daily_limit: Number(dailyLimit),
        minimum_balance: Number(minimumBalance),
        created_at: new Date()
      });

      navigate('/');
    } catch (err) {
      console.error(err);
      setError(err.message.replace("Firebase: ", ""));
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-10">
        
        {/* Dynamic Header */}
        <div className="px-6 pt-10 pb-6 relative">
          
          {/* Logo pushed to the right and minimized */}
          <div className="flex justify-end mb-2 pr-2">
            <div className="flex items-center transform -rotate-2 scale-[0.45] origin-right">
              <div className="relative inline-block mr-1">
                <span className="text-[2.75rem] font-black text-[#1C1C1E] tracking-tighter leading-none">Broke</span>
                <div className="absolute top-1/2 -left-2 -right-1 h-2 bg-[#FF3B30] -rotate-3 rounded-full shadow-sm"></div>
              </div>
              <span className="text-[2.75rem] font-black text-[#34C759] tracking-tighter leading-none flex items-center">
                Check <ShieldCheck className="w-8 h-8 ml-2 mt-1" strokeWidth={3} />
              </span>
            </div>
          </div>
          
          {/* THE BRANDING SLOGAN */}
          <h1 className="text-[2.5rem] font-black text-[#1C1C1E] tracking-tighter leading-[1.1] mb-3">
            Stay broke?<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#007AFF] to-[#34C759]">
              Not on our watch.
            </span>
          </h1>
          <p className="text-[#8E8E93] text-[15px] font-medium leading-relaxed">
            Set up your profile. Define your discipline limits. Take control of your money today.
          </p>
        </div>

        <form onSubmit={handleRegister} className="px-5 space-y-6">
          
          {error && (
            <div className="bg-[#FFEBEA] border border-[#FF3B30]/20 text-[#FF3B30] text-[14px] font-bold p-4 rounded-2xl text-center shadow-sm">
              {error}
            </div>
          )}

          {/* SECTION 1: IDENTITY */}
          <div>
            <h3 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2">Your Identity</h3>
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
              <div className="p-4 px-5 flex items-center relative">
                <User className="w-5 h-5 text-[#C7C7CC] mr-3" />
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="First Name"
                  className="w-full bg-transparent text-[16px] font-semibold text-[#1C1C1E] outline-none placeholder:text-[#C7C7CC]"
                  required
                />
                <div className="absolute bottom-0 left-[3rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </div>

              <div className="p-4 px-5 flex items-center relative">
                <Mail className="w-5 h-5 text-[#C7C7CC] mr-3" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email Address"
                  className="w-full bg-transparent text-[16px] font-semibold text-[#1C1C1E] outline-none placeholder:text-[#C7C7CC]"
                  required
                />
                <div className="absolute bottom-0 left-[3rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </div>

              <div className="p-4 px-5 flex items-center">
                <Lock className="w-5 h-5 text-[#C7C7CC] mr-3" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className="w-full bg-transparent text-[16px] font-semibold text-[#1C1C1E] outline-none placeholder:text-[#C7C7CC]"
                  required
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: THE DISCIPLINE ENGINE */}
          <div>
            <h3 className="text-[13px] font-bold text-[#8E8E93] uppercase tracking-wider mb-2 px-2">Discipline Limits</h3>
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
              <div className="p-5 flex items-center justify-between relative">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#FFF4E5] p-2 rounded-xl">
                    <Target className="w-5 h-5 text-[#FF9500]" />
                  </div>
                  <div>
                    <label className="text-[15px] font-bold text-[#1C1C1E] block">Daily Spend Cap</label>
                    <span className="text-[12px] text-[#8E8E93] font-medium">To keep your streak alive</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[16px] font-bold text-[#C7C7CC]">₵</span>
                  <input 
                    type="number" 
                    value={dailyLimit}
                    onChange={(e) => setDailyLimit(e.target.value)}
                    className="w-14 bg-transparent text-right text-[17px] font-black text-[#1C1C1E] outline-none"
                    required
                  />
                </div>
                <div className="absolute bottom-0 left-[4.5rem] right-0 h-[1px] bg-[#E5E5EA]"></div>
              </div>

              <div className="p-5 flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-[#EBF9EE] p-2 rounded-xl">
                    <Wallet className="w-5 h-5 text-[#34C759]" />
                  </div>
                  <div>
                    <label className="text-[15px] font-bold text-[#1C1C1E] block">Safety Net</label>
                    <span className="text-[12px] text-[#8E8E93] font-medium">Absolute minimum balance</span>
                  </div>
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-[16px] font-bold text-[#C7C7CC]">₵</span>
                  <input 
                    type="number" 
                    value={minimumBalance}
                    onChange={(e) => setMinimumBalance(e.target.value)}
                    className="w-14 bg-transparent text-right text-[17px] font-black text-[#1C1C1E] outline-none"
                    required
                  />
                </div>
              </div>
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1C1C1E] active:bg-[#3A3A3C] text-white rounded-[1.25rem] py-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-4 shadow-lg shadow-black/10"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-[17px] font-bold tracking-wide">Enter BrokeCheck</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

        </form>

        <div className="text-center mt-8 pb-8">
          <p className="text-[14px] font-medium text-[#8E8E93]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#007AFF] font-bold hover:underline">
              Sign In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Register;