import React, { useMemo } from 'react';
import { EventDisplayInfo, User } from '../homeuser'; // Adjust import path if needed

interface HomeTabContentProps {
    allEvents: EventDisplayInfo[];
    isLoadingEvents: boolean;
    errorEvents: string | null;
    registeredEventIds: Set<string>;
    createdEventIds: Set<string>;
    user: User | null;
    isLoadingRegisteredIds: boolean;
    isLoadingCreatedEventIds: boolean;
    isRegistering: string | null;
    onRegister: (event: EventDisplayInfo) => void;
    onEventClick: (event: EventDisplayInfo) => void;
    selectedEvent: EventDisplayInfo | null;
    onBackToList: () => void;
    search: string;
    setSearch: (value: string) => void;
    sortOption: string;
    setSortOption: (value: string) => void;
    timeFilterOption: string;
    setTimeFilterOption: (value: string) => void;
}

const getWeekRange = (
    refDate: Date
): { startOfWeek: Date; endOfWeek: Date } => {
    const d = new Date(refDate);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const start = new Date(d.setDate(diff));
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    end.setHours(23, 59, 59, 999);
    return { startOfWeek: start, endOfWeek: end };
};

const getMonthRange = (
    refDate: Date
): { startOfMonth: Date; endOfMonth: Date } => {
    const d = new Date(refDate);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    start.setHours(0, 0, 0, 0);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    end.setHours(23, 59, 59, 999);
    return { startOfMonth: start, endOfMonth: end };
};


const HomeTabContent: React.FC<HomeTabContentProps> = ({
    allEvents,
    isLoadingEvents,
    errorEvents,
    registeredEventIds,
    createdEventIds,
    user,
    isLoadingRegisteredIds,
    isLoadingCreatedEventIds,
    isRegistering,
    onRegister,
    onEventClick,
    selectedEvent,
    onBackToList,
    search, setSearch, sortOption, setSortOption, timeFilterOption, setTimeFilterOption,
}) => {

    const processedEvents = useMemo(() => {
        let evts = [...allEvents];

        if (search) {
            const l = search.toLowerCase();
            evts = evts.filter(
                (e) =>
                    e.title.toLowerCase().includes(l) ||
                    e.location.toLowerCase().includes(l)
            );
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        if (timeFilterOption === "upcoming") {
            evts = evts.filter((e) => new Date(e.date) >= today);
        } else if (timeFilterOption === "thisWeek") {
            const { startOfWeek, endOfWeek } = getWeekRange(new Date());
            evts = evts.filter((e) => {
                const d = new Date(e.date);
                return d >= startOfWeek && d <= endOfWeek;
            });
        } else if (timeFilterOption === "thisMonth") {
            const { startOfMonth, endOfMonth } = getMonthRange(new Date());
            evts = evts.filter((e) => {
                const d = new Date(e.date);
                return d >= startOfMonth && d <= endOfMonth;
            });
        }


        if (sortOption === "az") {
            evts.sort((a, b) => a.title.localeCompare(b.title));
        } else {
            evts.sort(
                (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
            );
        }
        return evts;
    }, [allEvents, search, timeFilterOption, sortOption]);

    if (isLoadingEvents) {
        return <p className="text-center text-gray-500 italic py-6">Đang tải sự kiện...</p>;
    }

     if (errorEvents) {
         return <p className="text-center text-red-600 bg-red-50 p-3 rounded border border-red-200">{errorEvents}</p>;
     }


    return (
        <div>
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                <h1 className="text-2xl sm:text-3xl font-bold text-blue-600">
                    🎉 Trang chủ Sự kiện
                </h1>
                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                   <div className="flex-1 sm:flex-none">
                        <select
                            id="sortOptionGuest"
                            value={sortOption}
                            onChange={(e) => setSortOption(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="date">📅 Ngày gần nhất</option>
                            <option value="az">🔤 A-Z</option>
                        </select>
                    </div>
                   <div className="flex-1 sm:flex-none">
                        <select
                            id="timeFilterOptionGuest"
                            value={timeFilterOption}
                            onChange={(e) => setTimeFilterOption(e.target.value)}
                            className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="upcoming">⏳ Sắp diễn ra</option>
                            <option value="thisWeek">🗓️ Tuần này</option>
                            <option value="thisMonth">🗓️ Tháng này</option>
                            <option value="all">♾️ Tất cả</option>
                        </select>
                    </div>
                </div>
            </div>
             <div className="relative w-full mb-6">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">🔍</span>
                <input
                    id="searchGuest"
                    type="text"
                    placeholder="Tìm sự kiện theo tên hoặc địa điểm..."
                    className="w-full p-3 pl-10 pr-4 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {selectedEvent ? (
                 <div className="p-6 border rounded-lg shadow-lg bg-gray-50">
                   <button
                        onClick={onBackToList}
                        className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center cursor-pointer"
                    >
                         <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                         </svg>
                        Quay lại danh sách
                    </button>
                    <h2 className="text-xl font-bold mb-4">{selectedEvent.title}</h2>
                    <p><strong>Ngày:</strong> {new Date(selectedEvent.date).toLocaleDateString("vi-VN")}</p>
                    <p><strong>Địa điểm:</strong> {selectedEvent.location}</p>
                     {selectedEvent.time && <p><strong>Thời gian chi tiết:</strong> {new Date(selectedEvent.time).toLocaleTimeString("vi-VN", { hour: '2-digit', minute: '2-digit'})}</p>}
                     {selectedEvent.purpose && <p><strong>Mục đích:</strong> {selectedEvent.purpose}</p>}
                     <p className="mt-4 whitespace-pre-wrap"><strong>Mô tả:</strong><br/>{selectedEvent.description || "Không có mô tả chi tiết."}</p>

                </div>
            ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {processedEvents.length > 0 ? (
                       processedEvents.map((event) => {
                            const isRegistered = registeredEventIds.has(event.id);
                            const isCreatedByUser = createdEventIds.has(event.id);
                            const processing = isRegistering === event.id;
                            const isEventUpcoming = new Date(event.date) >= new Date(new Date().setHours(0, 0, 0, 0));
                            const showRegisterButton = user && !isCreatedByUser && isEventUpcoming;
                            const canClickRegister = showRegisterButton && !isRegistered && !processing;

                            return (
                                <div
                                    key={event.id}
                                    className="p-5 bg-white shadow-md rounded-xl transform transition hover:scale-[1.03] hover:shadow-lg flex flex-col justify-between border border-transparent hover:border-blue-300"
                                >
                                    <div onClick={() => onEventClick(event)} className="cursor-pointer">
                                        <h2 className="text-lg font-semibold text-gray-800 mb-1 line-clamp-1">
                                            {event.title}
                                        </h2>
                                        <p className="text-sm text-gray-600">
                                            📅 {new Date(event.date).toLocaleDateString("vi-VN")}
                                        </p>
                                        <p className="text-sm text-gray-600 mb-3">
                                            📍 {event.location}
                                        </p>
                                    </div>

                                     <div className="mt-3">
                                        {isCreatedByUser ? (
                                            <button
                                                className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                                                disabled
                                            >
                                                ✨ Sự kiện của bạn
                                            </button>
                                        ) : showRegisterButton ? (
                                             <button
                                                onClick={(e) => {
                                                    if(canClickRegister) {
                                                        onRegister(event);
                                                    }
                                                }}
                                                className={`w-full px-4 py-2 rounded-lg text-white shadow-sm transition text-sm font-medium flex items-center justify-center ${isRegistered
                                                        ? "bg-gray-400 cursor-not-allowed"
                                                        : processing
                                                            ? "bg-blue-300 cursor-wait"
                                                            : "bg-blue-500 hover:bg-blue-600"
                                                    }`}
                                                disabled={!canClickRegister || isLoadingRegisteredIds || isLoadingCreatedEventIds}
                                            >
                                                {isRegistered ? (
                                                    <span>✅ Đã đăng ký</span>
                                                ) : processing ? (
                                                    <>
                                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                           <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" className="opacity-25"></circle>
                                                           <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" className="opacity-75"></path>
                                                        </svg>
                                                        ...
                                                    </>
                                                ) : (
                                                    <span className="cursor-pointer">📝 Đăng ký</span>
                                                )}
                                            </button>
                                        ) : (
                                             <>
                                                 {user && !isEventUpcoming && !isCreatedByUser && (
                                                     <button
                                                        className="w-full px-4 py-2 rounded-lg bg-gray-300 text-gray-600 cursor-not-allowed text-sm font-medium"
                                                        disabled
                                                     >
                                                        Đã kết thúc
                                                    </button>
                                                 )}
                                                {!user && isEventUpcoming && (
                                                     <button
                                                        onClick={(e) => { e.stopPropagation(); alert('Please login to register'); }}
                                                        className="w-full px-4 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200 transition text-sm font-medium"
                                                    >
                                                        Đăng nhập để đăng ký
                                                    </button>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <p className="text-gray-500 text-center col-span-1 md:col-span-2 py-6 italic">
                            Không tìm thấy sự kiện nào khớp.
                        </p>
                    )}
                </div>
            )}
        </div>
    );
};

export default HomeTabContent;