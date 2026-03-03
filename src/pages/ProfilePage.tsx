import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/layout/NavBar';
import ProfileContent from '../components/profile/ProfileContent';

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const profileId = paramUserId || user?.id || '';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar />
      <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col flex-1 min-h-0 w-full relative">
        <button
          onClick={() => navigate(-1)}
          className="absolute left-4 top-4 text-gray-400 hover:text-white transition-colors z-10"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
        <ProfileContent profileId={profileId} />
      </div>
    </div>
  );
}
