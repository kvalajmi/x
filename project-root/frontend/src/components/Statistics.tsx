import { TrendingUp, Send, XCircle, Clock } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface StatsData {
  total: number;
  sent: number;
  failed: number;
  remaining: number;
}

interface StatisticsProps {
  stats: StatsData;
}

const Statistics = ({ stats }: StatisticsProps) => {
  const progress = stats.total > 0 ? ((stats.sent + stats.failed) / stats.total) * 100 : 0;
  const successRate = stats.sent + stats.failed > 0 ? (stats.sent / (stats.sent + stats.failed)) * 100 : 0;

  return (
    <Card className="card-whatsapp">
      <div className="space-y-6">
        <div className="flex items-center justify-center mb-4">
          <TrendingUp className="w-8 h-8 text-primary ml-2" />
          <h3 className="text-xl font-semibold text-foreground">
            الإحصائيات
          </h3>
        </div>

        {/* شريط التقدم */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-foreground font-medium">التقدم العام</span>
            <span className="text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <Progress 
            value={progress} 
            className="h-3"
          />
          <p className="text-xs text-muted-foreground text-center">
            {stats.sent + stats.failed} من {stats.total} مكتمل
          </p>
        </div>

        {/* إحصائيات مفصلة */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <TrendingUp className="w-6 h-6 text-primary" />
            </div>
            <p className="text-2xl font-bold text-primary">{stats.total}</p>
            <p className="text-sm text-muted-foreground">الإجمالي</p>
          </div>

          <div className="bg-success/5 border border-success/20 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-success/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Send className="w-6 h-6 text-success" />
            </div>
            <p className="text-2xl font-bold text-success">{stats.sent}</p>
            <p className="text-sm text-muted-foreground">مرسل</p>
          </div>

          <div className="bg-destructive/5 border border-destructive/20 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <XCircle className="w-6 h-6 text-destructive" />
            </div>
            <p className="text-2xl font-bold text-destructive">{stats.failed}</p>
            <p className="text-sm text-muted-foreground">فاشل</p>
          </div>

          <div className="bg-warning/5 border border-warning/20 p-4 rounded-lg text-center">
            <div className="w-12 h-12 bg-warning/10 rounded-full flex items-center justify-center mx-auto mb-2">
              <Clock className="w-6 h-6 text-warning" />
            </div>
            <p className="text-2xl font-bold text-warning">{stats.remaining}</p>
            <p className="text-sm text-muted-foreground">متبقي</p>
          </div>
        </div>

        {/* معدل النجاح */}
        {stats.sent + stats.failed > 0 && (
          <div className="bg-accent/30 p-4 rounded-lg border border-accent">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">معدل النجاح</span>
              <span className={`text-lg font-bold ${successRate >= 80 ? 'text-success' : successRate >= 60 ? 'text-warning' : 'text-destructive'}`}>
                {Math.round(successRate)}%
              </span>
            </div>
            <Progress 
              value={successRate} 
              className="mt-2 h-2"
            />
          </div>
        )}

        {/* تفاصيل إضافية */}
        <div className="bg-muted/30 p-4 rounded-lg space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">معدل الإرسال:</span>
            <span className="text-foreground">رسالة كل 6-8 ثوان</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">محاولات إعادة:</span>
            <span className="text-foreground">2 مرات بانتظار 15 ثانية</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">التحقق من الأرقام:</span>
            <span className="text-foreground">E.164 (الكويت +965)</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default Statistics;