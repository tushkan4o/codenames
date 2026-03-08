import { useProfileModal } from '../../context/ProfileModalContext';
import NavBar from '../layout/NavBar';
import ProfileContent from './ProfileContent';

export default function ProfileModal() {
  const { profileUserId, closeProfile } = useProfileModal();

  if (!profileUserId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col bg-board-bg overflow-y-auto"
      onClick={closeProfile}
    >
      <NavBar />
      <div className="flex-1 flex items-start justify-center px-4 py-6">
        <div
          className="w-full max-w-2xl relative pt-8"
          onClick={(e) => e.stopPropagation()}
        >
          {/* X close button — styled like the < back button */}
          <button
            onClick={closeProfile}
            className="absolute right-0 top-0 text-gray-400 hover:text-white transition-colors z-20"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>

          <ProfileContent profileId={profileUserId} />
        </div>
      </div>
    </div>
  );
}
