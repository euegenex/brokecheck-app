import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, Link } from 'react-router-dom';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from './firebase';
import Login from './components/Login';
import Register from './components/Register';
import NewTransaction from './components/NewTransaction';
import Dashboard from './components/Dashboard';
import FloatingNav from './components/FloatingNav';
import History from './components/History';
import Settings from './components/Settings';
import Streak from './components/Streak';
import Analytics from './components/Analytics';
import Buckets from './components/Buckets';
import Invest from './components/Invest';

// Protected Route wrapper component
const ProtectedRoute = ({ children, user, loading }) => {
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-300 border-t-slate-900"></div>
      </div>
    );
  }
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <Router>
      <Routes>
        {/* Protected Dashboard Route */}
        <Route 
          path="/" 
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Dashboard />
            </ProtectedRoute>
          } 
        />
        

        {/* Protected Data Entry Route */}
        <Route 
          path="/new" 
          element={
            <ProtectedRoute user={user} loading={loading}>
              <NewTransaction />
            </ProtectedRoute>
          } 
        />

        {/* Protected History Route */}
     <Route 
       path="/history" 
       element={
         <ProtectedRoute user={user} loading={loading}>
           <History />
         </ProtectedRoute>
       } 
     />
        {/* Protected Settings Route */}
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Settings />
            </ProtectedRoute>
          } 
        />

        {/* Protected Streak Route */}
        <Route 
          path="/streak" 
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Streak />
            </ProtectedRoute>
          } 
        />
        {/* Protected Analytics Route */}
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Analytics />
            </ProtectedRoute>
          } 
        />

        <Route
          path="/buckets"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Buckets />
            </ProtectedRoute>
          }
        />
               
        <Route
          path="/invest"
          element={
            <ProtectedRoute user={user} loading={loading}>
              <Invest />
            </ProtectedRoute>
          }
        />

        {/* Public Auth Routes */}
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Fallback Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
     {user && <FloatingNav />}
    </Router>
  );
}

export default App;