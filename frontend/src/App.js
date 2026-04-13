import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Booking from './pages/Booking';
import BookingsList from './pages/BookingsList';
import DriverDashboard from './pages/DriverDashboard';
import Layout from './components/Layout';
import Pricing from './pages/Pricing';

const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useSelector((state) => state.auth);
  return isAuthenticated ? children : <Navigate to="/login" />;
};

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route
        path="/"
        element={
          <PrivateRoute>
            <Layout />
          </PrivateRoute>
        }
      >
        <Route index element={<Dashboard />} />
        <Route path="booking" element={<Booking />} />
        <Route path="bookings" element={<BookingsList />} />
        <Route path="driver" element={<DriverDashboard />} />
      </Route>
    </Routes>
  );
}

export default App;
