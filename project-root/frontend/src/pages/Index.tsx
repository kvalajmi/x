import { useState, useEffect, useCallback } from 'react';
import { MessageSquare, Upload, Send, Pause, Play, X, RefreshCw, Wifi, WifiOff } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import QRDisplay from '@/components/QRDisplay';
import FileUpload from '@/components/FileUpload';
import ControlPanel from '@/components/ControlPanel';
import Statistics from '@/components/Statistics';
import MessageLog from '@/components/MessageLog';

// WhatsApp States (matching backend)
const WHATSAPP_STATES = {
  DISCONNECTED: 'disconnected',
  INITIALIZING: 'initializing', 
  QR_READY: 'qr_ready',
  AUTHENTICATING: 'authenticating',
  AUTHENTICATED: 'authenticated',
  READY: 'ready',
  ERROR: 'error'
};

interface ContactData {
  name: string;
  civil_id: string;
  amount: string;
  phone1: string;
  phone2?: string;
  phone3?: string;
  pay_link: string;
}

interface MessageStatus {
  id: string;
  contact: ContactData;
  phone: string;
  status: 'pending' | 'sent' | 'failed';
  timestamp?: Date;
  error?: string;
}

interface WhatsAppStatus {
  state: string;
  isReady: boolean;
  hasQR: boolean;
  qrCode?: string;
  sessionName: string;
  timestamp: string;
}

const Index = () => {
  // Socket and connection state
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketConnected, setSocketConnected] = useState(false);
  
  // WhatsApp state
  const [whatsappState, setWhatsappState] = useState<string>(WHATSAPP_STATES.DISCONNECTED);
  const [whatsappStatus, setWhatsappStatus] = useState<WhatsAppStatus | null>(null);
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<{ percent: number; message: string } | null>(null);
  
  // Messaging state
  const [contacts, setContacts] = useState<ContactData[]>([]);
  const [sendingStatus, setSendingStatus] = useState<'idle' | 'sending' | 'paused' | 'cancelled'>('idle');
  const [messageLog, setMessageLog] = useState<MessageStatus[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    sent: 0,
    failed: 0,
    remaining: 0
  });

  // UI state
  const [lastError, setLastError] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);

  /**
   * Initialize Socket.IO connection
   */
  const initializeSocket = useCallback(() => {
    const apiBaseUrl = window.location.origin; // Use current origin instead
    console.log('🔌 Initializing Socket.IO connection to:', apiBaseUrl);

    const newSocket = io(apiBaseUrl, {
      transports: ['websocket', 'polling'],
      timeout: 20000,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 1000,
      forceNew: true
    });

    // Connection events
    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected successfully');
      setSocketConnected(true);
      setLastError(null);
      
      // Request current status
      newSocket.emit('get_whatsapp_status');
    });

    newSocket.on('disconnect', (reason) => {
      console.log('🔌 Socket.IO disconnected:', reason);
      setSocketConnected(false);
    });

    newSocket.on('connect_error', (error) => {
      console.error('❌ Socket.IO connection error:', error);
      setSocketConnected(false);
      setLastError(`Connection failed: ${error.message}`);
    });

    // WhatsApp status events
    newSocket.on('whatsapp_status', (status: WhatsAppStatus) => {
      console.log('📊 WhatsApp status received:', status);
      setWhatsappStatus(status);
      setWhatsappState(status.state);
      
      if (status.hasQR && status.qrCode) {
        setQrCodeData(status.qrCode);
      } else {
        setQrCodeData(null);
      }
    });

    newSocket.on('whatsapp_state_change', (data) => {
      console.log('🔄 WhatsApp state changed:', data.state);
      setWhatsappState(data.state);
    });

    // QR Code events
    newSocket.on('qr', (qrData: string) => {
      console.log('📱 QR Code received:', qrData ? 'YES' : 'NO');
      setQrCodeData(qrData);
      setWhatsappState(WHATSAPP_STATES.QR_READY);
    });

    // Authentication events
    newSocket.on('authenticated', (data) => {
      console.log('🔐 WhatsApp authenticated:', data);
      setWhatsappState(WHATSAPP_STATES.AUTHENTICATED);
      setQrCodeData(null);
      setLoadingProgress(null);
    });

    newSocket.on('ready', (data) => {
      console.log('✅ WhatsApp ready:', data);
      setWhatsappState(WHATSAPP_STATES.READY);
      setQrCodeData(null);
      setLoadingProgress(null);
      setIsConnecting(false);
    });

    // Error events
    newSocket.on('auth_failure', (data) => {
      console.error('❌ WhatsApp authentication failed:', data);
      setWhatsappState(WHATSAPP_STATES.ERROR);
      setLastError(data.error);
      setQrCodeData(null);
      setLoadingProgress(null);
      setIsConnecting(false);
    });

    newSocket.on('error', (data) => {
      console.error('❌ WhatsApp error:', data);
      setWhatsappState(WHATSAPP_STATES.ERROR);
      setLastError(data.error);
    });

    // Disconnection events
    newSocket.on('disconnected', (data) => {
      console.log('🔌 WhatsApp disconnected:', data.reason);
      setWhatsappState(WHATSAPP_STATES.DISCONNECTED);
      setQrCodeData(null);
      setLoadingProgress(null);
    });

    // Loading events
    newSocket.on('loading', (data) => {
      console.log('⏳ WhatsApp loading:', `${data.percent}% - ${data.message}`);
      setLoadingProgress(data);
    });

    // Connection status events
    newSocket.on('whatsapp_connection_started', (data) => {
      console.log('🚀 WhatsApp connection started:', data);
      setWhatsappState(WHATSAPP_STATES.INITIALIZING);
      setIsConnecting(true);
    });

    newSocket.on('whatsapp_connection_failed', (data) => {
      console.error('❌ WhatsApp connection failed:', data);
      setWhatsappState(WHATSAPP_STATES.ERROR);
      setLastError(data.error);
      setIsConnecting(false);
    });

    // Messaging events
    newSocket.on('messaging_started', (data) => {
      console.log('📤 Messaging started:', data);
      setSendingStatus('sending');
    });

    newSocket.on('messaging_paused', (data) => {
      console.log('⏸️ Messaging paused:', data);
      setSendingStatus('paused');
    });

    newSocket.on('messaging_resumed', (data) => {
      console.log('▶️ Messaging resumed:', data);
      setSendingStatus('sending');
    });

    newSocket.on('messaging_cancelled', (data) => {
      console.log('⏹️ Messaging cancelled:', data);
      setSendingStatus('cancelled');
    });

    newSocket.on('message_sent', (data) => {
      console.log('✅ Message sent:', data);
      // Update message log and stats
      setMessageLog(prev => [...prev, { ...data, status: 'sent', timestamp: new Date() }]);
      setStats(prev => ({ ...prev, sent: prev.sent + 1, remaining: prev.remaining - 1 }));
    });

    newSocket.on('message_failed', (data) => {
      console.log('❌ Message failed:', data);
      // Update message log and stats
      setMessageLog(prev => [...prev, { ...data, status: 'failed', timestamp: new Date() }]);
      setStats(prev => ({ ...prev, failed: prev.failed + 1, remaining: prev.remaining - 1 }));
    });

    newSocket.on('stats_update', (data) => {
      console.log('📊 Stats updated:', data);
      setStats(data);
    });

    newSocket.on('status_update', (data) => {
      console.log('🔄 Status updated:', data);
      if (data.status === 'completed') {
        setSendingStatus('idle');
      } else if (data.status === 'error') {
        setSendingStatus('idle');
        setLastError(data.error);
      } else if (data.status) {
        setSendingStatus(data.status);
      }
      
      // Handle messaging status specifically
      if (data.messaging) {
        setSendingStatus(data.messaging);
      }
    });

    setSocket(newSocket);

    return () => {
      newSocket.disconnect();
    };
  }, []);

  // Initialize socket on mount
  useEffect(() => {
    const cleanup = initializeSocket();
    return cleanup;
  }, [initializeSocket]);

  /**
   * Connect to WhatsApp
   */
  const handleConnectWhatsApp = useCallback(() => {
    if (!socket || !socketConnected) {
      setLastError('Socket not connected');
      return;
    }

    console.log('📱 Requesting WhatsApp connection...');
    setIsConnecting(true);
    setLastError(null);
    socket.emit('connect_whatsapp');
  }, [socket, socketConnected]);

  /**
   * Disconnect from WhatsApp
   */
  const handleDisconnectWhatsApp = useCallback(() => {
    if (!socket) return;

    console.log('🔌 Disconnecting WhatsApp...');
    socket.emit('disconnect_whatsapp');
  }, [socket]);

  /**
   * Logout from WhatsApp
   */
  const handleLogoutWhatsApp = useCallback(() => {
    if (!socket) return;

    console.log('🚪 Logging out from WhatsApp...');
    socket.emit('logout_whatsapp');
  }, [socket]);

  /**
   * Start messaging
   */
  const handleStartMessaging = useCallback(() => {
    if (!socket || contacts.length === 0) return;

    const message = "مرحبا، هذه رسالة تجريبية من نظام الرسائل الجماعية.";
    
    console.log('📤 Starting messaging...', { contactCount: contacts.length });
    setStats({ total: contacts.length, sent: 0, failed: 0, remaining: contacts.length });
    setMessageLog([]);
    
    socket.emit('start_messaging', { messageRows: contacts, message });
  }, [socket, contacts]);

  /**
   * Handle file upload
   */
  const handleFileUpload = useCallback(async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData
      });
      
      const result = await response.json();
      
      if (result.success) {
        console.log('📁 File uploaded successfully, setting contacts:', result.data);
        setContacts(result.data);
        console.log('📊 Contacts state updated, length:', result.data.length);
        // Update file upload status
        if ((window as any).updateFileUploadStatus) {
          (window as any).updateFileUploadStatus('success', result.summary);
        }
      } else {
        throw new Error(result.error);
      }
    } catch (error: any) {
      console.error('Upload error:', error);
      if ((window as any).updateFileUploadStatus) {
        (window as any).updateFileUploadStatus('error', null, error.message);
      }
    }
  }, []);

  /**
   * Control messaging (pause/resume/cancel)
   */
  const handlePauseMessaging = useCallback(() => {
    if (!socket) return;
    socket.emit('pause_messaging');
  }, [socket]);

  const handleResumeMessaging = useCallback(() => {
    if (!socket) return;
    socket.emit('resume_messaging');
  }, [socket]);

  const handleCancelMessaging = useCallback(() => {
    if (!socket) return;
    socket.emit('cancel_messaging');
  }, [socket]);

  /**
   * Get UI state information
   */
  const getConnectionStatus = () => {
    if (!socketConnected) return { text: 'غير متصل', color: 'text-red-500', icon: WifiOff };
    
    switch (whatsappState) {
      case WHATSAPP_STATES.DISCONNECTED:
        return { text: 'غير متصل', color: 'text-red-500', icon: WifiOff };
      case WHATSAPP_STATES.INITIALIZING:
        return { text: 'جاري التهيئة...', color: 'text-yellow-500', icon: RefreshCw };
      case WHATSAPP_STATES.QR_READY:
        return { text: 'امسح رمز QR', color: 'text-blue-500', icon: MessageSquare };
      case WHATSAPP_STATES.AUTHENTICATING:
        return { text: 'جاري المصادقة...', color: 'text-yellow-500', icon: RefreshCw };
      case WHATSAPP_STATES.AUTHENTICATED:
        return { text: 'تم التحقق', color: 'text-green-500', icon: Wifi };
      case WHATSAPP_STATES.READY:
        return { text: 'متصل وجاهز', color: 'text-green-500', icon: Wifi };
      case WHATSAPP_STATES.ERROR:
        return { text: 'خطأ في الاتصال', color: 'text-red-500', icon: X };
      default:
        return { text: 'غير معروف', color: 'text-gray-500', icon: WifiOff };
    }
  };

  const connectionStatus = getConnectionStatus();
  const StatusIcon = connectionStatus.icon;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50" dir="rtl">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">
            نظام إرسال رسائل واتساب الجماعية
          </h1>
          <p className="text-gray-600">نظام متقدم وآمن لإرسال الرسائل بكميات كبيرة</p>
        </div>

        {/* Connection Status Bar */}
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
              {whatsappState === WHATSAPP_STATES.DISCONNECTED && (
                <button
                  onClick={handleConnectWhatsApp}
                  disabled={!socketConnected || isConnecting}
                  className="bg-green-500 hover:bg-green-600 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center space-x-2 space-x-reverse"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>ربط واتساب</span>
                </button>
              )}
              
              {whatsappState === WHATSAPP_STATES.READY && (
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

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* QR Code Display */}
            <QRDisplay 
              status={whatsappState === WHATSAPP_STATES.READY ? 'ready' : 
                     whatsappState === WHATSAPP_STATES.QR_READY ? 'qr' : 'disconnected'}
              onConnect={handleConnectWhatsApp}
              onDisconnect={handleLogoutWhatsApp}
              qrCode={qrCodeData}
            />

            {/* File Upload */}
            <FileUpload 
              onFileUpload={handleFileUpload}
            />

            {/* Control Panel */}
            <ControlPanel
              whatsappReady={whatsappState === WHATSAPP_STATES.READY}
              hasContacts={contacts.length > 0}
              sendingStatus={sendingStatus}
              onStart={handleStartMessaging}
              onPause={handlePauseMessaging}
              onResume={handleResumeMessaging}
              onCancel={handleCancelMessaging}
            />
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Statistics */}
            {(sendingStatus !== 'idle' || stats.total > 0) && (
              <Statistics stats={stats} />
            )}

            {/* Message Log */}
            {messageLog.length > 0 && (
              <MessageLog messages={messageLog} />
            )}
          </div>
        </div>

        {/* Debug Information (Development Only) */}
        {import.meta.env.DEV && (
          <div className="mt-8 p-4 bg-gray-100 rounded-lg">
            <h3 className="font-bold mb-2">Debug Information</h3>
            <div className="text-sm space-y-1">
              <p><strong>Socket Connected:</strong> {socketConnected ? 'Yes' : 'No'}</p>
              <p><strong>WhatsApp State:</strong> {whatsappState}</p>
              <p><strong>WhatsApp Ready:</strong> {whatsappState === WHATSAPP_STATES.READY ? 'Yes' : 'No'}</p>
              <p><strong>Has QR:</strong> {qrCodeData ? 'Yes' : 'No'}</p>
              <p><strong>Contacts:</strong> {contacts.length}</p>
              <p><strong>Has Contacts:</strong> {contacts.length > 0 ? 'Yes' : 'No'}</p>
              <p><strong>Sending Status:</strong> {sendingStatus}</p>
              <p><strong>Can Start:</strong> {(whatsappState === WHATSAPP_STATES.READY && contacts.length > 0 && sendingStatus === 'idle') ? 'Yes' : 'No'}</p>
              <p><strong>Last Error:</strong> {lastError || 'None'}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;