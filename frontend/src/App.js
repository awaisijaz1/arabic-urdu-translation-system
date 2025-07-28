import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useQuery } from 'react-query';
import axios from 'axios';
import toast from 'react-hot-toast';

// Components
import Navbar from './components/Navbar';
import Login from './components/Login';
import Dashboard from './components/Dashboard';
import FileUpload from './components/FileUpload';
import TranslationJobs from './components/TranslationJobs';
import Evaluation from './components/Evaluation';
import GroundTruth from './components/GroundTruth';
import Metrics from './components/Metrics';

// Context
import { AuthContext } from './context/AuthContext';

// API configuration
axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

function App() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Check if user is already logged in
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Verify token
      axios.post('/auth/verify')
        .then(response => {
          setUser(response.data.user);
        })
        .catch(() => {
          localStorage.removeItem('token');
          delete axios.defaults.headers.common['Authorization'];
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  // Health check
  const { data: healthStatus } = useQuery(
    'health',
    () => axios.get('/health').then(res => res.data),
    {
      refetchInterval: 30000, // Check every 30 seconds
      retry: 3,
      onError: () => {
        toast.error('Unable to connect to server');
      }
    }
  );

  const login = async (username, password) => {
    try {
      const response = await axios.post('/auth/login', { username, password });
      const { access_token } = response.data;
      
      localStorage.setItem('token', access_token);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      
      // Get user info
      const userResponse = await axios.get('/users/me');
      setUser(userResponse.data);
      
      toast.success('Login successful!');
      return true;
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Login failed');
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="spinner mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      <div className="min-h-screen bg-gray-50">
        {user && <Navbar healthStatus={healthStatus} />}
        
        <main className="container mx-auto px-4 py-8">
          <Routes>
            <Route 
              path="/login" 
              element={user ? <Navigate to="/dashboard" /> : <Login />} 
            />
            <Route 
              path="/dashboard" 
              element={user ? <Dashboard /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/upload" 
              element={user ? <FileUpload /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/translation" 
              element={user ? <TranslationJobs /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/evaluation" 
              element={user ? <Evaluation /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/ground-truth" 
              element={user ? <GroundTruth /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/metrics" 
              element={user ? <Metrics /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/" 
              element={<Navigate to={user ? "/dashboard" : "/login"} />} 
            />
          </Routes>
        </main>
      </div>
    </AuthContext.Provider>
  );
}

export default App; 