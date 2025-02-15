
import { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface StatCardProps {
  title: string;
  value: string | number;
  trend?: string;
  trendValue?: string;
  icon: LucideIcon;
  trendUp?: boolean;
  isLoading?: boolean;
}

const StatCard = ({
  title,
  value,
  trend,
  trendValue,
  icon: Icon,
  trendUp,
  isLoading = false,
}: StatCardProps) => {
  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-3 w-full">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-4 w-20" />
          </div>
          <div className="p-3 bg-primary/10 rounded-lg">
            <Icon className="w-6 h-6 text-primary/30" />
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <h3 className="text-2xl font-semibold mt-2">{value}</h3>
          {trend && (
            <p className="mt-2 text-sm">
              <span
                className={`inline-flex items-center ${
                  trendUp ? "text-green-600" : "text-red-600"
                }`}
              >
                {trendValue}
                <span className="ml-1">{trend}</span>
              </span>
            </p>
          )}
        </div>
        <div className="p-3 bg-primary/10 rounded-lg">
          <Icon className="w-6 h-6 text-primary" />
        </div>
      </div>
    </Card>
  );
};

export default StatCard;
