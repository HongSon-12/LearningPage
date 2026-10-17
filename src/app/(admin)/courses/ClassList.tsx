"use client";

import Link from "next/link";
import React, { useState } from "react";
import { Plus, Edit2, Trash2 } from "lucide-react";
import { createClass, deleteClass, updateClass } from "@/app/actions/class";

type ClassData = {
  id: string;
  courseType: string;
  code: string;
  name: string;
  courseBatch?: string | null;
  fee: number;
  location: string;
  startDate: Date;
  endDate: Date;
  startTime: string;
  endTime: string;
  registrationDeadline?: Date | null;
  totalLessons: number;
  targetAudiences: string[];
  certificateType: string;
  capacity: number;
  status: string;
  _count: { registrations: number };
};

export default function ClassList({ initialClasses, canCreate = true, canEdit = true }: { initialClasses: ClassData[]; canCreate?: boolean; canEdit?: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editingClass, setEditingClass] = useState<ClassData | null>(null);
  const [feeInput, setFeeInput] = useState<string>("0");

  const handleOpenEdit = (cls: ClassData) => {
    setEditingClass(cls);
    setFeeInput(cls.fee.toString().replace(/\B(?=(\d{3})+(?!\d))/g, "."));
    setShowModal(true);
  };

  const handleOpenAdd = () => {
    setEditingClass(null);
    setFeeInput("0");
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClass(null);
  };

  const handleFeeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, "");
    setFeeInput(rawValue ? parseInt(rawValue, 10).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") : "");
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    const formData = new FormData(e.currentTarget);
    
    let res;
    if (editingClass) {
      res = await updateClass(editingClass.id, formData);
    } else {
      res = await createClass(formData);
    }
    
    if (res.success) {
      handleCloseModal();
    } else {
      alert(res.error);
    }
    setIsLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa lớp học này?")) {
      const res = await deleteClass(id);
      if (!res.success) {
        alert(res.error);
      }
    }
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <button
          hidden={!canCreate}
          onClick={handleOpenAdd}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
        >
          <Plus size={18} /> Thêm Khóa học
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-gray-600 font-medium">
                <th className="p-4">Mã Lớp</th>
                <th className="p-4">Tên Lớp</th>
                <th className="p-4">Thời gian</th>
                <th className="p-4">Trạng thái</th>
                <th className="p-4 text-center">Học viên</th>
                <th className="p-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 text-gray-800">
              {initialClasses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500">
                    Chưa có khóa học nào. Hãy tạo mới.
                  </td>
                </tr>
              ) : (
                initialClasses.map((cls) => {
                  const remaining = cls.capacity - cls._count.registrations;
                  return (
                    <tr key={cls.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 font-bold text-blue-700">{cls.code}</td>
                      <td className="p-4 font-medium">{cls.name}</td>
                      <td className="p-4 text-sm text-gray-600">
                        {new Date(cls.startDate).toLocaleDateString("vi-VN")} <br />
                        <span className="text-gray-400">{cls.startTime} - {cls.endTime}</span>
                      </td>
                      <td className="p-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${remaining <= 0 ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>
                          {remaining <= 0 ? 'ĐÃ ĐẦY' : cls.status}
                        </span>
                      </td>
                      <td className="p-4 text-center font-medium">
                        <span className={remaining <= 0 ? 'text-rose-600 font-bold' : ''}>{cls._count.registrations}</span> / {cls.capacity}
                      </td>
                      <td className="p-4 flex justify-end gap-2">
                        <Link href={`/courses/${cls.id}`} className="px-3 py-2 text-blue-700 bg-blue-50 rounded-lg text-sm font-semibold">Quản lý học viên</Link>
                        <button 
                          hidden={!canEdit}
                          title="Sửa lớp học"
                          onClick={() => handleOpenEdit(cls)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button 
                          hidden={!canCreate}
                          onClick={() => handleDelete(cls.id)}
                          className="p-2 text-gray-500 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Simple Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50 sticky top-0 z-10">
              <h3 className="font-bold text-lg text-gray-800">{editingClass ? "Sửa Khóa Học" : "Thêm Khóa Học Mới"}</h3>
              <button onClick={handleCloseModal} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Loại khóa học</label>
                  <select name="courseType" defaultValue={editingClass?.courseType || "COMMUNITY_FIRST_AID"} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="COMMUNITY_FIRST_AID">Sơ cấp cứu cộng đồng</option>
                    <option value="CME_ABCDE">CME Tiếp cận ABCDE</option>
                    <option value="AMBULANCE_DRIVER">Nhân viên lái xe cấp cứu</option>
                    <option value="CPR_ADVANCED">Cấp cứu ngừng tuần hoàn hô hấp cơ bản và nâng cao</option>
                    <option value="CPR_BASIC">Cấp cứu ngừng tuần hoàn hô hấp cơ bản</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Mã lớp</label>
                  <input name="code" defaultValue={editingClass?.code} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="VD: CD2026" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tên lớp</label>
                  <input name="name" defaultValue={editingClass?.name} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Cấp cứu cơ bản..." />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Khóa (VD: K1, K2)</label>
                  <input name="courseBatch" defaultValue={editingClass?.courseBatch || ""} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" placeholder="Để trống nếu không có" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Học phí (VNĐ)</label>
                  <input type="text" value={feeInput} onChange={handleFeeChange} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  <input type="hidden" name="fee" value={feeInput.replace(/\./g, "")} />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Địa điểm học</label>
                  <input name="location" defaultValue={editingClass?.location || "TTCC115, Quận 10"} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày bắt đầu</label>
                  <input name="startDate" type="date" defaultValue={editingClass ? new Date(editingClass.startDate).toISOString().split('T')[0] : ""} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Ngày kết thúc</label>
                  <input name="endDate" type="date" defaultValue={editingClass ? new Date(editingClass.endDate).toISOString().split('T')[0] : ""} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ bắt đầu</label>
                  <input name="startTime" type="time" defaultValue={editingClass?.startTime || "08:00"} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Giờ kết thúc</label>
                  <input name="endTime" type="time" defaultValue={editingClass?.endTime || "17:00"} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Hạn chót đăng ký</label>
                  <input name="registrationDeadline" type="date" defaultValue={editingClass && editingClass.registrationDeadline ? new Date(editingClass.registrationDeadline).toISOString().split('T')[0] : ""} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Sĩ số tối đa</label>
                  <input name="capacity" type="number" defaultValue={editingClass?.capacity || 40} min={1} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Tổng số tiết</label>
                  <input name="totalLessons" type="number" defaultValue={editingClass?.totalLessons || 0} required className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Loại chứng chỉ</label>
                  <select name="certificateType" defaultValue={editingClass?.certificateType || "CERTIFICATE"} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="CERTIFICATE">Giấy chứng nhận</option>
                    <option value="CONFIRMATION">Giấy xác nhận</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Đối tượng đăng ký (Chọn nhiều)</label>
                <div className="grid grid-cols-2 gap-2 md:grid-cols-3">
                  {[
                    { value: "DOCTOR", label: "Bác sĩ" },
                    { value: "NURSE", label: "Điều dưỡng" },
                    { value: "PHYSICIAN", label: "Y sĩ" },
                    { value: "DRIVER", label: "Nhân viên lái xe" },
                    { value: "COMMUNITY", label: "Cộng đồng" },
                  ].map((role) => (
                    <label key={role.value} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                      <input type="checkbox" name="targetAudiences" value={role.value} defaultChecked={editingClass?.targetAudiences?.includes(role.value)} className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500" />
                      {role.label}
                    </label>
                  ))}
                </div>
              </div>

              {editingClass && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-1">Trạng thái lớp học</label>
                  <select name="status" defaultValue={editingClass.status} className="w-full p-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="OPEN">Đang mở (OPEN)</option>
                    <option value="FULL">Đã đầy (FULL)</option>
                    <option value="DONE">Đã kết thúc (DONE)</option>
                  </select>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-white py-4 border-t mt-4">
                <button type="button" onClick={handleCloseModal} className="px-4 py-2 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded font-medium transition-colors">
                  Hủy
                </button>
                <button type="submit" disabled={isLoading} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-bold transition-colors disabled:opacity-50">
                  {isLoading ? "Đang lưu..." : (editingClass ? "Lưu thay đổi" : "Lưu Khóa Học")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
