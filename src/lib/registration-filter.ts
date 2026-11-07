export type RegistrationFilter = {
    query: string;
    classId: string;
    type: string;
    batch: string;
    state: "" | "PENDING" | "APPROVED" | "REJECTED";
    document: "" | "unpaid" | "invoice" | "certificate" | "delivery";
    page: number;
    sort: string;
    desc: boolean;
};
export const registrationFilter: RegistrationFilter = { query: "", classId: "", type: "", batch: "", state: "", document: "", page: 1, sort: "createdAt", desc: true };
