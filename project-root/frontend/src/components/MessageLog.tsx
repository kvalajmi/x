import { useState } from 'react';
import { MessageSquare, CheckCircle, XCircle, Clock, Search, Download } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

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

interface MessageLogProps {
  messages: MessageStatus[];
}

const MessageLog = ({ messages }: MessageLogProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'sent' | 'failed'>('all');

  // بيانات تجريبية للعرض
  const mockMessages: MessageStatus[] = [
    {
      id: '1',
      contact: {
        name: 'أحمد محمد',
        civil_id: '123456789',
        amount: '150',
        phone1: '+96512345678',
        pay_link: 'https://payment.example.com/123'
      },
      phone: '+96512345678',
      status: 'sent',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      contact: {
        name: 'فاطمة علي',
        civil_id: '987654321',
        amount: '200',
        phone1: '+96511111111',
        pay_link: 'https://payment.example.com/456'
      },
      phone: '+96511111111',
      status: 'failed',
      timestamp: new Date(Date.now() - 240000),
      error: 'رقم غير صحيح'
    },
    {
      id: '3',
      contact: {
        name: 'خالد سالم',
        civil_id: '456789123',
        amount: '75',
        phone1: '+96522222222',
        pay_link: 'https://payment.example.com/789'
      },
      phone: '+96522222222',
      status: 'sent',
      timestamp: new Date(Date.now() - 180000)
    },
    {
      id: '4',
      contact: {
        name: 'مريم أحمد',
        civil_id: '789123456',
        amount: '300',
        phone1: '+96533333333',
        pay_link: 'https://payment.example.com/101'
      },
      phone: '+96533333333',
      status: 'pending'
    }
  ];

  const allMessages = messages.length > 0 ? messages : mockMessages;

  const filteredMessages = allMessages.filter(message => {
    const matchesSearch = (message.contact?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (message.contact?.civil_id || '').includes(searchTerm) ||
                         (message.phone || '').includes(searchTerm);
    const matchesFilter = filterStatus === 'all' || message.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'sent':
        return <CheckCircle className="w-4 h-4 text-success" />;
      case 'failed':
        return <XCircle className="w-4 h-4 text-destructive" />;
      case 'pending':
        return <Clock className="w-4 h-4 text-warning" />;
      default:
        return <Clock className="w-4 h-4 text-muted-foreground" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent':
        return <Badge variant="default" className="bg-success text-success-foreground">مرسل</Badge>;
      case 'failed':
        return <Badge variant="destructive">فاشل</Badge>;
      case 'pending':
        return <Badge variant="secondary" className="bg-warning text-warning-foreground">انتظار</Badge>;
      default:
        return <Badge variant="outline">غير معروف</Badge>;
    }
  };

  const formatTimestamp = (timestamp?: Date) => {
    if (!timestamp) return '-';
    return new Intl.DateTimeFormat('ar-SA', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: '2-digit'
    }).format(timestamp);
  };

  const exportLog = () => {
    const csvContent = [
      ['الاسم', 'الرقم المدني', 'الهاتف', 'المبلغ', 'الحالة', 'الوقت', 'الخطأ'].join(','),
      ...filteredMessages.map(msg => [
        msg.contact?.name || 'غير محدد',
        msg.contact?.civil_id || 'غير محدد',
        msg.phone || 'غير محدد',
        msg.contact?.amount || 'غير محدد',
        msg.status === 'sent' ? 'مرسل' : msg.status === 'failed' ? 'فاشل' : 'انتظار',
        formatTimestamp(msg.timestamp),
        msg.error || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `whatsapp-log-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Card className="card-whatsapp">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <MessageSquare className="w-8 h-8 text-primary ml-2" />
            <h3 className="text-xl font-semibold text-foreground">
              سجل الرسائل
            </h3>
          </div>
          <Button
            onClick={exportLog}
            variant="outline"
            size="sm"
            disabled={filteredMessages.length === 0}
          >
            <Download className="w-4 h-4 ml-1" />
            تصدير
          </Button>
        </div>

        {/* البحث والفلترة */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="البحث بالاسم أو الرقم المدني أو الهاتف..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input-whatsapp pr-10"
            />
          </div>
          <div className="flex gap-2">
            {[
              { key: 'all', label: 'الكل' },
              { key: 'sent', label: 'مرسل' },
              { key: 'failed', label: 'فاشل' },
              { key: 'pending', label: 'انتظار' }
            ].map(filter => (
              <Button
                key={filter.key}
                variant={filterStatus === filter.key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(filter.key as any)}
              >
                {filter.label}
              </Button>
            ))}
          </div>
        </div>

        {/* جدول الرسائل */}
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">الحالة</TableHead>
                <TableHead className="text-right">اسم العميل</TableHead>
                <TableHead className="text-right">رقم الهاتف</TableHead>
                <TableHead className="text-right">الرسالة</TableHead>
                <TableHead className="text-right">الوقت</TableHead>
                <TableHead className="text-right">الملاحظات</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredMessages.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                    لا توجد رسائل للعرض
                  </TableCell>
                </TableRow>
              ) : (
                filteredMessages.map((message) => (
                  <TableRow key={message.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(message.status)}
                        {getStatusBadge(message.status)}
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {message.contact?.name || 'غير محدد'}
                    </TableCell>
                    <TableCell className="font-mono text-sm">
                      {message.phone || 'غير محدد'}
                    </TableCell>
                    <TableCell className="text-sm max-w-xs">
                      <div className="truncate" title={message.contact?.pay_link || 'رسالة من Excel'}>
                        {message.contact?.pay_link || 'رسالة من العمود G'}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {formatTimestamp(message.timestamp)}
                    </TableCell>
                    <TableCell className="text-sm">
                      {message.error || '-'}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* إحصائيات الجدول */}
        <div className="flex justify-between items-center text-sm text-muted-foreground">
          <span>
            عرض {filteredMessages.length} من {allMessages.length} رسالة
          </span>
          <div className="flex gap-4">
            <span>مرسل: {filteredMessages.filter(m => m.status === 'sent').length}</span>
            <span>فاشل: {filteredMessages.filter(m => m.status === 'failed').length}</span>
            <span>انتظار: {filteredMessages.filter(m => m.status === 'pending').length}</span>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default MessageLog;