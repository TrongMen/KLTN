// pages/attendance.tsx
import { useState, useEffect } from 'react';

type AttendanceStatus = 'notYet' | 'canCheckIn' | 'present' | 'absent';

interface EventInfo {
  id: string;
  name: string;
  startTime: string; // ISO
  endTime: string;   // ISO
}

export default function AttendancePage() {
  const [event, setEvent] = useState<EventInfo>({
    id: 'e001',
    name: 'Hội thảo Công nghệ',
    startTime: '2025-05-13T09:00:00Z',
    endTime: '2025-05-13T11:00:00Z',
  });

  const [hasCheckedIn, setHasCheckedIn] = useState(false);
  const [status, setStatus] = useState<AttendanceStatus>('notYet');

  useEffect(() => {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (now < start) {
      setStatus('notYet');
    } else if (now >= start && now <= end) {
      setStatus(hasCheckedIn ? 'present' : 'canCheckIn');
    } else if (now > end) {
      setStatus(hasCheckedIn ? 'present' : 'absent');
    }
  }, [event, hasCheckedIn]);

  const handleCheckIn = () => {
    if (status === 'canCheckIn') {
      setHasCheckedIn(true);
    }
  };

  const renderStatus = () => {
    switch (status) {
      case 'notYet':
        return <span className="text-yellow-600">Chưa điểm danh</span>;
      case 'canCheckIn':
        return (
          <button
            onClick={handleCheckIn}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded"
          >
            Điểm danh
          </button>
        );
      case 'present':
        return <span className="text-green-600 font-semibold">Có mặt</span>;
      case 'absent':
        return <span className="text-red-600 font-semibold">Vắng</span>;
      default:
        return null;
    }
  };

  return (
    <div className="p-6 max-w-xl mx-auto">
      <h1 className="text-xl font-bold mb-4">Điểm danh sự kiện</h1>
      <div className="bg-gray-100 p-4 rounded shadow">
        <p className="mb-2">📌 <strong>Tên sự kiện:</strong> {event.name}</p>
        <p className="mb-2">
          🕒 <strong>Thời gian:</strong>{' '}
          {new Date(event.startTime).toLocaleString()} -{' '}
          {new Date(event.endTime).toLocaleString()}
        </p>
        <p className="mt-4">
          🔍 <strong>Trạng thái điểm danh:</strong> {renderStatus()}
        </p>
      </div>
    </div>
  );
}

export default AttendancePage;