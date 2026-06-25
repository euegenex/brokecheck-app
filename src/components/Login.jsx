import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { Mail, Lock, ChevronRight, ShieldCheck } from 'lucide-react';

function Login() {
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please enter both email and password.");
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate('/');
    } catch (err) {
      console.error(err);
      setError("Invalid email or password. Please try again.");
    }
    setIsSubmitting(false);
  };

  return (
    <div className="min-h-screen sm:bg-slate-900 flex justify-center sm:py-10 font-sans selection:bg-indigo-100">
      <div className="w-full max-w-md bg-[#F2F2F7] sm:rounded-[3rem] sm:border-[12px] sm:border-black sm:shadow-2xl sm:overflow-y-auto sm:h-[820px] relative pb-10">
        
        {/* Dynamic Custom Logo & Header */}
        <div className="px-6 pt-20 pb-8">
          
          {/* The "Broke Cancelled" Typographic Logo */}
          <div className="flex items-center mb-8 transform -rotate-2">
            <div className="relative inline-block mr-1">
              <span className="text-[2.75rem] font-black text-[#1C1C1E] tracking-tighter leading-none">Broke</span>
              {/* The Red Strike-Through Line */}
              <div className="absolute top-1/2 -left-2 -right-1 h-2 bg-[#FF3B30] -rotate-3 rounded-full shadow-sm"></div>
            </div>
            <span className="text-[2.75rem] font-black text-[#34C759] tracking-tighter leading-none flex items-center">
              Check <ShieldCheck className="w-8 h-8 ml-2 mt-1" strokeWidth={3} />
            </span>
          </div>
          
          {/* The Sassy Greeting */}
          <h1 className="text-2xl font-black text-[#1C1C1E] tracking-tight mb-2">
            Still not broke?
          </h1>
          <p className="text-[#8E8E93] text-[16px] font-medium leading-relaxed">
            Let's verify that!
          </p>
        </div>

        <form onSubmit={handleLogin} className="px-5 space-y-6">
          
          {error && (
            <div className="bg-[#FFEBEA] border border-[#FF3B30]/20 text-[#FF3B30] text-[14px] font-bold p-4 rounded-2xl text-center shadow-sm animate-fade-in">
              {error}
            </div>
          )}

          {/* SECURE LOGIN INPUTS */}
          <div>
            <div className="bg-white rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-black/[0.02] overflow-hidden">
              
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
            
            {/* Forgot Password Link */}
            <div className="text-right mt-3 px-2">
              <button 
                type="button"
                onClick={() => alert("Head to the settings page when logged in to reset your password, or contact support.")}
                className="text-[13px] font-bold text-[#007AFF] hover:opacity-70 transition-opacity"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-[#1C1C1E] active:bg-[#3A3A3C] text-white rounded-[1.25rem] py-4 flex items-center justify-center space-x-2 transition-colors disabled:opacity-50 mt-4 shadow-lg shadow-black/10"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
            ) : (
              <>
                <span className="text-[17px] font-bold tracking-wide">Sign In</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>

        </form>

        <div className="text-center mt-auto pt-12 pb-8 absolute bottom-0 w-full">
          <p className="text-[14px] font-medium text-[#8E8E93]">
            Don't have an account?{' '}
            <Link to="/register" className="text-[#007AFF] font-bold hover:underline">
              Create Profile
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}

export default Login;