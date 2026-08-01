import { CareerDashboard } from "../dashboard/CareerDashboard";
import { loadLocalDashboard } from "../dashboard/load-local-data";
import {
  normalizeApplicationFilter,
  normalizeDashboardView,
} from "../dashboard/view-state";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type HomeProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function Home({ searchParams }: HomeProps) {
  const [dashboard, params] = await Promise.all([
    loadLocalDashboard(),
    searchParams,
  ]);
  return (
    <CareerDashboard
      dashboard={dashboard}
      initialView={normalizeDashboardView(params.view)}
      initialFilter={normalizeApplicationFilter(params.filter)}
    />
  );
}
