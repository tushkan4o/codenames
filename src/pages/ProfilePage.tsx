import { useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import NavBar from '../components/layout/NavBar';
import ProfileContent from '../components/profile/ProfileContent';

export default function ProfilePage() {
  const { userId: paramUserId } = useParams<{ userId: string }>();
  const { user } = useAuth();

  const profileId = paramUserId || user?.id || '';

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <NavBar showBack />
      <div className="max-w-2xl mx-auto px-4 pt-4 flex flex-col flex-1 min-h-0 w-full">
        <ProfileContent profileId={profileId} />
      </div>
    </div>
  );
}
