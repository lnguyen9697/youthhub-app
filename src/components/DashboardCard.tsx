import type { ReactNode } from "react";

type DashboardCardProps = {
  title: string;
  value: string;
  children?: ReactNode;
};

export function DashboardCard({ title, value, children }: DashboardCardProps) {
  return (
    <section className="dashboard-card">
      <p>{title}</p>
      <strong>{value}</strong>
      {children ? <span>{children}</span> : null}
    </section>
  );
}
