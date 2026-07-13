"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  faLayerGroup,
  faReceipt,
  faTableList,
} from "@fortawesome/free-solid-svg-icons";
import type { IconDefinition } from "@fortawesome/fontawesome-svg-core";
import { Icon } from "@/components/ui/Icon";

type Tab = {
  href: string;
  label: string;
  icon: IconDefinition;
};

const TABS: readonly Tab[] = [
  { href: "/expenses", label: "Expenses", icon: faTableList },
  { href: "/receipts", label: "Receipts", icon: faReceipt },
  { href: "/categories", label: "Categories", icon: faLayerGroup },
] as const;

const DESKTOP_LINKS: readonly Tab[] = TABS;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppNav() {
  const pathname = usePathname();

  return (
    <>
      <nav className="nav nav-desktop" aria-label="Main">
        {DESKTOP_LINKS.map((link) => {
          const active = isActive(pathname, link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={active ? "nav-link-active" : undefined}
            >
              <Icon name={link.icon} />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>
      <nav className="bottom-nav" aria-label="Main">
        {TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={[
                "bottom-nav-item",
                active ? "bottom-nav-item-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <Icon name={tab.icon} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
