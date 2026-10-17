export type StudentDirectoryFilter = {
  query: string;
  review: "all" | "review" | "confirmed";
  classId: string;
  page: number;
};
export const defaultStudentFilter: StudentDirectoryFilter = {
  query: "",
  review: "all",
  classId: "",
  page: 1,
};
