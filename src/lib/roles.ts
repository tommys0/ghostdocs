export type Role = "owner" | "manager" | "member" | "viewer";

export function canManageProject(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function canManageSettings(role: Role): boolean {
  return role === "owner";
}

export function canViewTeamActivity(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function canGenerateReports(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function canInviteMembers(role: Role): boolean {
  return role === "owner" || role === "manager";
}

export function getRoleLabel(role: Role): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "manager":
      return "Manager";
    case "member":
      return "Engineer";
    case "viewer":
      return "Viewer";
    default:
      return "Member";
  }
}

export function getRoleDescription(role: Role): string {
  switch (role) {
    case "owner":
      return "Full access to all features and settings";
    case "manager":
      return "Can view team activity, generate reports, and manage members";
    case "member":
      return "Can view personal activity and project updates";
    case "viewer":
      return "Read-only access to project information";
    default:
      return "";
  }
}
