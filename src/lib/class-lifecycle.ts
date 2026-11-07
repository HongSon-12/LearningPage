export type ClassStage = "upcoming" | "teaching" | "ended";
export const classStageLabels: Record<ClassStage, string> = {upcoming:"Sắp học",teaching:"Đang học",ended:"Đã kết thúc"};
export function classStage(course: {status:string;startDate:Date|string;endDate:Date|string}, today:string):ClassStage {
  const start = new Date(course.startDate).toISOString().slice(0,10);
  const end = new Date(course.endDate).toISOString().slice(0,10);
  if(course.status === "DONE" || end < today) return "ended";
  return start > today ? "upcoming" : "teaching";
}
