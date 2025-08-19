import { Play, Pause, Square, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface ControlPanelProps {
  whatsappReady: boolean;
  hasContacts: boolean;
  sendingStatus: 'idle' | 'sending' | 'paused' | 'cancelled';
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

const ControlPanel = ({
  whatsappReady,
  hasContacts,
  sendingStatus,
  onStart,
  onPause,
  onResume,
  onCancel
}: ControlPanelProps) => {
  const canStart = whatsappReady && hasContacts && sendingStatus === 'idle';
  const canPause = sendingStatus === 'sending';
  const canResume = sendingStatus === 'paused';
  const canCancel = sendingStatus === 'sending' || sendingStatus === 'paused';

  console.log('🎛️ ControlPanel render:', { whatsappReady, hasContacts, sendingStatus, canStart });

  return (
    <Card className="card-whatsapp">
      <div className="text-center space-y-4">
        <h3 className="text-xl font-semibold text-foreground">
          لوحة التحكم
        </h3>

        <div className="space-y-3">
          {sendingStatus === 'idle' && (
            <Button
              onClick={onStart}
              disabled={!canStart}
              className="btn-whatsapp w-full"
              size="lg"
            >
              <Play className="w-5 h-5 ml-2" />
              ابدأ الإرسال
            </Button>
          )}

          {sendingStatus === 'sending' && (
            <div className="space-y-2">
              <Button
                onClick={onPause}
                variant="outline"
                className="w-full"
                size="lg"
              >
                <Pause className="w-5 h-5 ml-2" />
                إيقاف مؤقت
              </Button>
              <Button
                onClick={onCancel}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Square className="w-5 h-5 ml-2" />
                إلغاء الإرسال
              </Button>
            </div>
          )}

          {sendingStatus === 'paused' && (
            <div className="space-y-2">
              <Button
                onClick={onResume}
                className="btn-whatsapp w-full"
                size="lg"
              >
                <Play className="w-5 h-5 ml-2" />
                استئناف الإرسال
              </Button>
              <Button
                onClick={onCancel}
                variant="destructive"
                className="w-full"
                size="lg"
              >
                <Square className="w-5 h-5 ml-2" />
                إلغاء الإرسال
              </Button>
            </div>
          )}

          {sendingStatus === 'cancelled' && (
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
              className="w-full"
              size="lg"
            >
              <RotateCcw className="w-5 h-5 ml-2" />
              إعادة تشغيل
            </Button>
          )}
        </div>

        <div className="bg-muted/50 p-4 rounded-lg text-sm">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>حالة واتساب:</span>
              <span className={whatsappReady ? 'text-success' : 'text-muted-foreground'}>
                {whatsappReady ? 'متصل' : 'غير متصل'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>جهات الاتصال:</span>
              <span className={hasContacts ? 'text-success' : 'text-muted-foreground'}>
                {hasContacts ? 'محملة' : 'غير محملة'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>حالة الإرسال:</span>
              <span className={
                sendingStatus === 'sending' ? 'text-primary' :
                sendingStatus === 'paused' ? 'text-warning' :
                sendingStatus === 'cancelled' ? 'text-destructive' :
                'text-muted-foreground'
              }>
                {
                  sendingStatus === 'idle' ? 'جاهز' :
                  sendingStatus === 'sending' ? 'جاري الإرسال' :
                  sendingStatus === 'paused' ? 'متوقف مؤقتاً' :
                  'ملغي'
                }
              </span>
            </div>
          </div>
        </div>

        {!whatsappReady && (
          <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg">
            <p className="text-sm text-warning-foreground">
              يجب الاتصال بواتساب أولاً
            </p>
          </div>
        )}

        {!hasContacts && whatsappReady && (
          <div className="bg-warning/10 border border-warning/20 p-3 rounded-lg">
            <p className="text-sm text-warning-foreground">
              يجب رفع ملف جهات الاتصال أولاً
            </p>
          </div>
        )}
      </div>
    </Card>
  );
};

export default ControlPanel;