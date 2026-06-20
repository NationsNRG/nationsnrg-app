"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { supabase } from "@/lib/supabase";
import LogoutButton from "@/components/auth/LogoutButton";

type LeadStatus = "new" | "contacted" | "quoted" | "closed";

interface LeadRow {
  id: string;
  first_name: string | null;
  last_name: string | null;
  product_type: string | null;
  monthly_usage: number | null;
  assigned_agent: string | null;
  status: string | null;
  estimated_monthly_profit: number | null;
  lifetime_value: number | null;
  contract_term_months: number | null;
}

interface MetricsState {
  totalClosedMRR: number;
  totalLifetimeValue: number;
  totalPipelineValue: number;
  closeRate: number;
}

interface LeaderboardAgent {
  name: string;
  rank: number;
  deals: number;
  mrr: number;
  lifetime: number;
}

interface CommissionAgent {
  name: string;
  totalEarned: number;
  deals: number;
}

type FunnelState = Record<LeadStatus, number>;
type StageWeights = Record<LeadStatus, number>;

const DEFAULT_FUNNEL: FunnelState = {
  new: 0,
  contacted: 0,
  quoted: 0,
  closed: 0,
};

const DEFAULT_STAGE_WEIGHTS: StageWeights = {
  new: 0.1,
  contacted: 0.3,
  quoted: 0.6,
  closed: 1,
};

function normalizeStatus(status: string | null): LeadStatus {
  if (
    status === "new" ||
    status === "contacted" ||
    status === "quoted" ||
    status === "closed"
  ) {
    return status;
  }

  return "new";
}

function normalizeNumber(value: number | null | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export default function AdminDashboard() {
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [leaderboard, setLeaderboard] = useState<LeaderboardAgent[]>([]);
  const [commissions, setCommissions] = useState<CommissionAgent[]>([]);
  const [forecast, setForecast] = useState<number[]>([]);
  const [investorMode, setInvestorMode] = useState(false);
  const [multiple, setMultiple] = useState(6);
  const [chartReady, setChartReady] = useState(false);
  const [funnel, setFunnel] = useState<FunnelState>(DEFAULT_FUNNEL);
  const [stageWeights, setStageWeights] =
    useState<StageWeights>(DEFAULT_STAGE_WEIGHTS);
  const [monthlyBurn, setMonthlyBurn] = useState(5000);
  const [cashOnHand, setCashOnHand] = useState(50000);
  const [metrics, setMetrics] = useState<MetricsState>({
    totalClosedMRR: 0,
    totalLifetimeValue: 0,
    totalPipelineValue: 0,
    closeRate: 0,
  });

  const calculateMetrics = useCallback((data: LeadRow[]) => {
    const closed = data.filter((lead) => normalizeStatus(lead.status) === "closed");
    const pipeline = data.filter(
      (lead) => normalizeStatus(lead.status) !== "closed",
    );

    setMetrics({
      totalClosedMRR: closed.reduce(
        (sum, lead) => sum + normalizeNumber(lead.estimated_monthly_profit),
        0,
      ),
      totalLifetimeValue: closed.reduce(
        (sum, lead) => sum + normalizeNumber(lead.lifetime_value),
        0,
      ),
      totalPipelineValue: pipeline.reduce(
        (sum, lead) => sum + normalizeNumber(lead.lifetime_value),
        0,
      ),
      closeRate: data.length > 0 ? (closed.length / data.length) * 100 : 0,
    });
  }, []);

  const calculateLeaderboard = useCallback((data: LeadRow[]) => {
    const agentMap = new Map<string, Omit<LeaderboardAgent, "rank">>();

    data
      .filter((lead) => normalizeStatus(lead.status) === "closed")
      .forEach((lead) => {
        const agent = lead.assigned_agent?.trim() || "Unassigned";
        const current = agentMap.get(agent) ?? {
          name: agent,
          deals: 0,
          mrr: 0,
          lifetime: 0,
        };

        agentMap.set(agent, {
          ...current,
          deals: current.deals + 1,
          mrr: current.mrr + normalizeNumber(lead.estimated_monthly_profit),
          lifetime: current.lifetime + normalizeNumber(lead.lifetime_value),
        });
      });

    setLeaderboard(
      Array.from(agentMap.values())
        .sort((a, b) => b.lifetime - a.lifetime)
        .map((agent, index) => ({
          ...agent,
          rank: index + 1,
        })),
    );
  }, []);

  const calculateCommissions = useCallback((data: LeadRow[]) => {
    const agentMap = new Map<string, CommissionAgent>();

    data
      .filter((lead) => normalizeStatus(lead.status) === "closed")
      .forEach((lead) => {
        const agent = lead.assigned_agent?.trim() || "Unassigned";
        const payout =
          normalizeNumber(lead.estimated_monthly_profit) *
          normalizeNumber(lead.contract_term_months);

        const current = agentMap.get(agent) ?? {
          name: agent,
          totalEarned: 0,
          deals: 0,
        };

        agentMap.set(agent, {
          ...current,
          totalEarned: current.totalEarned + payout,
          deals: current.deals + 1,
        });
      });

    setCommissions(Array.from(agentMap.values()));
  }, []);

  const calculateForecast = useCallback(
    (data: LeadRow[]) => {
      const months = 12;
      const monthlyTotals = Array.from({ length: months }, () => 0);

      data.forEach((lead) => {
        const status = normalizeStatus(lead.status);
        const isClosed = status === "closed";

        const monthly = isClosed
          ? normalizeNumber(lead.estimated_monthly_profit)
          : normalizeNumber(lead.monthly_usage) * 0.05;

        const term = isClosed
          ? normalizeNumber(lead.contract_term_months)
          : months;

        const weight = stageWeights[status];

        for (let index = 0; index < months; index += 1) {
          if (index < term) {
            monthlyTotals[index] += monthly * weight;
          }
        }
      });

      setForecast(monthlyTotals);
    },
    [stageWeights],
  );

  const calculateFunnel = useCallback((data: LeadRow[]) => {
    const stageCounts: FunnelState = {
      new: 0,
      contacted: 0,
      quoted: 0,
      closed: 0,
    };

    data.forEach((lead) => {
      stageCounts[normalizeStatus(lead.status)] += 1;
    });

    setFunnel(stageCounts);
  }, []);

  const refreshDashboard = useCallback(
    (data: LeadRow[]) => {
      setLeads(data);
      calculateMetrics(data);
      calculateLeaderboard(data);
      calculateCommissions(data);
      calculateForecast(data);
      calculateFunnel(data);
    },
    [
      calculateMetrics,
      calculateLeaderboard,
      calculateCommissions,
      calculateForecast,
      calculateFunnel,
    ],
  );

  const fetchLeads = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, first_name, last_name, product_type, monthly_usage, assigned_agent, status, estimated_monthly_profit, lifetime_value, contract_term_months",
        )
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        return;
      }

      refreshDashboard((data ?? []) as LeadRow[]);
    } finally {
      setLoading(false);
    }
  }, [refreshDashboard]);

  const updateStatus = async (id: string, status: LeadStatus) => {
    await supabase.from("leads").update({ status }).eq("id", id);
    await fetchLeads();
  };

  const closeDeal = async (lead: LeadRow) => {
    const commission = prompt("Enter commission rate (example 0.05)");
    const term = prompt("Enter contract term in months (example 36)");

    if (!commission || !term) {
      return;
    }

    const monthlyProfit = normalizeNumber(lead.monthly_usage) * Number(commission);
    const lifetimeValue = monthlyProfit * Number(term);

    await supabase
      .from("leads")
      .update({
        status: "closed",
        commission_rate: Number(commission),
        estimated_monthly_profit: monthlyProfit,
        contract_term_months: Number(term),
        lifetime_value: lifetimeValue,
      })
      .eq("id", lead.id);

    await fetchLeads();
  };

  useEffect(() => {
    setChartReady(true);
  }, []);

  useEffect(() => {
    void fetchLeads();
  }, [fetchLeads]);

  useEffect(() => {
    calculateForecast(leads);
  }, [calculateForecast, leads]);

  const annualRevenue = metrics.totalClosedMRR * 12;
  const valuation = annualRevenue * multiple;

  const forecastChartData = forecast.map((value, index) => ({
    month: `Month ${index + 1}`,
    revenue: value,
  }));

  const totalLeads = funnel.new + funnel.contacted + funnel.quoted + funnel.closed;
  const contactRate = totalLeads > 0 ? (funnel.contacted / totalLeads) * 100 : 0;
  const quoteRate =
    funnel.contacted > 0 ? (funnel.quoted / funnel.contacted) * 100 : 0;
  const closeRate = totalLeads > 0 ? (funnel.closed / totalLeads) * 100 : 0;
  const monthlyForecastRevenue = forecast[0] ?? 0;
  const netBurn = monthlyBurn - monthlyForecastRevenue;
  const runwayMonths = netBurn > 0 ? cashOnHand / netBurn : Infinity;

  return (
    <main className="p-10">
      <div className="mb-6 flex items-center justify-between">
      <h1 className="text-3xl font-bold">Lead Dashboard</h1>
      <LogoutButton />
      </div>

      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="rounded bg-green-100 p-4">
          <div>Total Closed MRR</div>
          <div className="text-xl font-bold">
            ${metrics.totalClosedMRR.toFixed(2)}
          </div>
        </div>

        <div className="rounded bg-blue-100 p-4">
          <div>Total Lifetime Value</div>
          <div className="text-xl font-bold">
            ${metrics.totalLifetimeValue.toFixed(2)}
          </div>
        </div>

        <div className="rounded bg-yellow-100 p-4">
          <div>Total Pipeline Value</div>
          <div className="text-xl font-bold">
            ${metrics.totalPipelineValue.toFixed(2)}
          </div>
        </div>

        <div className="rounded bg-purple-100 p-4">
          <div>Close Rate</div>
          <div className="text-xl font-bold">{metrics.closeRate.toFixed(1)}%</div>
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">Sales Funnel</h2>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div className="rounded border bg-gray-100 p-4">
            <div className="text-xl font-bold">{funnel.new}</div>
            <div className="text-sm">New</div>
          </div>

          <div className="rounded border bg-yellow-100 p-4">
            <div className="text-xl font-bold">{funnel.contacted}</div>
            <div className="text-sm">Contacted</div>
            <div className="text-xs text-gray-600">{contactRate.toFixed(1)}%</div>
          </div>

          <div className="rounded border bg-blue-100 p-4">
            <div className="text-xl font-bold">{funnel.quoted}</div>
            <div className="text-sm">Quoted</div>
            <div className="text-xs text-gray-600">{quoteRate.toFixed(1)}%</div>
          </div>

          <div className="rounded border bg-green-100 p-4">
            <div className="text-xl font-bold">{funnel.closed}</div>
            <div className="text-sm">Closed</div>
            <div className="text-xs text-gray-600">{closeRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded border bg-gray-50 p-4">
        <h3 className="mb-3 font-bold">Stage Probabilities</h3>

        {(Object.keys(stageWeights) as LeadStatus[]).map((stage) => (
          <div key={stage} className="mb-3">
            <div className="flex justify-between text-sm">
              <span>{stage}</span>
              <span>{(stageWeights[stage] * 100).toFixed(0)}%</span>
            </div>

            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={stageWeights[stage]}
              onChange={(event) =>
                setStageWeights((current) => ({
                  ...current,
                  [stage]: Number(event.target.value),
                }))
              }
              className="w-full"
            />
          </div>
        ))}
      </div>

      <div className="mb-10 rounded border bg-gray-50 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold">Investor Mode</h2>

          <button
            onClick={() => setInvestorMode((current) => !current)}
            className="rounded bg-black px-4 py-2 text-white"
          >
            {investorMode ? "Disable" : "Enable"}
          </button>
        </div>

        {investorMode && (
          <>
            <div className="mb-4">
              <div className="mb-2 font-medium">Revenue Multiple: {multiple}x</div>

              <input
                type="range"
                min="3"
                max="15"
                value={multiple}
                onChange={(event) => setMultiple(Number(event.target.value))}
                className="w-full"
              />
            </div>

            <div className="mt-4 rounded bg-blue-100 p-4">
              <div className="mb-2 font-bold">Runway Calculator</div>

              <div className="mb-2">
                Monthly Burn:
                <input
                  type="number"
                  value={monthlyBurn}
                  onChange={(event) => setMonthlyBurn(Number(event.target.value))}
                  className="ml-2 w-24 border p-1"
                />
              </div>

              <div className="mb-2">
                Cash On Hand:
                <input
                  type="number"
                  value={cashOnHand}
                  onChange={(event) => setCashOnHand(Number(event.target.value))}
                  className="ml-2 w-24 border p-1"
                />
              </div>

              <div className="mt-2">
                Runway:{" "}
                {runwayMonths === Infinity
                  ? "Profitable"
                  : `${runwayMonths.toFixed(1)} months`}
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="rounded border p-4">
                <div className="text-sm">Annual Revenue</div>
                <div className="text-xl font-bold">${annualRevenue.toFixed(2)}</div>
              </div>

              <div className="rounded border p-4">
                <div className="text-sm">Valuation Multiple</div>
                <div className="text-xl font-bold">{multiple}x</div>
              </div>

              <div className="rounded border bg-green-100 p-4">
                <div className="text-sm">Estimated Valuation</div>
                <div className="text-2xl font-bold text-green-700">
                  ${valuation.toFixed(2)}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">Agent Leaderboard</h2>

        <div className="space-y-3">
          {leaderboard.map((agent) => (
            <div
              key={agent.name}
              className="flex justify-between rounded border p-4"
            >
              <div>
                <div className="font-bold">
                  #{agent.rank} {agent.name}
                </div>
                <div>Deals: {agent.deals}</div>
              </div>

              <div className="text-right">
                <div>MRR: ${agent.mrr.toFixed(2)}</div>
                <div>Lifetime: ${agent.lifetime.toFixed(2)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">Commission Payout Tracker</h2>

        <div className="space-y-3">
          {commissions.map((agent) => (
            <div
              key={agent.name}
              className="flex justify-between rounded border p-4"
            >
              <div>
                <div className="font-bold">{agent.name}</div>
                <div>Deals Closed: {agent.deals}</div>
              </div>

              <div className="text-right">
                <div className="font-bold text-green-600">
                  ${agent.totalEarned.toFixed(2)}
                </div>
                <div className="text-sm text-gray-500">
                  Total Commission Owed
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-10">
        <h2 className="mb-4 text-2xl font-bold">12-Month Revenue Forecast</h2>

        <div className="grid grid-cols-4 gap-4">
          {forecast.map((value, index) => (
            <div key={`forecast-${index + 1}`} className="rounded border p-4">
              <div className="text-sm">Month {index + 1}</div>
              <div className="text-xl font-bold">${value.toFixed(2)}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-6 rounded border bg-white p-4">
        <div className="h-80 w-full min-w-0">
          {chartReady ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={forecastChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#16a34a"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-gray-500">
              Loading chart...
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div>Loading...</div>
      ) : (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div key={lead.id} className="rounded border p-4">
              <div className="font-bold">
                {lead.first_name ?? ""} {lead.last_name ?? ""}
              </div>

              <div>{lead.product_type ?? "Unknown product"}</div>
              <div>Usage: {normalizeNumber(lead.monthly_usage)}</div>
              <div>Assigned: {lead.assigned_agent ?? "Unassigned"}</div>
              <div>Status: {normalizeStatus(lead.status)}</div>

              <div className="mt-2 space-x-2">
                <button
                  onClick={() => void updateStatus(lead.id, "contacted")}
                  className="rounded bg-yellow-500 px-3 py-1 text-white"
                >
                  Contacted
                </button>

                <button
                  onClick={() => void updateStatus(lead.id, "quoted")}
                  className="rounded bg-blue-500 px-3 py-1 text-white"
                >
                  Quoted
                </button>

                <button
                  onClick={() => void closeDeal(lead)}
                  className="rounded bg-green-600 px-3 py-1 text-white"
                >
                  Close Deal
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}