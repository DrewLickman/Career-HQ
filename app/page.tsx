import { CareerDashboard } from "../dashboard/CareerDashboard";
import type { DashboardFixture } from "../dashboard/types";
import fixture from "../sample-data/applications.json";

export default function Home() {
  return <CareerDashboard fixture={fixture as DashboardFixture} />;
}
