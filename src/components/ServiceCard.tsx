import { ReactNode } from "react";

interface ServiceCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  offset?: boolean;
}

export const ServiceCard = ({ title, description, icon, offset }: ServiceCardProps) => {
  return (
    <div
      className={`card-3d p-6 bg-card rounded-3xl border border-primary/10 cursor-pointer ${
        offset ? "mt-8" : ""
      }`}
    >
      <div className="size-12 rounded-2xl bg-primary/10 flex items-center justify-center mb-4 text-primary transition-transform duration-300 group-hover:rotate-6">
        {icon}
      </div>
      <h3 className="font-bold text-secondary mb-1">{title}</h3>
      <p className="text-sm text-secondary/60">{description}</p>
    </div>
  );
};
