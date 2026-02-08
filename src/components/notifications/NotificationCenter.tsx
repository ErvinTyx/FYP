import { useState, useEffect } from 'react';
import { Bell, X, Check, FileText, Plus, Minus, Edit, RefreshCw } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { ScrollArea } from '../ui/scroll-area';
import { RFQNotification } from '../../types/rfq';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '../ui/popover';
import { NotificationDetails } from './NotificationDetails';
import { formatRfqDate } from '../../lib/rfqDate';

export function NotificationCenter() {
  const [notifications, setNotifications] = useState<RFQNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<RFQNotification | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Load notifications from localStorage
  useEffect(() => {
    loadNotifications();
    // Set up polling to check for new notifications
    const interval = setInterval(loadNotifications, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadNotifications = () => {
    const saved = localStorage.getItem('rfqNotifications');
    if (saved) {
      setNotifications(JSON.parse(saved));
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  const markAsRead = (id: string) => {
    const updated = notifications.map(n => 
      n.id === id ? { ...n, read: true } : n
    );
    setNotifications(updated);
    localStorage.setItem('rfqNotifications', JSON.stringify(updated));
  };

  const markAllAsRead = () => {
    const updated = notifications.map(n => ({ ...n, read: true }));
    setNotifications(updated);
    localStorage.setItem('rfqNotifications', JSON.stringify(updated));
  };

  const clearAll = () => {
    setNotifications([]);
    localStorage.setItem('rfqNotifications', JSON.stringify([]));
  };

  const handleNotificationClick = (notification: RFQNotification) => {
    markAsRead(notification.id);
    setSelectedNotification(notification);
    setShowDetails(true);
    setIsOpen(false);
  };

  const getNotificationIcon = (type: RFQNotification['type']) => {
    switch (type) {
      case 'created':
        return <FileText className="size-4 text-blue-600" />;
      case 'item_added':
        return <Plus className="size-4 text-green-600" />;
      case 'item_removed':
        return <Minus className="size-4 text-red-600" />;
      case 'item_modified':
        return <Edit className="size-4 text-amber-600" />;
      case 'status_changed':
        return <RefreshCw className="size-4 text-purple-600" />;
      default:
        return <Bell className="size-4 text-gray-600" />;
    }
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return formatRfqDate(date);
  };

  return (
    <>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="size-5" />
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-1 -right-1 size-5 flex items-center justify-center p-0 bg-[#F15929] hover:bg-[#F15929]"
              >
                {unreadCount > 9 ? '9+' : unreadCount}
              </Badge>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-96 p-0" align="end">
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-[#231F20]">Notifications</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-sm"
                >
                  <Check className="size-4 mr-1" />
                  Mark all read
                </Button>
              )}
              {notifications.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAll}
                  className="text-sm text-red-600 hover:text-red-700"
                >
                  <X className="size-4 mr-1" />
                  Clear all
                </Button>
              )}
            </div>
          </div>

          <ScrollArea className="h-[400px]">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 px-4">
                <Bell className="size-12 text-gray-300 mb-3" />
                <p className="text-gray-600">No notifications</p>
                <p className="text-sm text-gray-500 text-center mt-1">
                  You'll see notifications here when RFQs are created or modified
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {notifications.map(notification => (
                  <button
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left p-4 hover:bg-gray-50 transition-colors ${
                      !notification.read ? 'bg-blue-50' : ''
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm ${!notification.read ? 'text-[#231F20]' : 'text-gray-900'}`}>
                            {notification.message}
                          </p>
                          {!notification.read && (
                            <div className="size-2 rounded-full bg-[#F15929] flex-shrink-0 mt-1.5" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          {notification.changes.length} change{notification.changes.length !== 1 ? 's' : ''}
                        </p>
                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-xs text-gray-500">
                            {formatTime(notification.createdAt)}
                          </span>
                          <span className="text-xs text-gray-400">•</span>
                          <span className="text-xs text-gray-500">
                            by {notification.createdBy}
                          </span>
                        </div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>
        </PopoverContent>
      </Popover>

      {/* Notification Details Dialog */}
      {showDetails && selectedNotification && (
        <NotificationDetails
          notification={selectedNotification}
          onClose={() => {
            setShowDetails(false);
            setSelectedNotification(null);
          }}
        />
      )}
    </>
  );
}
