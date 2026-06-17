import type { Metadata } from 'next'
import Script from 'next/script'
import Link from 'next/link'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'NationsNRG',
  description:
    'Commercial electricity and natural gas procurement across deregulated U.S. markets.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-black text-white`}
    >
        <Script
          src="https://www.googletagmanager.com/gtag/js?id=G-33FVXR2NX8"
          strategy="afterInteractive"
        />

        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            window.gtag = gtag;

            gtag('js', new Date());

            gtag('config', 'G-33FVXR2NX8', {
              page_path: window.location.pathname,
            });
          `}
        </Script>

        <nav className="w-full border-b border-gray-800 bg-black">
          <div className="mx-auto flex max-w-6xl items-center justify-between px-8 py-5">
            <Link
              href="/"
              className="text-xl font-bold tracking-tight text-white transition hover:opacity-80"
            >
              NationsNRG
            </Link>

            <div className="hidden items-center gap-8 text-sm font-medium md:flex">
              <Link
                href="/"
                className="text-white transition hover:opacity-70"
              >
                Home
              </Link>

              <Link
                href="/pricing"
                className="text-white transition hover:opacity-70"
              >
                Rate Analysis
              </Link>

              <Link
                href="/book"
                className="text-white transition hover:opacity-70"
              >
                Consultation
              </Link>

              <Link
                href="/insights"
                className="text-white transition hover:opacity-70"
              >
                Insights
              </Link>

              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded bg-black px-5 py-2 text-sm font-semibold !text-white no-underline transition hover:opacity-90"
              >
                Get Started
              </Link>
            </div>
          </div>
        </nav>

        <main>{children}</main>

        <section className="bg-gray-900 px-8 py-20">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="mb-6 text-3xl font-bold text-white">Frequently Asked</h2>

            <div className="space-y-6 text-left text-gray-300">
              <div>
                <p className="font-semibold text-white">
                  Will switching suppliers interrupt service?
                </p>
                <p className="text-gray-300">
                  No. Your local utility continues delivering energy. Only the
                  supplier rate changes.
                </p>
              </div>

              <div>
                <p className="font-semibold text-white">
                  Is there a cost for the rate analysis?
                </p>
                <p className="text-gray-300">No. The analysis is complimentary and obligation-free.</p>
              </div>

              <div>
                <p className="font-semibold text-white">
                  How long does the process take?
                </p>
                <p className="text-gray-300">
                  Most rate comparisons are completed within 24–48 hours after
                  receiving your usage information.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="py-24 text-center">
          <div className="mx-auto max-w-4xl px-8">
            <h2 className="mb-6 text-4xl font-bold">
              Let Suppliers Compete. You Choose the Best Offer.
            </h2>

            <p className="mb-10 text-lg text-gray-400">
              Strategic procurement. Transparent contracts. Competitive pricing.
            </p>

            <Link
              href="/pricing"
              className="inline-flex items-center justify-center rounded bg-black px-10 py-5 text-lg font-semibold !text-white no-underline transition hover:opacity-90"
            >
              Get A Complimentary Rate Analysis
            </Link>
          </div>
        </section>

        <footer className="border-t border-gray-800 bg-gray-900">
          <div className="mx-auto grid max-w-6xl gap-12 px-8 py-16 text-sm text-gray-300 md:grid-cols-3">
            <div>
              <h4 className="mb-4 font-bold text-white">NationsNRG</h4>
              <p className="text-gray-400">
                Strategic electricity and natural gas procurement across
                deregulated U.S. markets.
              </p>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-white">Services</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Electricity Brokerage</li>
                <li>Natural Gas Procurement</li>
                <li>Rate Analysis</li>
                <li>Contract Advisory</li>
              </ul>
            </div>

            <div>
              <h4 className="mb-4 font-bold text-white">Contact</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Email: info@nationsnrg.com</li>
                <li>Commercial Accounts Only</li>
                <li>Available Across Deregulated States</li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 py-6 text-center text-xs text-gray-500">
            © {new Date().getFullYear()} NationsNRG. All rights reserved.
          </div>
        </footer>
      </body>
    </html>
  )
}