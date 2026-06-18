"use client";

import { usePathname } from "next/navigation";

import LogoutButton from '@/components/auth/LogoutButton';

interface NavItem {
  label: string;
  href: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "Intake Deals", href: "/intake/deal" },
  { label: "Create Deal", href: "/intake/deal/create" },
  { label: "Suppliers", href: "/admin/suppliers" },
  { label: "New Supplier", href: "/admin/suppliers/create" },
  { label: "Big Deal Desk", href: "/big-deal-desk" },
  { label: "Portfolio Rollup", href: "/portfolio-rollup" },
  { label: "Deal Runner", href: "/system/deal-runner" },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b border-gray-800 bg-black">
    <div className="mx-auto flex max-w-7xl items-center gap-3 px-6 py-4">
      {NAV_ITEMS.map((item) => {
        const isActive = pathname === item.href;

        return (
          <a
            key={item.href}
            href={item.href}
            className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
              isActive
                ? "bg-white text-black"
                : "bg-gray-900 text-white hover:bg-gray-800"
            }`}
          >
            {item.label}
          </a>
        );
      })}

      <div className="ml-auto">
        <LogoutButton />
      </div>
    </div>
    </nav>
  );
}