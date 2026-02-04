import { useAuth } from '@/context/AuthContext';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * A headless component that sits inside AuthProvider
 * to handle notification logic when a user is logged in.
 */
export default function NotificationHandler() {
    const { user } = useAuth();

    // Call our notification hook
    useNotifications(user);

    return null; // This component doesn't render anything
}
