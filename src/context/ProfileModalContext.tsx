import { createContext, useContext, useState, useCallback } from 'react';
import type { ReactNode } from 'react';

interface ProfileModalContextValue {
  profileUserId: string | null;
  openProfile: (userId: string) => void;
  closeProfile: () => void;
}

const ProfileModalContext = createContext<ProfileModalContextValue | null>(null);

export function ProfileModalProvider({ children }: { children: ReactNode }) {
  const [profileUserId, setProfileUserId] = useState<string | null>(null);

  const openProfile = useCallback((userId: string) => {
    setProfileUserId(userId);
  }, []);

  const closeProfile = useCallback(() => {
    setProfileUserId(null);
  }, []);

  return (
    <ProfileModalContext.Provider value={{ profileUserId, openProfile, closeProfile }}>
      {children}
    </ProfileModalContext.Provider>
  );
}

export function useProfileModal() {
  const ctx = useContext(ProfileModalContext);
  if (!ctx) throw new Error('useProfileModal must be used within ProfileModalProvider');
  return ctx;
}
