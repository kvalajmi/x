import React from 'react';
import { MessageSquare, RefreshCw, Wifi, WifiOff, X } from 'lucide-react';

interface ConnectionStatusBarProps {
  isConnecting: boolean;
  connectionStatus: {
    text: string;
    color: string;
    icon: React.ElementType;
  };
  loadingProgress: {
    percent: number;
    message: string;
  } | null;
  whatsappState: string;
  socketConnected: boolean;
  handleConnectWhatsApp: () => void;
  handleLogoutWhatsApp: () => void;
  handleDisconnectWhatsApp: () => void;
  lastError: string | null;
}

const ConnectionStatusBar: React.FC<ConnectionStatusBarProps> = ({
  isConnecting,
  connectionStatus,
  loadingProgress,
  whatsappState,
  socketConnected,
  handleConnectWhatsApp,
  handleLogoutWhatsApp,
  handleDisconnectWhatsApp,
  lastError,
}) => {
  const StatusIcon = connectionStatus.icon;

  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3 space-x-reverse">
          <StatusIcon className={`w-5 h-5 ${connectionStatus.color} ${isConnecting ? 'animate-spin' : ''}`} />
          <span className={`font-medium ${connectionStatus.color}`}>
            {connectionStatus.text}
          </span>
          {loadingProgress && (
            <span className="text-sm text-gray-500">
              ({loadingProgress.percent}% - {loadingProgress.message})
            </span>
          )}
        </div>

        <div className="flex items-center space-x-2 space-x-reverse">
          {whatsappState === 'disconnected' && (
            <button
              onClick={handleConnectWhatsApp}
              disabled={!socketConnected || isConnecting}
              className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse"
            >
              <MessageSquare className="w-4 h-4" />
              <span>ربط واتساب</span>
            </button>
          )}

          {whatsappState === 'ready' && (
            <div className="flex space-x-2 space-x-reverse">
              <button
                onClick={handleLogoutWhatsApp}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                تسجيل خروج
              </button>
              <button
                onClick={handleDisconnectWhatsApp}
                className="bg-red-500 hover:bg-red-600 text-white px-3 py-2 rounded-lg text-sm"
              >
                قطع الاتصال
              </button>
            </div>
          )}
        </div>
      </div>

      {lastError && (
        <div className="mt-3 p-3 bg-red-100 border border-red-300 rounded-lg">
          <p className="text-red-700 text-sm">{lastError}</p>
        </div>
      )}
    </div>
  );
};

export default React.memo(ConnectionStatusBar);
