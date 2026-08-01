export type Fit =
  | "strong-match"
  | "reasonable-stretch"
  | "low-probability-stretch"
  | "not-recommended";

export type PostingSnapshot = {
  sourceUrl: string;
  capturedAt: string;
  currentConfirmedAt: string;
  credibleSourceConfirmed: boolean;
  content: string;
};

export type ImportantAnswer = {
  question: string;
  answer: string;
  source: string;
  sensitive: boolean;
  approvalState: string;
};

export type MaterialFile = {
  kind: string;
};

export type MaterialVersion = {
  version: string;
  generatedAt: string;
  files: MaterialFile[];
  visualVerificationStatus: "required" | "passed" | "unknown";
};

export type Application = {
  id: string;
  employer: string;
  role: string;
  location: string;
  arrangement: string;
  employmentType: string;
  status: string;
  fit: Fit;
  compensation: string;
  nextAction: string;
  nextActionDate: string;
  strongestMatch: string;
  largestGap: string;
  risk: string;
  sourceUrl: string;
  postingSnapshots: PostingSnapshot[];
  importantAnswers: ImportantAnswer[];
  unresolvedQuestions: string[];
  materials: MaterialVersion[];
  approval: {
    authorizedAt: string;
    confirmation: string;
  } | null;
  submissionEvidence: {
    kind: string;
    description: string;
    recordedAt: string;
  } | null;
  createdAt: string;
  updatedAt: string;
};

export type DashboardData = {
  private: true;
  workspaceStatus: "needs-setup" | "ready" | "error";
  applicant: { displayName: string; targetLane: string };
  today: string;
  generatedAt: string;
  applications: Application[];
  message?: string;
};
