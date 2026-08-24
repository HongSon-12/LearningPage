"use client";

import React from "react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip as PieTooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as BarTooltip,
  ResponsiveContainer,
} from "recharts";

type Props = {
  sourceData: { name: string; value: number }[];
  funnelData: { name: string; value: number }[];
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#ffc658"];

export default function DashboardCharts({ sourceData, funnelData }: Props) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
      {/* Nguồn khách hàng */}
      <div className="glass-card p-6 rounded-xl min-h-[400px]">
        <h3 className="text-xl font-bold mb-4 border-b pb-3">Nguồn Khách hàng (Traffic Sources)</h3>
        {sourceData.length === 0 ? (
          <div className="text-gray-500 text-center py-20">Chưa có dữ liệu.</div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sourceData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {sourceData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <PieTooltip formatter={(value) => [`${value} lượt`, "Lượt truy cập"]} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Phễu chuyển đổi */}
      <div className="glass-card p-6 rounded-xl min-h-[400px]">
        <h3 className="text-xl font-bold mb-4 border-b pb-3">Phễu Hành vi Người dùng (Funnel)</h3>
        {funnelData.length === 0 ? (
          <div className="text-gray-500 text-center py-20">Chưa có dữ liệu.</div>
        ) : (
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={funnelData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="name" type="category" width={120} tick={{ fontSize: 12 }} />
                <BarTooltip formatter={(value) => [`${value} lượt`, "Số lượng"]} />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 4, 4, 0]}>
                  {funnelData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}
