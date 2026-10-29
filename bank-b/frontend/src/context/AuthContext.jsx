import React, { createContext, useContext, useState, useEffect } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [employee, setEmployee] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
      const token = localStorage.getItem('bank_b_employee_token');
      if (token) {
        try {
          const res = await api.get('/auth/me');
          setEmployee(res.data);
        } catch (err) {
          console.error('Failed to verify token', err);
          localStorage.removeItem('bank_b_employee_token');
          setEmployee(null);
        }
      }
      setLoading(false);
    };
    checkAuth();
  }, []);

  const login = async (username, password) => {
    const res = await api.post('/auth/employee/login', { username, password });
    const { access_token, employee: empData } = res.data;
    localStorage.setItem('bank_b_employee_token', access_token);
    setEmployee(empData);
    return empData;
  };

  const logout = () => {
    localStorage.removeItem('bank_b_employee_token');
    setEmployee(null);
  };

  return (
    <AuthContext.Provider value={{ employee, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
