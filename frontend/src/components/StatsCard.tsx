import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Interface defining StatsCard component properties
 */
interface StatsCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  trend?: {
    value: string;
    positive: boolean;
  };
}

/**
 * StatsCard - Reusable component for displaying metric cards with icons and trends
 * @component
 * @param {StatsCardProps} props - Component properties including title, value, and trend data
 * @returns {JSX.Element} Styled metric card with optional trend indicator
 */
export default function StatsCard({ title, value, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="border-border bg-card hover:shadow-lg transition-shadow duration-200">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <h3 className="text-2xl font-bold text-card-foreground">{value}</h3>
            {trend && (
              <p className={`text-xs ${trend.positive ? "text-success" : "text-destructive"}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className="h-12 w-12 rounded-xl bg-gradient-primary flex items-center justify-center shadow-md">
            <Icon className="h-6 w-6 text-primary-foreground" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
