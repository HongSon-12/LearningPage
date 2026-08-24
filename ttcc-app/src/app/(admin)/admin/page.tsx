import React from "react";
import prisma from "@/lib/prisma";
import Link from "next/link";
import DashboardCharts from "./components/DashboardCharts";

export default async function AdminDashboard() {
  const pendingCount = await prisma.registration.count({
    where: { paymentStatus: "PENDING" },
  });

  const paidCount = await prisma.registration.count({
    where: { paymentStatus: "PAID" },
  });

  const openClassesCount = await prisma.class.count({
    where: { status: "OPEN" },
  });

  const recentActivities = await prisma.registration.findMany({
    take: 8,
    orderBy: { createdAt: "desc" },
    include: { class: true },
  });

  // Analytics Data (Traffic Source)
  const sourceGroups = await prisma.trackingEvent.groupBy({
    by: ['source'],
    _count: { sessionId: true },
    where: { eventName: 'page_load' } // using page_load as the main visit indicator
  });
  const sourceData = sourceGroups.map(g => ({
    name: g.source ? (g.source === "direct" ? "Trực tiếp" : g.source.toUpperCase()) : "Không xác định",
    value: g._count.sessionId
  }));

  // Analytics Data (Funnel)
  const funnelGroups = await prisma.trackingEvent.groupBy({
    by: ['eventName'],
    _count: { sessionId: true }
  });
  
  const funnelMapping: Record<string, string> = {
    page_load: '1. Truy cập Web',
    view_hero: '2. Xem Đầu trang',
    view_problem: '3. Xem Vấn đề',
    view_courses: '4. Xem Lịch học',
    start_register: '5. Mở Form ĐK',
    submit_info: '6. Gửi Form Xong'
  };
  
  const order = ['page_load', 'view_hero', 'view_problem', 'view_courses', 'start_register', 'submit_info'];
  const funnelData = order.map(eventName => {
    const match = funnelGroups.find(g => g.eventName === eventName);
    return {
      name: funnelMapping[eventName],
      value: match ? match._count.sessionId : 0
    };
  }).filter(item => item.value > 0); // only show steps with > 0 visits

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Tổng quan hệ thống</h1>
        <Link href="/admin/courses" className="px-4 py-2 bg-[var(--color-brand-600)] hover:bg-[var(--color-brand-500)] rounded-md text-white font-medium transition-colors shadow-lg shadow-blue-500/20">
          Tạo Khóa học mới
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-gray-600 font-medium mb-2">Học viên Đã thanh toán</h3>
          <p className="text-4xl font-bold text-gradient">{paidCount}</p>
          <p className="text-sm text-emerald-600 mt-2 font-medium">Học viên chính thức</p>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-gray-600 font-medium mb-2">Lớp đang mở đăng ký</h3>
          <p className="text-4xl font-bold text-gradient">{openClassesCount}</p>
          <p className="text-sm text-emerald-600 mt-2 font-medium">Sẵn sàng tuyển sinh</p>
        </div>
        <div className="glass-card p-6 rounded-xl">
          <h3 className="text-gray-600 font-medium mb-2">Đăng ký chờ duyệt</h3>
          <p className="text-4xl font-bold text-rose-600">{pendingCount}</p>
          <p className="text-sm text-gray-500 mt-2">Cần xử lý ngay hôm nay</p>
        </div>
      </div>

      {/* Analytics Charts */}
      <DashboardCharts sourceData={sourceData} funnelData={funnelData} />

      <div className="glass-card rounded-xl p-6 min-h-[400px]">
        <h3 className="text-xl font-bold mb-4 border-b pb-3">Hoạt động đăng ký gần đây</h3>
        {recentActivities.length === 0 ? (
          <div className="text-gray-500 text-center py-20">
            Chưa có dữ liệu hoạt động.
          </div>
        ) : (
          <div className="space-y-4 mt-4">
            {recentActivities.map((reg) => (
              <div key={reg.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-100 hover:bg-white hover:shadow-sm transition-all">
                <div>
                  <p className="font-bold text-gray-800">
                    {reg.fullName} <span className="text-gray-500 font-normal text-sm">- {reg.phone}</span>
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    Đăng ký lớp: <span className="font-semibold text-blue-700">{reg.class.code}</span> ({reg.class.name})
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                    reg.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                    reg.paymentStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-700' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {reg.paymentStatus === 'PAID' ? 'ĐÃ TT' :
                     reg.paymentStatus === 'CANCELLED' ? 'HỦY' : 'CHỜ TT'}
                  </span>
                  <p className="text-xs text-gray-400 mt-2">
                    {reg.createdAt.toLocaleDateString("vi-VN", { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
