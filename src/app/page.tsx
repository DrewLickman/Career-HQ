import { CareerDashboard } from "../dashboard/CareerDashboard";
import { loadLocalDashboard } from "../dashboard/load-local-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export default async function Home() {
  const dashboard = await loadLocalDashboard();
  return <CareerDashboard dashboard={dashboard} />;
}
