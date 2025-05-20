import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'; // Added useLocation
import AuthPage from './components/AuthPage/AuthPage.jsx';
import CreateAccount from './components/AuthPage/CreateAccount.jsx';
import Verify from './components/AuthPage/Verify.jsx';
import Dashboard from './components/DashBoardPage/DashBoardPage.jsx';
import axios from 'axios';

const App = () => {
  const [user, setUser] = useState({ name: "DevUser" });
  const location = useLocation(); // Hook to get the current location

  const getUser = async () => {
    console.log("Fetching user data...");
    try {
      const url = `${import.meta.env.VITE_REACT_APP_API_URL}/auth/login/success`;
      const { data } = await axios.get(url, { withCredentials: true });
      setUser(data.user);
    } catch (err) {
      setUser(null);
      // console.log(err);
    }
  };

  // useEffect(() => {
  //   // Call getUser whenever the route changes
  //   getUser();
  // }, [location]); // Dependency array includes location to trigger on route changes

  return (
    <Routes>
      <Route exact path="/" element={user ? <Navigate to="/dashboard" /> : <AuthPage />} />
      <Route exact path="/dashboard" element={user ? <Dashboard userData={user} /> : <Navigate to="/" />} />
      <Route exact path="/signup" element={user ? <Navigate to="/dashboard" /> : <CreateAccount />} />
      <Route exact path="/verify" element={<Verify />} />
    </Routes>
  );
};

export default App;
