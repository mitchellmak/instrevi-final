import React from 'react';
import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Profile from './pages/Profile';
import ProfileEdit from './pages/ProfileEdit';
import Feed from './pages/Feed';
import CreateReview from './pages/CreateReview';
import CreateUnboxing from './pages/CreateUnboxing';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Account from './pages/Account';
import Settings from './pages/Settings';
import Help from './pages/Help';
import Friends from './pages/Friends';

function App() {
  return (
    <div className="App">
      <Navbar />
      <Routes>
        <Route path="/" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/feed" element={<ProtectedRoute><Feed /></ProtectedRoute>} />
        <Route path="/home" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/register" element={<Register />} />
        <Route path="/profile/:userId" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
        <Route path="/create/review" element={<ProtectedRoute><CreateReview /></ProtectedRoute>} />
        <Route path="/create/unboxing" element={<ProtectedRoute><CreateUnboxing /></ProtectedRoute>} />
        <Route path="/settings/profile" element={<ProtectedRoute><ProfileEdit /></ProtectedRoute>} />
        <Route path="/settings/account" element={<ProtectedRoute><Account /></ProtectedRoute>} />
        <Route path="/settings/privacy" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
        <Route path="/settings/help" element={<ProtectedRoute><Help /></ProtectedRoute>} />
        <Route path="/settings/friends" element={<ProtectedRoute><Friends /></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;

