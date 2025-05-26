"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { User, NewsItem, EventDisplayInfo } from "../types/appTypes";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface StatisticUserProps {
  user: User | null;
  refreshToken: () => Promise<string | null>;
  onSessionExpired: () => void;
}

interface UserStatistics {
  totalEventsCreated: number;
  approvedEvents: number;
  pendingEvents: number;
  rejectedEvents: number;
  maxAttendeesInOneEvent: number;
  totalNewsCreated: number;
  approvedNews: number;
  pendingNews: number;
  rejectedNews: number;
  eventsRegisteredByUser: number;
}

const COLORS_EVENT_STATUS = ['#00C49F', '#FFBB28', '#FF8042']; 
const COLORS_NEWS_STATUS = ['#0088FE', '#00C49F', '#FFBB28'];
const OVERVIEW_CHART_COLORS = [
    'rgba(54, 162, 235, 0.7)',
    'rgba(153, 102, 255, 0.7)',
    'rgba(255, 206, 86, 0.7)',
    'rgba(75, 192, 192, 0.7)',
];

const StatisticUser: React.FC<StatisticUserProps> = ({ user, refreshToken, onSessionExpired }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStatistics | null>(null);

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
      const fetchStats = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const stats: UserStatistics = {
            totalEventsCreated: 0,
            approvedEvents: 0,
            pendingEvents: 0,
            rejectedEvents: 0,
            maxAttendeesInOneEvent: 0,
            totalNewsCreated: 0,
            approvedNews: 0,
            pendingNews: 0,
            rejectedNews: 0,
            eventsRegisteredByUser: 0,
          };

          const [eventsResponse, registeredEventsResponse] = await Promise.allSettled([
            authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/creator/${user.id}`),
            authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/attendee/${user.id}`)
          ]);

          if (eventsResponse.status === 'fulfilled' && eventsResponse.value.ok) {
            const eventsData = await eventsResponse.value.json();
            if (eventsData.code === 1000 && Array.isArray(eventsData.result)) {
              const createdEvents: EventDisplayInfo[] = eventsData.result;
              stats.totalEventsCreated = createdEvents.length;
              createdEvents.forEach(event => {
                if (event.status?.toUpperCase() === "APPROVED") stats.approvedEvents++;
                else if (event.status?.toUpperCase() === "PENDING") stats.pendingEvents++;
                else if (event.status?.toUpperCase() === "REJECTED") stats.rejectedEvents++;

                if (event.status?.toUpperCase() === "APPROVED") {
                   const currentCount = event.currentAttendeesCount ?? (Array.isArray(event.attendees) ? event.attendees.length : 0);
                   if (currentCount > stats.maxAttendeesInOneEvent) {
                      stats.maxAttendeesInOneEvent = currentCount;
                   }
                }
              });
            }
          } else if (eventsResponse.status === 'rejected' || (eventsResponse.status === 'fulfilled' && !eventsResponse.value.ok)){
            // Handle error for created events fetch if necessary
          }
          
          if (registeredEventsResponse.status === 'fulfilled' && registeredEventsResponse.value.ok) {
            const registeredEventsData = await registeredEventsResponse.value.json();
            if (registeredEventsData.code === 1000 && Array.isArray(registeredEventsData.result)) {
              stats.eventsRegisteredByUser = registeredEventsData.result.length;
            }
          } else if (registeredEventsResponse.status === 'rejected' || (registeredEventsResponse.status === 'fulfilled' && !registeredEventsResponse.value.ok)){
             // Handle error for registered events fetch if necessary
          }

          const newsStatuses: Array<NewsItem["status"]> = ["APPROVED", "PENDING", "REJECTED"];
          for (const status of newsStatuses) {
            if (!status) continue;
            try {
                const newsResponse = await authenticatedFetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/status?status=${status.toUpperCase()}`);
                if (newsResponse.ok) {
                    const newsData = await newsResponse.json();
                    if (newsData.code === 1000 && Array.isArray(newsData.result)) {
                        const userNewsOfStatus = newsData.result.filter(
                            (news: NewsItem) => news.createdBy?.id === user.id && !news.deleted
                        );
                        if (status === "APPROVED") stats.approvedNews += userNewsOfStatus.length;
                        if (status === "PENDING") stats.pendingNews += userNewsOfStatus.length;
                        if (status === "REJECTED") stats.rejectedNews += userNewsOfStatus.length;
                    }
                }
            } catch (newsErr: any) {
            }
          }
          stats.totalNewsCreated = stats.approvedNews + stats.pendingNews + stats.rejectedNews;
          
          setUserStats(stats);

        } catch (err: any) {
          setError(err.message || "Không thể tải dữ liệu thống kê.");
          setUserStats(null);
        } finally {
          setIsLoading(false);
        }
      };
      fetchStats();
    } else {
      setUserStats(null);
      setIsLoading(false);
    }
  }, [user, authenticatedFetch]);

  const overviewChartData = useMemo(() => {
    if (!userStats) return [];
    return [
      { name: "Sự kiện Tạo", value: userStats.totalEventsCreated, fill: OVERVIEW_CHART_COLORS[0] },
      { name: "Sự kiện Đăng ký", value: userStats.eventsRegisteredByUser, fill: OVERVIEW_CHART_COLORS[1] },
      { name: "Tin tức Tạo", value: userStats.totalNewsCreated, fill: OVERVIEW_CHART_COLORS[2] },
      { name: "Tham dự nhiều nhất", value: userStats.maxAttendeesInOneEvent, fill: OVERVIEW_CHART_COLORS[3] },
    ];
  }, [userStats]);

  const eventStatusPieData = useMemo(() => {
    if (!userStats) return [];
    return [
      { name: 'Đã duyệt', value: userStats.approvedEvents },
      { name: 'Chờ duyệt', value: userStats.pendingEvents },
      { name: 'Từ chối', value: userStats.rejectedEvents },
    ].filter(item => item.value > 0); 
  }, [userStats]);

  const newsStatusPieData = useMemo(() => {
    if (!userStats) return [];
    return [
      { name: 'Đã duyệt', value: userStats.approvedNews },
      { name: 'Chờ duyệt', value: userStats.pendingNews },
      { name: 'Từ chối', value: userStats.rejectedNews },
    ].filter(item => item.value > 0);
  }, [userStats]);


  const chartOptions = useMemo(() => ({
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' as const, display: true },
      title: { display: true, text: `Hoạt động của ${user?.firstName || user?.username || 'Bạn'}`, font: { size: 16 }},
      colors: { enabled: false } 
    },
    scales: { y: { beginAtZero: true, ticks: { stepSize: 1, precision: 0 }}},
  }), [user]);


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
          📊 Thống kê cá nhân
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

      {!isLoading && !error && userStats && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Sự kiện đã tạo" value={userStats.totalEventsCreated} color="indigo" />
            <StatCard title="Sự kiện đã đăng ký" value={userStats.eventsRegisteredByUser} color="purple" />
            <StatCard title="Tin tức đã tạo" value={userStats.totalNewsCreated} color="amber" />
            <StatCard title="Tham dự đông nhất (1 sự kiện)" value={userStats.maxAttendeesInOneEvent} color="teal" />
          </div>
          
          <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200">
            <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">
              Tổng quan hoạt động
            </h2>
            <div className="relative h-[300px] md:h-[400px]">
              {overviewChartData.every(d => d.value === 0) && overviewChartData.length > 0 ? (
                 <p className="text-center text-gray-500 flex items-center justify-center h-full">Không có dữ liệu để vẽ biểu đồ tổng quan.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewChartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="value" name="Số lượng">
                        {overviewChartData.map((entry, index) => (
                            <Cell key={`cell-overview-${index}`} fill={OVERVIEW_CHART_COLORS[index % OVERVIEW_CHART_COLORS.length]} />
                        ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Trạng thái sự kiện đã tạo</h2>
              <div className="relative h-[250px] md:h-[300px]">
                {eventStatusPieData.length === 0 ? (
                     <p className="text-center text-gray-500 flex items-center justify-center h-full">Không có dữ liệu trạng thái sự kiện.</p>
                ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={eventStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {eventStatusPieData.map((entry, index) => (
                            <Cell key={`cell-event-${index}`} fill={COLORS_EVENT_STATUS[index % COLORS_EVENT_STATUS.length]} />
                        ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                    </ResponsiveContainer>
                )}
              </div>
            </div>
            <div className="bg-white p-4 md:p-6 rounded-xl shadow-lg border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-700 mb-4 text-center">Trạng thái tin tức đã tạo</h2>
              <div className="relative h-[250px] md:h-[300px]">
                 {newsStatusPieData.length === 0 ? (
                     <p className="text-center text-gray-500 flex items-center justify-center h-full">Không có dữ liệu trạng thái tin tức.</p>
                 ) : (
                    <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie data={newsStatusPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                        {newsStatusPieData.map((entry, index) => (
                            <Cell key={`cell-news-${index}`} fill={COLORS_NEWS_STATUS[index % COLORS_NEWS_STATUS.length]} />
                        ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                    </PieChart>
                    </ResponsiveContainer>
                 )}
              </div>
            </div>
          </div>
        </>
      )}

      {!isLoading && !error && !userStats && (
         <div className="text-center text-gray-500 py-10">
            Không có dữ liệu thống kê để hiển thị hoặc bạn chưa có hoạt động nào.
        </div>
      )}
    </div>
  );
};

const StatCard: React.FC<{title: string; value: number; color: string}> = ({title, value, color}) => (
    <div className={`bg-white p-5 rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-300`}>
        <h2 className={`text-md font-semibold text-${color}-600 mb-1`}>
            {title}
        </h2>
        <p className="text-3xl font-bold text-gray-800">
            {value}
        </p>
    </div>
);

export default StatisticUser;