"use client";

import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import Image from "next/image"; // Mặc dù không dùng trực tiếp, giữ lại nếu có kế hoạch mở rộng
import { User } from "../types/appTypes"; // Đảm bảo đường dẫn đúng
import {
  PersonIcon,
  CalendarIcon,
  ArchiveIcon,
  CheckCircledIcon,
  CrossCircledIcon,
  StopwatchIcon,
  UpdateIcon,
  LightningBoltIcon,
  ExclamationTriangleIcon,
  ListBulletIcon, // Icon mới cho số sự kiện đăng ký
  StarIcon,       // Icon mới cho tham dự nhiều nhất
} from "@radix-ui/react-icons";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  PieChart,
  Pie,
} from "recharts";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export interface ApiUserDetail extends User {
  userCode?: string;
  dateOfBirth?: string;
  facultyId?: string;
  majorId?: string;
  status?: number;
  violationNote?: string;
  isBanned?: boolean;
}

export interface EventDisplayInfo {
  id: string;
  name: string;
  title?: string;
  time: string;
  date?: string; // Thường là phần ngày của `time`
  location: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  event_status?: "UPCOMING" | "ONGOING" | "COMPLETED"; // Trạng thái tiến trình của sự kiện đã duyệt
  createdBy?: string;
  attendees?: any[]; // Mảng người tham dự hoặc chỉ là ID
  currentAttendeesCount?: number; // Số lượng người tham dự hiện tại nếu API trả về
}

export interface NewsItem {
  id: string;
  title: string;
  content: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt?: string;
  coverImageUrl?: string;
}

interface StatisticTabContentProps {
  user: User | null;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  bannedUsers: number;
}

interface UserEngagementStats { // Interface mới
    registeredEventsCount: number;
}

interface EventStats {
  totalEvents: number;
  approvedEvents: number;
  pendingEvents: number;
  rejectedEvents: number;
  upcomingEvents: number;
  ongoingEvents: number;
  completedEvents: number;
  maxAttendeesInOneEvent: number; // Thống kê mới
}

interface NewsStats {
  totalNews: number;
  approvedNews: number;
  pendingNews: number;
  rejectedNews: number;
}

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  isLoading?: boolean;
  color?: string;
}

interface SummaryChartData {
  name: string;
  users: number;
  events: number;
  news: number;
  approvalRate: number;
}

interface PieChartData {
  name: string;
  value: number;
  color: string;
}

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  description,
  isLoading,
  color = "bg-indigo-500",
}) => {
  const displayValue = typeof value === "number" && !isNaN(value) ? value : 0;

  return (
    <div className="bg-white shadow-lg rounded-xl p-5 transform transition-all hover:scale-105">
      <div className="flex items-center">
        <div className={`p-3 rounded-full ${color} text-white mr-4`}>
          {icon}
        </div>
        <div>
          <p className="text-sm text-gray-500 font-medium">{title}</p>
          {isLoading ? (
            <div className="h-8 bg-gray-200 rounded-md w-16 animate-pulse mt-1"></div>
          ) : (
            <p className="text-3xl font-semibold text-gray-800">
              {displayValue}
            </p>
          )}
        </div>
      </div>
      {description && !isLoading && (
        <p className="text-xs text-gray-400 mt-2">{description}</p>
      )}
    </div>
  );
};
const DateRangePicker: React.FC<{
  startDate: Date | null;
  endDate: Date | null;
  onChange: (dates: [Date | null, Date | null]) => void;
}> = ({ startDate, endDate, onChange }) => {
  return (
    <div className="flex items-center space-x-2">
      <span className="text-sm font-medium text-gray-700">
        Chọn khoảng thời gian:
      </span>
      <div className="flex space-x-2">
        <DatePicker
          selected={startDate}
          onChange={onChange}
          startDate={startDate}
          endDate={endDate}
          selectsRange
          className="px-3 py-1.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          dateFormat="dd/MM/yyyy"
          placeholderText="Từ ngày - đến ngày"
          isClearable
        />
      </div>
    </div>
  );
};

const SummaryComboChart: React.FC<{
  data: SummaryChartData[];
  isLoading?: boolean;
}> = ({ data, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-5 h-80 flex items-center justify-center">
        <div className="h-64 bg-gray-200 rounded-md w-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 h-80">
      <ResponsiveContainer width="100%" height="90%">
        <ComposedChart
          data={data}
          margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="name"
            angle={-45}
            textAnchor="end"
            height={60}
            tick={{ fontSize: 12 }}
          />
          <YAxis yAxisId="left" orientation="left" />
          <YAxis
            yAxisId="right"
            orientation="right"
            domain={[0, 100]}
            tickFormatter={(value) => `${value}%`}
          />
          <Tooltip
            formatter={(value: number, name: string) => {
              if (name === "approvalRate") {
                return [`${value}%`, "Tỷ lệ phê duyệt"];
              }
              return [value, name];
            }}
          />
          <Legend />
          <Bar
            yAxisId="left"
            dataKey="users"
            name="Người dùng"
            fill="#6366F1"
            barSize={20}
          />
          <Bar
            yAxisId="left"
            dataKey="events"
            name="Sự kiện"
            fill="#8B5CF6"
            barSize={20}
          />
          <Bar
            yAxisId="left"
            dataKey="news"
            name="Tin tức"
            fill="#EC4899"
            barSize={20}
          />
          <Line
            yAxisId="right"
            type="monotone"
            dataKey="approvalRate"
            name="Tỷ lệ phê duyệt"
            stroke="#F59E0B"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
};

const CustomPieChart: React.FC<{
  data: PieChartData[];
  title: string;
  isLoading?: boolean;
}> = ({ data, title, isLoading }) => {
  if (isLoading) {
    return (
      <div className="bg-white shadow-lg rounded-xl p-5 h-80 flex items-center justify-center">
        <div className="h-64 bg-gray-200 rounded-md w-full animate-pulse"></div>
      </div>
    );
  }

  const totalValue = useMemo(
    () => data.reduce((sum, entry) => sum + entry.value, 0),
    [data]
  );
  const filteredData = data.filter((entry) => entry.value > 0);

  const renderLabel = ({ name, percent, value }: any) => {
    if (totalValue === 0) return null;
    if (value === totalValue && totalValue > 0) {
      return `${name}: 100%`;
    }
    if (percent * 100 < 1 && value > 0) {
      return `${name}: <1%`;
    }
    if (percent * 100 >= 1) {
      return `${name}: ${(percent * 100).toFixed(0)}%`;
    }
    return null; 
  };

  return (
    <div className="bg-white shadow-lg rounded-xl p-6 h-80">
      <h3 className="text-xl font-semibold text-gray-800 mb-4">{title}</h3>
      {filteredData.length > 0 ? (
        <ResponsiveContainer width="100%" height="90%">
          <PieChart>
            <Pie
              data={filteredData}
              cx="50%"
              cy="50%"
              labelLine={
                filteredData.length > 1 &&
                filteredData.some(
                  (d) => d.value === totalValue && totalValue > 0
                )
                  ? false
                  : true
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              nameKey="name"
              label={renderLabel}
            >
              {filteredData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name: string, props: any) => {
                const percentage =
                  totalValue > 0 ? ((value / totalValue) * 100).toFixed(0) : 0;
                return [
                  `${value} (${percentage}%)`,
                  props.payload.payload.name,
                ];
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="flex items-center justify-center h-full text-gray-500">
          Không có dữ liệu để hiển thị.
        </div>
      )}
    </div>
  );
};

const StatisticTabContent: React.FC<StatisticTabContentProps> = ({ user }) => {
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [eventStats, setEventStats] = useState<EventStats | null>(null);
  const [newsStats, setNewsStats] = useState<NewsStats | null>(null);
  const [userEngagementStats, setUserEngagementStats] = useState<UserEngagementStats | null>(null); // State mới
  
  const [summaryData, setSummaryData] = useState<SummaryChartData[]>([]);
  const [dateRange, setDateRange] = useState<[Date | null, Date | null]>([
    new Date(new Date().setMonth(new Date().getMonth() - 6)),
    new Date(),
  ]);
  const [startDate, endDate] = dateRange;

  const [isLoadingUserStats, setIsLoadingUserStats] = useState(true);
  const [isLoadingEventStats, setIsLoadingEventStats] = useState(true);
  const [isLoadingNewsStats, setIsLoadingNewsStats] = useState(true);
  const [isLoadingUserEngagementStats, setIsLoadingUserEngagementStats] = useState(true); // State mới
  const [isLoadingSummary, setIsLoadingSummary] = useState(true);

  const [errorUserStats, setErrorUserStats] = useState<string | null>(null);
  const [errorEventStats, setErrorEventStats] = useState<string | null>(null);
  const [errorNewsStats, setErrorNewsStats] = useState<string | null>(null);
  const [errorUserEngagementStats, setErrorUserEngagementStats] = useState<string | null>(null); // State mới
  const [errorSummary, setErrorSummary] = useState<string | null>(null);

  const fetchData = useCallback(
    async <T,>(
      url: string,
      token: string | null,
      processor: (data: any[]) => T,
      setter: React.Dispatch<React.SetStateAction<T | null>>,
      errorSetter: React.Dispatch<React.SetStateAction<string | null>>,
      loadingSetter: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
      if (!user || !token) {
        errorSetter("Yêu cầu xác thực.");
        loadingSetter(false);
        return;
      }
      loadingSetter(true);
      errorSetter(null);
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          cache: "no-store",
        });
        if (!res.ok) {
          let errorMsg = `Lỗi ${res.status}`;
          try {
            const errData = await res.json();
            errorMsg = errData.message || errorMsg;
          } catch (_) {}
          throw new Error(errorMsg);
        }
        const apiResponse = await res.json();
        if (apiResponse.code !== 1000 || !Array.isArray(apiResponse.result)) {
          throw new Error(
            apiResponse.message || "Định dạng dữ liệu không hợp lệ"
          );
        }
        setter(processor(apiResponse.result));
      } catch (e: any) {
        errorSetter(e.message || "Không thể tải dữ liệu thống kê.");
      } finally {
        loadingSetter(false);
      }
    },
    [user]
  );

  const generateSummaryData = useCallback(() => {
    if (!userStats || !eventStats || !newsStats || !startDate || !endDate)
      return [];

    const monthNames = [
      "Tháng 1", "Tháng 2", "Tháng 3", "Tháng 4", "Tháng 5", "Tháng 6",
      "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10", "Tháng 11", "Tháng 12",
    ];

    const start = new Date(startDate);
    const end = new Date(endDate);
    const monthDiff =
      (end.getFullYear() - start.getFullYear()) * 12 +
      end.getMonth() -
      start.getMonth();

    if (monthDiff < 0 || isNaN(monthDiff)) return [];

    return Array.from({ length: monthDiff + 1 }, (_, i) => {
      const currentMonth = new Date(start);
      currentMonth.setMonth(start.getMonth() + i);
      const monthLabel =
        monthNames[currentMonth.getMonth()] + " " + currentMonth.getFullYear();

      const approvedEvents = eventStats.approvedEvents || 0;
      const totalEvents = eventStats.totalEvents || 1; 
      const approvedNews = newsStats.approvedNews || 0;
      const totalNews = newsStats.totalNews || 1;

      const progress = monthDiff > 0 ? i / monthDiff : 1; 
      const monthFactor = 0.5 + progress * 0.5; 
      
      const approvalRate = Math.max(0, Math.min(100, Math.round(
        ((approvedEvents / (totalEvents === 0 ? 1 : totalEvents)) * 50 + 
         (approvedNews / (totalNews === 0 ? 1 : totalNews)) * 50) *
        (0.7 + progress * 0.3) 
      )));


      return {
        name: monthLabel,
        users: Math.round((userStats.totalUsers || 0) * monthFactor),
        events: Math.round((eventStats.totalEvents || 0) * monthFactor),
        news: Math.round((newsStats.totalNews || 0) * monthFactor),
        approvalRate: isNaN(approvalRate) ? 0 : approvalRate,
      };
    });
  }, [userStats, eventStats, newsStats, startDate, endDate]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (user && user.id && token) {
      fetchData<UserStats>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/users`,
        token,
        (usersData: ApiUserDetail[]) => {
          const totalUsers = usersData.length;
          const activeUsers = usersData.filter(
            (u) => u.isBanned !== true 
          ).length;
          const bannedUsers = usersData.filter(
            (u) => u.isBanned === true
          ).length;
          return { totalUsers, activeUsers, bannedUsers };
        },
        setUserStats,
        setErrorUserStats,
        setIsLoadingUserStats
      );

      fetchData<EventStats>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events`,
        token,
        (eventsData: EventDisplayInfo[]) => {
          let maxAttendeesInUserEvent = 0;
          if(user && user.id){
            eventsData.forEach(event => {
              if (event.createdBy === user.id) {
                const count = event.currentAttendeesCount ?? (Array.isArray(event.attendees) ? event.attendees.length : 0);
                if (count > maxAttendeesInUserEvent) {
                  maxAttendeesInUserEvent = count;
                }
              }
            });
          }
          return {
            totalEvents: eventsData.length,
            approvedEvents: eventsData.filter((e) => e.status === "APPROVED").length,
            pendingEvents: eventsData.filter((e) => e.status === "PENDING").length,
            rejectedEvents: eventsData.filter((e) => e.status === "REJECTED").length,
            upcomingEvents: eventsData.filter(
              (e) => e.event_status === "UPCOMING" && e.status === "APPROVED"
            ).length,
            ongoingEvents: eventsData.filter(
              (e) => e.event_status === "ONGOING" && e.status === "APPROVED"
            ).length,
            completedEvents: eventsData.filter(
              (e) => e.event_status === "COMPLETED" && e.status === "APPROVED"
            ).length,
            maxAttendeesInOneEvent: maxAttendeesInUserEvent,
          };
        },
        setEventStats,
        setErrorEventStats,
        setIsLoadingEventStats
      );

      fetchData<NewsStats>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/news/status`, 
        token,
        (newsData: NewsItem[]) => {
          return {
            totalNews: newsData.length,
            approvedNews: newsData.filter((n) => n.status === "APPROVED").length,
            pendingNews: newsData.filter((n) => n.status === "PENDING").length,
            rejectedNews: newsData.filter((n) => n.status === "REJECTED").length,
          };
        },
        setNewsStats,
        setErrorNewsStats,
        setIsLoadingNewsStats
      );

      fetchData<UserEngagementStats>(
        `${process.env.NEXT_PUBLIC_API_BASE_URL}/identity/api/events/attendee/${user.id}`,
        token,
        (registeredEventsData: any[]) => ({ registeredEventsCount: registeredEventsData.length }),
        setUserEngagementStats,
        setErrorUserEngagementStats,
        setIsLoadingUserEngagementStats
      );

    } else if (!user) {
      setErrorUserStats("Vui lòng đăng nhập để xem thống kê.");
      setErrorEventStats("Vui lòng đăng nhập để xem thống kê.");
      setErrorNewsStats("Vui lòng đăng nhập để xem thống kê.");
      setErrorUserEngagementStats("Vui lòng đăng nhập để xem thống kê.");
      setIsLoadingUserStats(false);
      setIsLoadingEventStats(false);
      setIsLoadingNewsStats(false);
      setIsLoadingUserEngagementStats(false);
    }
  }, [user, fetchData]);

  useEffect(() => {
    if (
      !isLoadingUserStats &&
      !isLoadingEventStats &&
      !isLoadingNewsStats &&
      userStats &&
      eventStats &&
      newsStats &&
      startDate &&
      endDate
    ) {
      setIsLoadingSummary(true);
      try {
        const data = generateSummaryData();
        setSummaryData(data);
      } catch (e) {
        setErrorSummary("Không thể tạo dữ liệu tổng hợp");
      } finally {
        setIsLoadingSummary(false);
      }
    }
  }, [
    isLoadingUserStats,
    isLoadingEventStats,
    isLoadingNewsStats,
    userStats,
    eventStats,
    newsStats,
    startDate,
    endDate,
    generateSummaryData,
  ]);

  const eventApprovalData = useMemo(
    () =>
      eventStats
        ? [
            { name: "Đã duyệt", value: eventStats.approvedEvents, color: "#34D399" },
            { name: "Chờ duyệt", value: eventStats.pendingEvents, color: "#FBBF24" },
            { name: "Từ chối", value: eventStats.rejectedEvents, color: "#F87171" },
          ]
        : [],
    [eventStats]
  );

  const newsApprovalData = useMemo(
    () =>
      newsStats
        ? [
            { name: "Đã duyệt", value: newsStats.approvedNews, color: "#34D399" },
            { name: "Chờ duyệt", value: newsStats.pendingNews, color: "#FBBF24" },
            { name: "Từ chối", value: newsStats.rejectedNews, color: "#F87171" },
          ]
        : [],
    [newsStats]
  );

  const userStatusData = useMemo(
    () =>
      userStats
        ? [
            { name: "Hoạt động", value: userStats.activeUsers, color: "#34D399" },
            { name: "Bị khóa", value: userStats.bannedUsers, color: "#F87171" },
          ]
        : [],
    [userStats]
  );

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white p-6 rounded-lg shadow">
        <ExclamationTriangleIcon className="w-16 h-16 text-yellow-500 mb-4" />
        <p className="text-center text-xl font-semibold text-gray-700">
          Vui lòng đăng nhập để xem thống kê.
        </p>
      </div>
    );
  }

  const hasError =
    errorUserStats || errorEventStats || errorNewsStats || errorSummary || errorUserEngagementStats;
  const isLoadingOverall =
    isLoadingUserStats ||
    isLoadingEventStats ||
    isLoadingNewsStats ||
    isLoadingSummary ||
    isLoadingUserEngagementStats;

  if (hasError && !isLoadingOverall) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[300px] bg-white p-6 rounded-lg shadow">
        <CrossCircledIcon className="w-16 h-16 text-red-500 mb-4" />
        <p className="text-center text-xl font-semibold text-gray-700">
          Không thể tải dữ liệu thống kê
        </p>
        <p className="text-center text-gray-500 mt-2">
          {errorUserStats || errorEventStats || errorNewsStats || errorSummary || errorUserEngagementStats}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 py-4">
      <section>
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 flex items-center">
            <UpdateIcon className="w-7 h-7 mr-3 text-indigo-600" />
            Tổng quan hệ thống
          </h2>
          <DateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={setDateRange}
          />
        </div>
        <SummaryComboChart data={summaryData} isLoading={isLoadingSummary} />
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <PersonIcon className="w-7 h-7 mr-3 text-blue-600" />
          Thống kê Người dùng & Tương tác
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Tổng số người dùng"
            value={userStats?.totalUsers ?? 0}
            icon={<PersonIcon className="w-6 h-6" />}
            isLoading={isLoadingUserStats}
            color="bg-blue-500"
          />
          <StatCard
            title="Người dùng hoạt động"
            value={userStats?.activeUsers ?? 0}
            icon={<CheckCircledIcon className="w-6 h-6" />}
            isLoading={isLoadingUserStats}
            color="bg-green-500"
          />
          <StatCard
            title="Người dùng bị khóa"
            value={userStats?.bannedUsers ?? 0}
            icon={<CrossCircledIcon className="w-6 h-6" />}
            isLoading={isLoadingUserStats}
            color="bg-red-500"
          />
          <StatCard
            title="Sự kiện đã đăng ký"
            value={userEngagementStats?.registeredEventsCount ?? 0}
            icon={<ListBulletIcon className="w-6 h-6" />}
            isLoading={isLoadingUserEngagementStats}
            color="bg-cyan-500"
            description="Số sự kiện bạn đã đăng ký tham gia."
          />
        </div>
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <CalendarIcon className="w-7 h-7 mr-3 text-purple-600" />
          Thống kê Sự kiện
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          <StatCard
            title="Tổng số sự kiện"
            value={eventStats?.totalEvents ?? 0}
            icon={<CalendarIcon className="w-6 h-6" />}
            isLoading={isLoadingEventStats}
            color="bg-purple-500"
          />
          <StatCard
            title="Sự kiện đã duyệt"
            value={eventStats?.approvedEvents ?? 0}
            icon={<CheckCircledIcon className="w-6 h-6" />}
            isLoading={isLoadingEventStats}
            color="bg-green-500"
          />
          <StatCard
            title="Tham dự nhiều nhất sự kiện của bạn"
            value={eventStats?.maxAttendeesInOneEvent ?? 0}
            icon={<StarIcon className="w-6 h-6" />}
            isLoading={isLoadingEventStats}
            color="bg-teal-500"
            description="Trong các sự kiện bạn tạo"
          />
           <StatCard
            title="Sự kiện chờ duyệt"
            value={eventStats?.pendingEvents ?? 0}
            icon={<StopwatchIcon className="w-6 h-6" />}
            isLoading={isLoadingEventStats}
            color="bg-yellow-500"
          />
        </div>
        <CustomPieChart
          title="Trạng thái phê duyệt sự kiện"
          data={eventApprovalData}
          isLoading={isLoadingEventStats}
        />
      </section>

      <section>
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-6 flex items-center">
          <ArchiveIcon className="w-7 h-7 mr-3 text-amber-600" />
          Thống kê Tin tức
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <StatCard
            title="Tổng số tin tức"
            value={newsStats?.totalNews ?? 0}
            icon={<ArchiveIcon className="w-6 h-6" />}
            isLoading={isLoadingNewsStats}
            color="bg-amber-500"
          />
          <StatCard
            title="Tin đã duyệt"
            value={newsStats?.approvedNews ?? 0}
            icon={<CheckCircledIcon className="w-6 h-6" />}
            isLoading={isLoadingNewsStats}
            color="bg-green-500"
          />
          <StatCard
            title="Tin chờ duyệt"
            value={newsStats?.pendingNews ?? 0}
            icon={<StopwatchIcon className="w-6 h-6" />}
            isLoading={isLoadingNewsStats}
            color="bg-yellow-500"
          />
        </div>
        <CustomPieChart
          title="Trạng thái phê duyệt tin tức"
          data={newsApprovalData}
          isLoading={isLoadingNewsStats}
        />
      </section>
    </div>
  );
};

export default StatisticTabContent;