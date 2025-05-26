"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User, EventDisplayInfo } from "../types/appTypes"; // Điều chỉnh đường dẫn nếu cần
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from 'recharts';
import {
  CheckCircledIcon,
  CalendarIcon as RadixCalendarIcon,
} from "@radix-ui/react-icons";

interface StatisticGuestProps {
  user: User | null; 
  refreshToken: () => Promise<string | null>;
  onSessionExpired: () => void;
}

interface GuestEventStats {
  totalRegisteredEvents: number;
  checkedInEvents: number;
}

const StatCard: React.FC<{title: string; value: number; icon: React.ReactNode; colorClass: string; isLoading: boolean}> = 
({ title, value, icon, colorClass, isLoading }) => (
  <div className={`bg-white shadow-lg rounded-xl p-5 transform transition-all hover:scale-105 ${colorClass}`}>
    <div className="flex items-center">
      <div className={`p-3 rounded-full bg-white bg-opacity-20 text-white mr-4`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-6 h-6"})}
      </div>
      <div>
        <p className="text-sm text-white font-medium opacity-90">{title}</p>
        {isLoading ? (
            <div className="h-8 bg-gray-300 bg-opacity-50 rounded-md w-16 animate-pulse mt-1"></div>
        ) : (
            <p className="text-3xl font-semibold text-white">
            {value}
            </p>
        )}
      </div>
    </div>
  </div>
);

const CHART_COLORS_GUEST = ['#22c55e', '#f97316']; // Màu cho Đã điểm danh (Green-500), Chưa điểm danh (Orange-500)

const StatisticGuest: React.FC<StatisticGuestProps> = ({ user, refreshToken, onSessionExpired }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [guestStats, setGuestStats] = useState<GuestEventStats | null>(null);

  const authenticatedFetch = useCallback(
    async (url: string, options: RequestInit = {}) => {
      let token = localStorage.getItem("authToken");
      if (!token) {
        onSessionExpired();
        throw new Error("Yêu cầu đăng nhập.");
      }
      const makeRequest = async (currentToken: string | null) => {
        const headers: HeadersInit = { Authorization: `Bearer ${currentToken}` };
        if (options.body && (options.method === "POST" || options.method === "PUT" || options.method === "PATCH")) {
          if (!(options.body instanceof FormData)) {
             headers["Content-Type"] = "application/json";
          }
        }
        const res = await fetch(url, { ...options, headers: { ...headers, ...options.headers } });
        if (res.status === 401 || res.status === 403) {
          const newToken = await refreshToken();
          if (newToken) {
            localStorage.setItem("authToken", newToken);
            return makeRequest(newToken);
          } else {
            onSessionExpired();
            throw new Error("Phiên đăng nhập hết hạn hoặc không hợp lệ.");
          }
        }
        return res;
      };
      return makeRequest(token);
    },
    [refreshToken, onSessionExpired]
  );

  useEffect(() => {
    if (user?.id) {
      const fetchGuestStatistics = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const response = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/attendee/${user.id}`);
          if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `Lỗi tải dữ liệu sự kiện đã đăng ký: ${response.status}`);
          }
          const data = await response.json();

          if (data.code === 1000 && Array.isArray(data.result)) {
            const registeredEvents: EventDisplayInfo[] = data.result;
            let checkedInCount = 0;

            registeredEvents.forEach(event => {
              const currentUserAttendee = event.attendees?.find(attendee => attendee.userId === user.id);
              if (currentUserAttendee && (currentUserAttendee.checkedInAt || currentUserAttendee.attending === true)) {
                checkedInCount++;
              }
            });
            
            setGuestStats({
              totalRegisteredEvents: registeredEvents.length,
              checkedInEvents: checkedInCount,
            });
          } else {
            throw new Error(data.message || "Dữ liệu sự kiện đã đăng ký không hợp lệ.");
          }
        } catch (err: any) {
          setError(err.message || "Không thể tải dữ liệu thống kê cho khách.");
          setGuestStats(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchGuestStatistics();
    } else {
      setGuestStats(null);
      setIsLoading(false);
    }
  }, [user, authenticatedFetch]);
  
  const pieChartDataGuest = useMemo(() => {
    if (!guestStats) return [];
    const notCheckedIn = guestStats.totalRegisteredEvents - guestStats.checkedInEvents;
    const data = [];
    if (guestStats.checkedInEvents >= 0) { // Luôn thêm ngay cả khi là 0 để legend hiển thị
        data.push({ name: 'Đã điểm danh', value: guestStats.checkedInEvents });
    }
    if (notCheckedIn >= 0) { // Luôn thêm ngay cả khi là 0
        data.push({ name: 'Chưa điểm danh', value: notCheckedIn });
    }
    // Chỉ lọc ra những mục thực sự có giá trị để vẽ, nhưng legend vẫn có thể dựa trên data gốc
    return data.filter(item => item.value > 0 || data.length <=1 ); //Nếu chỉ có 1 loại (tất cả checkin hoặc tất cả chưa) thì vẫn vẽ
  }, [guestStats]);

  const RADIAN = Math.PI / 180;
  const renderCustomizedPieLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent, index, name, value }: any) => {
    if (value === 0 && pieChartDataGuest.length > 1 && pieChartDataGuest.some(d => d.value > 0) ) return null; 
    if (percent < 0.05 && pieChartDataGuest.length > 1 && pieChartDataGuest.some(d => d.value > 0)) return null;


    const radius = innerRadius + (outerRadius - innerRadius) * 0.6;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    return (
      <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central" fontSize="13px" fontWeight="bold">
        {`${(percent * 100).toFixed(0)}%`}
      </text>
    );
  };


  if (!user) {
    return (
      <div className="text-center text-gray-500 py-10">
        Vui lòng đăng nhập để xem thống kê.
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-700">
          📊 Thống kê của bạn
        </h1>
      </div>

      {isLoading && (
        <div className="text-center py-10">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-3 text-gray-600">Đang tải dữ liệu thống kê...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md" role="alert">
          <p className="font-bold">Lỗi</p>
          <p>{error}</p>
        </div>
      )}

      {!isLoading && !error && guestStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <StatCard 
              title="Tổng sự kiện đã đăng ký" 
              value={guestStats.totalRegisteredEvents} 
              icon={<RadixCalendarIcon />} 
              colorClass="bg-gradient-to-br from-purple-500 to-indigo-600"
              isLoading={isLoading}
            />
            <StatCard 
              title="Số lần đã điểm danh" 
              value={guestStats.checkedInEvents} 
              icon={<CheckCircledIcon />} 
              colorClass="bg-gradient-to-br from-green-500 to-teal-600"
              isLoading={isLoading}
            />
          </div>
          
          {guestStats.totalRegisteredEvents >= 0 && ( // Hiển thị biểu đồ ngay cả khi totalRegisteredEvents = 0 để thấy "Không có dữ liệu"
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
                Tỷ lệ điểm danh
              </h2>
              <div className="relative h-[300px] md:h-[350px]">
                {pieChartDataGuest.length === 0 || guestStats.totalRegisteredEvents === 0 ? (
                     <p className="text-center text-gray-500 flex items-center justify-center h-full">Không có dữ liệu điểm danh để hiển thị.</p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                        <Pie
                        data={pieChartDataGuest}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        labelLine={false}
                        label={renderCustomizedPieLabel}
                        >
                        {pieChartDataGuest.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_COLORS_GUEST[index % CHART_COLORS_GUEST.length]} />
                        ))}
                        </Pie>
                        <Tooltip formatter={(value: number, name: string) => [`${value} sự kiện`, name]} />
                        <Legend 
                            verticalAlign="bottom" 
                            height={36}
                            formatter={(value, entry) => {
                                const { color } = entry;
                                const statValue = pieChartDataGuest.find(d => d.name === value)?.value || 0;
                                return <span style={{ color }}>{value} ({statValue})</span>;
                            }}
                        />
                    </PieChart>
                    </ResponsiveContainer>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {!isLoading && !error && !guestStats && (
         <div className="text-center text-gray-500 py-10">
            Không có dữ liệu thống kê để hiển thị hoặc bạn chưa đăng ký sự kiện nào.
        </div>
      )}
    </div>
  );
};

export default StatisticGuest;