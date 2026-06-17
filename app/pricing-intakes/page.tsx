import type { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import type { Database } from '@/types/supabase'

export const metadata: Metadata = {
  title: 'Pricing Intakes | NationsNRG',
  description: 'Internal review page for public pricing intakes.',
}

type PricingIntakeRow =
  Database['public']['Tables']['public_pricing_intakes']['Row']

function formatLabel(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  return value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) {
    return '—'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

export default async function PricingIntakesPage() {
  const { data, error } = await supabase
    .from('public_pricing_intakes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  const rows = (error ? [] : (data ?? [])) as PricingIntakeRow[]

  return (
    <div className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6">
        <div>
          <div className="text-sm font-medium uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
            NationsNRG Internal
          </div>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">
            Pricing Intakes
          </h1>
          <p className="mt-3 max-w-3xl text-sm text-slate-600 dark:text-slate-400">
            Public leads captured before the BOX widget opens.
          </p>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-950">
          <div className="overflow-x-auto">
            <table className="min-w-[1200px] divide-y divide-slate-200 text-sm dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900">
                <tr>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Intake
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Company / Contact
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Email / Phone
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Market
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Usage
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-medium text-slate-600 dark:text-slate-300">
                    Created
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {rows.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/60">
                    <td className="px-4 py-4 font-mono text-xs">{row.id}</td>
                    <td className="px-4 py-4">
                      <div className="font-medium">
                        {row.company_name || row.contact_name || 'Untitled Intake'}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.contact_name || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{row.email}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {row.phone || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>{row.zip_code || '—'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        {[row.state, row.utility].filter(Boolean).join(' • ') || '—'}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>Bill: {row.average_monthly_bill ?? '—'}</div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        Usage: {row.average_monthly_usage ?? '—'}
                      </div>
                    </td>
                    <td className="px-4 py-4">{formatLabel(row.status)}</td>
                    <td className="px-4 py-4">{formatDateTime(row.created_at)}</td>
                  </tr>
                ))}

                {rows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                    >
                      No pricing intakes found.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}