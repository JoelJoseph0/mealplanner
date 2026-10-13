import { createContext, useState, useEffect, useContext } from 'react';
import { AuthContext } from './AuthContext';
import userService from '../services/userService';

export const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const { isAuthenticated } = useContext(AuthContext);
  const [profile, setProfile] = useState(null);
  const [preferences, setPreferences] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 4000);
  };

  const fetchUserData = async () => {
    if (!isAuthenticated) return;
    setLoading(true);
    try {
      const [profileData, prefData] = await Promise.all([
        userService.getProfile(),
        userService.getPreferences(),
      ]);
      setProfile(profileData);
      setPreferences(prefData);
    } catch (err) {
      console.warn('Could not load user data from backend:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchUserData();
    } else {
      setProfile(null);
      setPreferences(null);
    }
  }, [isAuthenticated]);

  const updateProfileState = (updated) => {
    setProfile((prev) => ({ ...prev, ...updated }));
  };

  const updatePreferencesState = (updated) => {
    setPreferences((prev) => ({ ...prev, ...updated }));
  };

  return (
    <UserContext.Provider
      value={{
        profile,
        preferences,
        loading,
        fetchUserData,
        updateProfileState,
        updatePreferencesState,
        showToast,
        toast,
      }}
    >
      {children}
      {/* Toast Notification Floating Banner */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce duration-300">
          <div
            className={`px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 text-sm font-medium border ${
              toast.type === 'error'
                ? 'bg-red-50 text-red-800 border-red-200'
                : toast.type === 'info'
                ? 'bg-blue-50 text-blue-800 border-blue-200'
                : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}
          >
            <span>{toast.message}</span>
            <button
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700 ml-2 font-bold"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </UserContext.Provider>
  );
};
