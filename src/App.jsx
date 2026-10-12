import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute/ProtectedRoute";

import Login from "./pages/Login/Login";
import Signup from "./pages/Signup/Signup";
import ResetPassword from "./pages/ResetPassword/ResetPassword";
import Subscription from "./pages/Subscription/Subscription";
import Payment from "./pages/Payment/Payment";
import PaymentSubmitted from "./pages/PaymentSubmitted/PaymentSubmitted";
import Communication from "./pages/Communication/Communication";
import FreeOdds from "./pages/FreeOdds/FreeOdds";
import PremiumOdds from "./pages/PremiumOdds/PremiumOdds";
import AdminLogin from "./pages/AdminLogin/AdminLogin";
import AdminDashboard from "./pages/AdminDashboard/AdminDashboard";
import Home from "./pages/Home/Home";

/**
 * Route map (mirrors the navigation flow in the project README):
 *
 *   /                -> redirects to /login
 *   /login           -> Login            → /signup, → /admin/login, → /subscription
 *   /signup          -> Signup           → /login, → /subscription
 *   /home            -> Home              (user-protected) → /subscription
 *   /subscription    -> Subscription     (user-protected) → /login (on logout)
 *   /payment          -> Payment           (user-protected) → /subscription
 *   /payment-submitted -> PaymentSubmitted  (user-protected) → /home
 *   /communication    -> Communication     (user-protected)
 *   /odds/free        -> FreeOdds           (signed-in users)
 *   /odds/premium     -> PremiumOdds        (paid and verified users)
 *   /admin/login     -> AdminLogin       -> /login, → /admin/dashboard
 *   /admin/dashboard -> AdminDashboard   (admin-protected) → /admin/login (on logout)
 */
export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route
          path="/home"
          element={
            <ProtectedRoute role="user" requireProfile>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/subscription"
          element={
            <ProtectedRoute role="user" requireProfile>
              <Subscription />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment"
          element={
            <ProtectedRoute role="user" requireProfile>
              <Payment />
            </ProtectedRoute>
          }
        />
        <Route
          path="/payment-submitted"
          element={
            <ProtectedRoute role="user" requireProfile>
              <PaymentSubmitted />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communication"
          element={
            <ProtectedRoute role="user" requireProfile>
              <Communication />
            </ProtectedRoute>
          }
        />
        <Route
          path="/odds/free"
          element={
            <ProtectedRoute role="user" requireProfile>
              <FreeOdds />
            </ProtectedRoute>
          }
        />
        <Route
          path="/odds/premium"
          element={
            <ProtectedRoute role="user" requireProfile>
              <PremiumOdds />
            </ProtectedRoute>
          }
        />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute role="admin">
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </AuthProvider>
  );
}
