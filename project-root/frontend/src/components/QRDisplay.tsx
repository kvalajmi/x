import { useState } from 'react';
import { Smartphone, CheckCircle, AlertCircle, Loader2, LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface QRDisplayProps {
  status: 'disconnected' | 'qr' | 'ready';
  onConnect: () => void;
  onDisconnect?: () => void;
  qrCode?: string | null;
}

const QRDisplay = ({ status, onConnect, onDisconnect, qrCode }: QRDisplayProps) => {
  return (
    <Card className="card-whatsapp">
      <div className="text-center">
        <div className="flex items-center justify-center mb-4">
          <Smartphone className="w-8 h-8 text-primary ml-2" />
          <h3 className="text-xl font-semibold text-foreground">
            اتصال واتساب
          </h3>
        </div>

        {status === 'disconnected' && (
          <div className="space-y-4">
            <p className="text-muted-foreground">
              اضغط للاتصال بواتساب وعرض رمز QR
            </p>
            <Button 
              onClick={onConnect}
              className="btn-whatsapp w-full"
            >
              <Smartphone className="w-5 h-5 ml-2" />
              اتصل بواتساب
            </Button>
          </div>
        )}

        {status === 'qr' && (
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-lg mx-auto w-64 h-64 flex items-center justify-center border-2 border-dashed border-border">
              {qrCode ? (
                <img 
                  src={qrCode} 
                  alt="WhatsApp QR Code" 
                  className="max-w-full max-h-full rounded-lg"
                />
              ) : (
                <div className="text-center">
                  <Loader2 className="w-12 h-12 text-primary animate-spin mx-auto mb-4" />
                  <p className="text-sm text-muted-foreground">
                    جاري إنشاء رمز QR...
                  </p>
                </div>
              )}
            </div>
            <p className="text-muted-foreground text-sm">
              افتح واتساب على هاتفك واذهب إلى الإعدادات &gt; الأجهزة المرتبطة &gt; ربط جهاز
            </p>
            {qrCode && (
              <p className="text-sm text-primary font-medium">
                امسح الكود بواتساب
              </p>
            )}
          </div>
        )}

        {status === 'ready' && (
          <div className="space-y-4">
            <div className="text-center">
              <CheckCircle className="w-16 h-16 text-success mx-auto mb-4 animate-bounce" />
              <h4 className="text-lg font-semibold text-success mb-2">
                متصل بنجاح!
              </h4>
              <p className="text-muted-foreground mb-4">
                واتساب جاهز لإرسال الرسائل
              </p>
              {onDisconnect && (
                <Button 
                  onClick={onDisconnect}
                  variant="outline"
                  className="border-destructive text-destructive hover:bg-destructive hover:text-destructive-foreground"
                >
                  <LogOut className="w-4 h-4 ml-2" />
                  تسجيل الخروج
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default QRDisplay;