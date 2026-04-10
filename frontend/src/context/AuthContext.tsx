import React, { createContext, useContext, useState } from 'react';

interface AuthContextType {
  token: string | null;
  login: (newToken: string, isNewUser?: boolean) => void;
  logout: () => void;
  isAuthenticated: boolean;
  onboardingComplete: boolean;
  markOnboardingComplete: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setToken] = useState<string | null>(localStorage.getItem('token'));
  const [onboardingComplete, setOnboardingComplete] = useState<boolean>(
    localStorage.getItem('cymops_onboarding_complete') === 'true'
  );

  const login = (newToken: string, isNewUser?: boolean) => {
    localStorage.setItem('token', newToken);
    setToken(newToken);
    // If explicitly flagged as new user, clear onboarding state
    if (isNewUser) {
      localStorage.removeItem('cymops_onboarding_complete');
      setOnboardingComplete(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
  };

  const markOnboardingComplete = () => {
    localStorage.setItem('cymops_onboarding_complete', 'true');
    setOnboardingComplete(true);
  };

  return (
    <AuthContext.Provider value={{
      token, login, logout,
      isAuthenticated: !!token,
      onboardingComplete,
      markOnboardingComplete,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};
