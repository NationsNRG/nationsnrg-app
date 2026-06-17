"use client";

import { useEffect, useState } from "react";

interface AnalyticsResponse {
  totals: {
    totalResponses: number;
    interestCount: number;
    declineCount: number;
    objectionCount: number;
    counterCount: number;
    rfiCount: number;
    nonStarterCount: number;
  };
  averageConfidence: number | null;
  averageResponseSpeedHours: number | null;
  latestResponse: {
    response_type: string | null;
  } | null;
}

interface EscalationSignal {
  type: string;
  severity: string;
  message: string;
  recommendedAction: string;
}

interface Props {
  dealId: string;
}

export default function SupplierResponseAnalyticsPanel({ dealId }: Props) {
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsResponse | null>(null);
  const [signals, setSignals] = useState<EscalationSignal[]>([]);
  const [error, setError] = useState<string | null>(null);

  async function loadAnalytics() {
    try {
      setLoading(true);
      setError(null);

      const res = await fetch(
        `/api/intake/deal/${dealId}/supplier-responses/analytics`,
      );
      const data = await res.json();

      if (!res.ok || !data.ok) {
        throw new Error(data.error ?? "Failed to load analytics");
      }

      setAnalytics(data.analytics);

      const { evaluateSupplierEscalation } = await import(
        "@/lib/deal-engine/supplier-escalation"
      );

      const nextSignals = evaluateSupplierEscalation({
        averageConfidence: data.analytics.averageConfidence,
        averageResponseSpeedHours:
          data.analytics.averageResponseSpeedHours,
        totals: {
          totalResponses: data.analytics.totals.totalResponses,
          interestCount: data.analytics.totals.interestCount,
          declineCount: data.analytics.totals.declineCount,
          nonStarterCount: data.analytics.totals.nonStarterCount,
        },
        latestResponseType:
          data.analytics.latestResponse?.response_type ?? null,
      });

      setSignals(nextSignals);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error loading analytics");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadAnalytics();
  }, [dealId]);

  return (
    <section className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-xl font-semibold text-white mb-2">
        Supplier Response Analytics
      </h2>
      <p className="text-sm text-gray-400 mb-4">
        Aggregate supplier feedback and escalation signals.
      </p>

      {error && (
        <div className="text-red-400 text-sm mb-4">{error}</div>
      )}

      {loading ? (
        <p className="text-gray-400 text-sm">Loading...</p>
      ) : analytics ? (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <Stat label="Total" value={analytics.totals.totalResponses} />
            <Stat label="Interest" value={analytics.totals.interestCount} />
            <Stat label="Declines" value={analytics.totals.declineCount} />
            <Stat label="RFI" value={analytics.totals.rfiCount} />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Stat
              label="Avg Confidence"
              value={analytics.averageConfidence ?? "—"}
            />
            <Stat
              label="Avg Response (hrs)"
              value={analytics.averageResponseSpeedHours ?? "—"}
            />
          </div>

          <div>
            <h3 className="text-sm font-semibold text-white mb-2">
              Escalation Signals
            </h3>

            {signals.length === 0 ? (
              <p className="text-gray-400 text-sm">
                No escalation signals detected.
              </p>
            ) : (
              <div className="space-y-3">
                {signals.map((s, i) => (
                  <div
                    key={i}
                    className="rounded-lg border border-gray-700 bg-black p-3"
                  >
                    <p className="text-sm text-white font-medium">
                      {s.message}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Action: {s.recommendedAction}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: any }) {
  return (
    <div className="bg-black border border-gray-800 rounded-lg p-4">
      <p className="text-xs text-gray-500 uppercase">{label}</p>
      <p className="text-white text-lg font-semibold mt-1">{value}</p>
    </div>
  );
}