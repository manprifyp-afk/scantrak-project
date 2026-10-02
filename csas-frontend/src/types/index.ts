export type Role = "STUDENT" | "LECTURER" | "ADMIN";

export interface User {
  id: string;
  email: string;
  fullName: string;
  role: Role;
}
