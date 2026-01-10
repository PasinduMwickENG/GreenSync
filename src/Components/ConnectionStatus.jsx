// src/Components/ConnectionStatus.jsx
import React, { useState, useEffect } from 'react';
import { WifiOff, Wifi } from 'lucide-react';
import { toast } from 'sonner';

const ConnectionStatus = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);
    const [showBanner, setShowBanner] = useState(!navigator.onLine);

    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true);
            setShowBanner(false);
            toast.success('Back online - syncing changes...', {
                duration: 3000,
                icon: <Wifi className="w-4 h-4" />
            });
        };

        const handleOffline = () => {
            setIsOnline(false);
            setShowBanner(true);
            toast.warning('You\'re offline - changes will sync when reconnected', {
                duration: 5000,
                icon: <WifiOff className="w-4 h-4" />
            });
        };

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    if (!showBanner) return null;

    return (
        <div className="fixed top-0 left-0 right-0 bg-yellow-500 text-white px-4 py-2 text-center z-50 shadow-lg">
            <div className="flex items-center justify-center gap-2">
                <WifiOff className="w-4 h-4" />
                <span className="font-semibold">You're offline</span>
                <span className="hidden sm:inline">- Changes will sync when reconnected</span>
            </div>
        </div>
    );
};

export default ConnectionStatus;
