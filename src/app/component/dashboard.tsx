"use client";
import Link from "next/link";
import { useUser } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
export default function Dashboard() {
  const { user } = useUser();
 // code xong rồi mở comment
//   const router = useRouter();

//   useEffect(() => {
//     if (!user) {
//       router.push("/login"); // chưa login thì chuyển về login
//     }
//   }, [user]);

//   if (!user) return null;
  const menuItems = [
    {
      label: "📅 Quản lý sự kiện",
      href: "/event-management",
      visible: user?.role === "admin" || user?.role === "organizer",
    },
    {
      label: "✅ Duyệt sự kiện",
      href: "/event-approval",
      visible: user?.role === "admin",
    },
    {
      label: "🧑‍🤝‍🧑 Thành viên CLB",
      href: "/member-management",
      visible: user?.role === "admin",
    },
    {
      label: "🧑‍💼 Chức vụ",
      href: "/roles-management",
      visible: user?.role === "admin",
    },
    {
      label: "📝 Người đăng ký",
      href: "/event-registrations",
      visible: user?.role === "organizer",
    },
    {
      label: "⭐ Sự kiện của tôi",
      href: "/my-events",
      visible: !!user,
    },
  ];

  return (
    <main className="p-6 max-w-7xl mx-auto">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">
          Chào mừng, {user?.name || "bạn"} 👋
        </h1>
        <p className="text-gray-500 mt-2">
          Hãy chọn chức năng bạn muốn sử dụng bên dưới
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        {menuItems
          .filter((item) => item.visible)
          .map((item) => (
            <Link href={item.href} key={item.href}>
              <div className="cursor-pointer border border-gray-200 hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 p-4 rounded-xl shadow-sm text-center">
                <span className="text-lg font-semibold text-gray-700 hover:text-blue-600">
                  {item.label}
                </span>
              </div>
            </Link>
          ))}
      </div>
    </main>
  );
}
