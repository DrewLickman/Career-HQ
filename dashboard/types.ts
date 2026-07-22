export type Fit =
  | "strong-match"
  | "reasonable-stretch"
  | "low-probability-stretch"
  | "not-recommended";

export type Application = {
  id: string;
  employer: string;
  role: string;
  location: string;
  arrangement: string;
  status: string;
  fit: Fit;
  compensation: string;
  nextAction: string;
  nextActionDate: string;
  strongestMatch: string;
  largestGap: string;
  risk: string;
  updatedAt: string;
};

export type DashboardData = {
  private: true;
  workspaceStatus: "needs-setup" | "ready" | "error";
  applicant: { displayName: string; targetLane: string };
  generatedAt: string;
  applications: Application[];
  message?: string;
};
