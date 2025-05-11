"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  EventDisplayInfo as MainEventInfo,
  NewsItem as MainNewsItem,
} from "../types/appTypes";

interface FetchedUserDetail {
  id: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  dob?: string;
  roles?: { name: string; description?: string; permissions?: any[] }[];
  avatar?: string;
  email?: string;
  gender?: boolean;
  position?: { id: string; name: string } | null;
  organizerRole?: { id: string; name: string } | null;
}

interface AttendeeEntry {
  userId: string;
  studentCode?: string;
  firstName?: string; 
  lastName?: string;  
  checkedInAt?: string | null;
  fullName?: string;
  attending?: boolean;
  resolvedName?: string; 
}

interface OrganizerEntry {
  userId: string;
  roleId?: string;
  roleName?: string;
  positionName?: string;
  fullName?: string;
  lastName?: string;
  firstName?: string;
  id?: string;
  name?: string;
  username?: string;
  resolvedName?: string;
}

interface ParticipantEntry {
  userId: string;
  roleId?: string;
  roleName?: string;
  positionName?: string;
  fullName?: string;
  lastName?: string;
  firstName?: string;
  id?: string;
  name?: string;
  username?: string;
  resolvedName?: string;
}

type EventType = MainEventInfo & {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdBy?: string;
  name?: string;
  purpose?: string;
  time?: string;
  location?: string;
  content?: string;
  attendees?: AttendeeEntry[];
  organizers?: OrganizerEntry[];
  participants?: ParticipantEntry[];
  permissions?: any[];
  createdAt?: string;
  deleted?: boolean;
  deletedAt?: string | null;
  deletedBy?: string | null;
  progressStatus?: "UPCOMING" | "ONGOING" | "COMPLETED" | "PENDING_APPROVAL";
  avatarUrl?: string | null;
  qrCodeUrl?: string | null;
  maxAttendees?: number;
  currentAttendeesCount?: number;
  createdByName?: string;
};

type NewsItemType = MainNewsItem & {
  status?: "PENDING" | "APPROVED" | "REJECTED";
  rejectionReason?: string | null;
  createdBy?:
    | {
        id: string;
        firstName?: string;
        lastName?: string;
        avatar?: string;
        username?: string;
      }
    | string;
  content?: string;
  coverImageUrl?: string;
  createdAt?: string;
  publishedAt?: string | null;
  event?: { id: string; name?: string } | null;
  createdByName?: string;
};

interface ApprovalItemDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: EventType | NewsItemType | null;
}

function isEvent(item: EventType | NewsItemType | null): item is EventType {
  return (
    item !== null &&
    "name" in item &&
    ("attendees" in item ||
      "organizers" in item ||
      "participants" in item ||
      "progressStatus" in item)
  );
}

const RenderHtmlContent: React.FC<{ htmlString?: string }> = ({
  htmlString,
}) => {
  if (!htmlString)
    return <p className="text-gray-500 italic">Không có nội dung.</p>;
  return (
    <div
      className="prose prose-sm max-w-none"
      dangerouslySetInnerHTML={{ __html: htmlString }}
    />
  );
};

const ApprovalItemDetailModal: React.FC<ApprovalItemDetailModalProps> = ({
  isOpen,
  onClose,
  item,
}) => {
  const [detailedItem, setDetailedItem] = useState<
    EventType | NewsItemType | null
  >(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [userCache, setUserCache] = useState<Record<string, FetchedUserDetail>>(
    {}
  );

  const userCacheRef = useRef(userCache);
  useEffect(() => {
    userCacheRef.current = userCache;
  }, [userCache]);

  const fetchUserDetails = useCallback(
    async (userId: string): Promise<FetchedUserDetail | null> => {
      if (!userId || typeof userId !== "string" || userId.trim() === "")
        return null;

      const trimmedUserId = userId.trim();
      if (userCacheRef.current[trimmedUserId]) {
        return userCacheRef.current[trimmedUserId];
      }

      const token = localStorage.getItem("authToken");
      const headers: HeadersInit = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      try {
        const response = await fetch(
          `http://localhost:8080/identity/users/notoken/${trimmedUserId}`,
          { headers }
        );
        if (!response.ok) {
          console.warn(
            `Failed to fetch user ${trimmedUserId}: ${response.status}`
          );
          return null;
        }
        const data = await response.json();
        if (data && data.code === 1000 && data.result && data.result.id) {
          const userData: FetchedUserDetail = data.result;
          setUserCache((prev) => ({ ...prev, [trimmedUserId]: userData }));
          return userData;
        } else {
          console.warn(
            `Invalid data structure for user ${trimmedUserId}:`,
            data
          );
          return null;
        }
      } catch (error) {
        console.error(`Error fetching user ${trimmedUserId}:`, error);
        return null;
      }
    },
    [setUserCache]
  );

  useEffect(() => {
    if (isOpen && item) {
      setIsLoadingDetails(true);
      const processItem = async () => {
        let processedItem: EventType | NewsItemType = JSON.parse(
          JSON.stringify(item)
        );

        const getNameFromDetail = (
          detail: FetchedUserDetail | null
        ): string | undefined => {
          if (!detail) return undefined;
          return (
            `${detail.lastName || ""} ${detail.firstName || ""}`.trim() ||
            detail.username
          );
        };

        if (isEvent(processedItem)) {
          if (
            processedItem.createdBy &&
            typeof processedItem.createdBy === "string"
          ) {
            const creatorDetail = await fetchUserDetails(
              processedItem.createdBy
            );
            processedItem.createdByName =
              getNameFromDetail(creatorDetail) || processedItem.createdBy;
          }

          if (processedItem.organizers) {
            processedItem.organizers = await Promise.all(
              processedItem.organizers.map(async (org) => {
                const userDetail = await fetchUserDetails(org.userId);
                return {
                  ...org,
                  resolvedName: getNameFromDetail(userDetail) || org.userId,
                };
              })
            );
          }

          if (processedItem.participants) {
            processedItem.participants = await Promise.all(
              processedItem.participants.map(async (p) => {
                const userDetail = await fetchUserDetails(p.userId);
                return {
                  ...p,
                  resolvedName: getNameFromDetail(userDetail) || p.userId,
                };
              })
            );
          }

        //   if (processedItem.attendees) {
        //     processedItem.attendees = await Promise.all(
        //       processedItem.attendees.map(async (att) => {
        //         if (
        //           att.userId &&
        //           (!att.firstName || !att.lastName || !att.fullName)
        //         ) {
        //           const userDetail = await fetchUserDetails(att.userId);
        //           const resolvedName = getNameFromDetail(userDetail);
        //           return {
        //             ...att,
        //             resolvedName: resolvedName || att.userId,
        //             firstName: userDetail?.firstName || att.firstName,
        //             lastName: userDetail?.lastName || att.lastName,
        //             fullName:
        //               resolvedName ||
        //               att.fullName ||
        //               `${userDetail?.lastName || att.lastName || ""} ${userDetail?.firstName || att.firstName || ""}`.trim(),
        //           };
        //         }
        //         return {
        //           ...att,
        //           resolvedName:
        //             att.fullName ||
        //             `${att.lastName || ""} ${att.firstName || ""}`.trim() ||
        //             att.userId,
        //         };
        //       })
        //     );
        //   }
        } else if (processedItem) {
          let createdByIdString: string | undefined = undefined;
          if (typeof processedItem.createdBy === "string") {
            createdByIdString = processedItem.createdBy;
          } else if (
            processedItem.createdBy &&
            typeof processedItem.createdBy === "object" &&
            processedItem.createdBy.id
          ) {
            createdByIdString = processedItem.createdBy.id;
          }

          if (createdByIdString) {
            const creatorDetail = await fetchUserDetails(createdByIdString);
            processedItem.createdByName =
              getNameFromDetail(creatorDetail) || createdByIdString;
            if (creatorDetail && typeof processedItem.createdBy !== "object") {
              (processedItem.createdBy as any) = {
                id: creatorDetail.id,
                firstName: creatorDetail.firstName,
                lastName: creatorDetail.lastName,
                avatar: creatorDetail.avatar,
                username: creatorDetail.username,
              };
            }
          } else if (
            processedItem.createdBy &&
            typeof processedItem.createdBy === "object"
          ) {
            const cb = processedItem.createdBy;
            processedItem.createdByName =
              `${cb.lastName || ""} ${cb.firstName || ""}`.trim() ||
              cb.username;
          }
        }
        setDetailedItem(processedItem);
        setIsLoadingDetails(false);
      };
      processItem();
    } else {
      setDetailedItem(null);
      if (!isOpen) {
        setUserCache({});
      }
    }
  }, [item, isOpen, fetchUserDetails]);

  if (!isOpen) return null;

  if (isLoadingDetails) {
    return (
      <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm">
        <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 text-center">
          <p className="text-lg font-semibold text-gray-700 animate-pulse">
            Đang tải chi tiết...
          </p>
        </div>
      </div>
    );
  }

  if (!detailedItem) {
    return null;
  }

  const currentItemIsEvent = isEvent(detailedItem);
  const title = currentItemIsEvent ? detailedItem.name : detailedItem.title;
  const status = detailedItem.status;
  const rejectionReason = detailedItem.rejectionReason;
  const baseCreatedAt = currentItemIsEvent
    ? (detailedItem as EventType).createdAt
    : (detailedItem as NewsItemType).createdAt;

  let createdByDisplay: React.ReactNode;
  if (currentItemIsEvent) {
    const eventItem = detailedItem as EventType;
    createdByDisplay = eventItem.createdByName ? (
      <span className="text-gray-800">{eventItem.createdByName}</span>
    ) : eventItem.createdBy ? (
      <span className="text-gray-700 italic">(ID: {eventItem.createdBy})</span>
    ) : (
      <span className="text-gray-500 italic">Không rõ</span>
    );
  } else {
    const newsItem = detailedItem as NewsItemType;
    if (newsItem.createdByName) {
      const cbObj =
        typeof newsItem.createdBy === "object" &&
        newsItem.createdBy &&
        "id" in newsItem.createdBy
          ? newsItem.createdBy
          : null;
      createdByDisplay = (
        <div className="flex items-center gap-2">
          {cbObj?.avatar && (
            <img
              src={cbObj.avatar}
              alt="Avatar"
              className="w-6 h-6 rounded-full object-cover"
            />
          )}
          <span className="text-gray-800">
            {newsItem.createdByName} {cbObj?.username && `(${cbObj.username})`}
          </span>
        </div>
      );
    } else if (typeof newsItem.createdBy === "string") {
      createdByDisplay = (
        <span className="text-gray-700 italic">(ID: {newsItem.createdBy})</span>
      );
    } else {
      createdByDisplay = <span className="text-gray-500 italic">Không rõ</span>;
    }
  }

  const formatDetailDate = (dateString?: string | null) => {
    if (!dateString) return "N/A";
    try {
      return new Date(dateString).toLocaleString("vi-VN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return "Ngày không hợp lệ";
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center p-4 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-800">
            Chi tiết {currentItemIsEvent ? "Sự kiện" : "Bảng tin"}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-3xl leading-none p-1"
          >
            &times;
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-grow space-y-5">
          <h3 className="text-2xl font-bold text-gray-900 mb-2">{title}</h3>

          {currentItemIsEvent && (detailedItem as EventType).avatarUrl && (
            <div className="my-3">
              <img
                src={(detailedItem as EventType).avatarUrl!}
                alt={`Ảnh bìa ${title}`}
                className="max-w-full h-auto max-h-60 rounded border border-gray-200 mx-auto shadow-sm"
              />
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-3 text-sm border-b pb-4">
            <p>
              <strong className="text-gray-600">ID:</strong>{" "}
              <span className="text-gray-800 break-all">{detailedItem.id}</span>
            </p>
            <p>
              <strong className="text-gray-600">Trạng thái:</strong>
              <span
                className={`ml-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
                  status === "APPROVED"
                    ? "bg-green-100 text-green-800"
                    : status === "REJECTED"
                    ? "bg-red-100 text-red-800"
                    : "bg-yellow-100 text-yellow-800"
                }`}
              >
                {status || "N/A"}
              </span>
            </p>
            <p>
              <strong className="text-gray-600">Ngày tạo:</strong>{" "}
              <span className="text-gray-800">
                {formatDetailDate(baseCreatedAt)}
              </span>
            </p>

            {currentItemIsEvent && (detailedItem as EventType).progressStatus && (
                                <p><strong className="text-gray-600">Trạng thái sự kiện:</strong> <span className="text-gray-800 font-medium">{(detailedItem as EventType).progressStatus}</span></p>
                        )}


            {status === "REJECTED" && rejectionReason && (
              <p className="md:col-span-2">
                <strong className="text-red-600">Lý do từ chối:</strong>{" "}
                <span className="text-red-700">{rejectionReason}</span>
              </p>
            )}
            {!currentItemIsEvent &&
              (detailedItem as NewsItemType).publishedAt && (
                <p>
                  <strong className="text-gray-600">Ngày đăng:</strong>{" "}
                  <span className="text-gray-800">
                    {formatDetailDate(
                      (detailedItem as NewsItemType).publishedAt
                    )}
                  </span>
                </p>
              )}

            <div className="md:col-span-2 pt-2 mt-2 border-t border-dashed">
              <strong className="text-gray-600 block mb-1.5">Người tạo:</strong>
              {createdByDisplay}
            </div>
          </div>

          {currentItemIsEvent && (
            <>
              <div className="space-y-2 text-sm">
                {(detailedItem as EventType).time && (
                  <p>
                    <strong className="text-gray-600">Thời gian:</strong>{" "}
                    <span className="text-gray-800">
                      {formatDetailDate((detailedItem as EventType).time)}
                    </span>
                  </p>
                )}
                {(detailedItem as EventType).location && (
                  <p>
                    <strong className="text-gray-600">Địa điểm:</strong>{" "}
                    <span className="text-gray-800">
                      {(detailedItem as EventType).location}
                    </span>
                  </p>
                )}
                {(detailedItem as EventType).purpose && (
                  <div>
                    <strong className="text-gray-600">Mục đích:</strong>{" "}
                    <div className="text-gray-800 mt-1 pl-2 border-l-2 border-gray-200">
                      {(detailedItem as EventType).purpose}
                    </div>
                  </div>
                )}
                {(detailedItem as EventType).maxAttendees !== undefined && (
                  <p>
                    <strong className="text-gray-600">Số người tối đa:</strong>{" "}
                    <span className="text-gray-800">
                      {(detailedItem as EventType).maxAttendees}
                    </span>
                  </p>
                )}
                {(detailedItem as EventType).currentAttendeesCount !==
                  undefined && (
                  <p>
                    <strong className="text-gray-600">Đã đăng ký:</strong>{" "}
                    <span className="text-gray-800">
                      {(detailedItem as EventType).currentAttendeesCount}
                    </span>
                  </p>
                )}
                {(detailedItem as EventType).qrCodeUrl && (
                  <div className="mt-2">
                    <strong className="text-gray-600 block mb-1">
                      Mã QR Sự kiện:
                    </strong>
                    <img
                      src={(detailedItem as EventType).qrCodeUrl!}
                      alt="Event QR Code"
                      className="w-32 h-32 border rounded"
                    />
                  </div>
                )}
              </div>

              {(detailedItem as EventType).content && (
                <div>
                  <strong className="text-gray-600 block mb-1 text-sm">
                    Nội dung/Mô tả chi tiết:
                  </strong>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 max-h-60 overflow-y-auto">
                    <RenderHtmlContent
                      htmlString={(detailedItem as EventType).content}
                    />
                  </div>
                </div>
              )}

              {(detailedItem as EventType).organizers &&
                (detailedItem as EventType).organizers!.length > 0 && (
                  <div>
                    <strong className="text-gray-600 block mb-2 text-sm">
                      Ban tổ chức:
                    </strong>
                    <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm">
                      {(detailedItem as EventType).organizers!.map(
                        (org, index) => (
                          <li
                            key={`org-${index}-${org.userId}`}
                            className="text-gray-700"
                          >
                            {org.resolvedName ||
                              org.fullName ||
                              `${org.lastName || ""} ${
                                org.firstName || ""
                              }`.trim() ||
                              `(ID: ${org.userId})`}
                            {org.positionName && ` - ${org.positionName}`}
                            {org.roleName && ` - ${org.roleName}`}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {(detailedItem as EventType).participants &&
                (detailedItem as EventType).participants!.length > 0 && (
                  <div>
                    <strong className="text-gray-600 block mb-2 text-sm">
                      Người tham dự (vai trò khác):
                    </strong>
                    <ul className="list-disc list-inside space-y-1.5 pl-2 text-sm">
                      {(detailedItem as EventType).participants!.map(
                        (p, index) => (
                          <li
                            key={`part-${index}-${p.userId}`}
                            className="text-gray-700"
                          >
                            {p.resolvedName || `(ID: ${p.userId})`}
                            {p.positionName && ` - ${p.positionName}`}
                            {p.roleName && ` - ${p.roleName}`}
                          </li>
                        )
                      )}
                    </ul>
                  </div>
                )}

              {/* {(detailedItem as EventType).attendees &&
                (detailedItem as EventType).attendees!.length > 0 && (
                  <div>
                    <strong className="text-gray-600 block mb-2 text-sm">
                      Danh sách người đăng ký:
                    </strong>
                    <div className="max-h-48 overflow-y-auto border rounded p-2 bg-gray-50">
                      <ul className="space-y-1 text-xs">
                        {(detailedItem as EventType).attendees!.map(
                          (att, index) => (
                            <li
                              key={`att-${index}-${att.userId}`}
                              className="text-gray-700 p-1 hover:bg-gray-100 rounded"
                            >
                              {att.resolvedName || `(ID: ${att.userId})`}
                              {att.studentCode && ` (${att.studentCode})`}
                              {att.checkedInAt && (
                                <span className="ml-2 text-green-600 font-semibold">
                                  (Đã điểm danh lúc{" "}
                                  {formatDetailDate(att.checkedInAt)})
                                </span>
                              )}
                              {!att.checkedInAt &&
                                (typeof att.attending === "undefined" ||
                                  att.attending === false ||
                                  att.attending === null) && (
                                  <span className="ml-2 text-orange-600">
                                    (Chưa điểm danh)
                                  </span>
                                )}
                            </li>
                          )
                        )}
                      </ul>
                    </div>
                  </div>
                )} */}
            </>
          )}

          {!currentItemIsEvent && (
            <div className="space-y-3 text-sm">
              {(detailedItem as NewsItemType).coverImageUrl && (
                <div>
                  <strong className="text-gray-600 block mb-1">Ảnh bìa:</strong>
                  <img
                    src={(detailedItem as NewsItemType).coverImageUrl}
                    alt={`Ảnh bìa cho ${title}`}
                    className="max-w-full h-auto rounded border border-gray-200 shadow-sm"
                  />
                </div>
              )}
              {(detailedItem as NewsItemType).event && (
                <p>
                  <strong className="text-gray-600">Sự kiện liên quan:</strong>{" "}
                  <span className="text-blue-600 font-medium">
                    {(detailedItem as NewsItemType).event!.name ||
                      `(ID: ${(detailedItem as NewsItemType).event!.id})`}
                  </span>
                </p>
              )}
              {(detailedItem as NewsItemType).content && (
                <div>
                  <strong className="text-gray-600 block mb-1">
                    Nội dung chi tiết:
                  </strong>
                  <div className="p-3 bg-gray-50 rounded border border-gray-200 max-h-80 overflow-y-auto">
                    <RenderHtmlContent
                      htmlString={(detailedItem as NewsItemType).content}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50 text-right flex-shrink-0">
          <button
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 text-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-opacity-50"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

export default ApprovalItemDetailModal;