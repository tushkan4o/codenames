import { useProfileModal } from '../../context/ProfileModalContext';
import ProfileContent from './ProfileContent';

export default function ProfileModal() {
  const { profileUserId, closeProfile } = useProfileModal();

  if (!profileUserId) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-board-bg overflow-y-auto py-6 px-4"
      onClick={closeProfile}
    >
      <div
        className="w-full max-w-2xl relative"
        onClick={(e) => e.stopPropagation()}
      >
        {/* X close button */}
        <button
          onClick={closeProfile}
          className="absolute -top-2 -right-2 text-gray-500 hover:text-white text-2xl leading-none transition-colors z-20 w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 border border-gray-700"
        >
          &times;
        </button>

        <ProfileContent profileId={profileUserId} />
      </div>
    </div>
  );
}
