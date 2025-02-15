
import { Card } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

interface RevenueTrendChartProps {
  data: Array<{
    date: string;
    amount: number;
  }>;
}

export default function RevenueTrendChart({ data }: RevenueTrendChartProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium mb-4">Revenue Trend</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="date" />
            <YAxis 
              tickFormatter={(value) => formatCurrency(value)}
            />
            <Tooltip 
              formatter={(value: number) => formatCurrency(value)}
            />
            <Legend />
            <Line 
              type="monotone" 
              dataKey="amount" 
              stroke="#0088FE" 
              name="Revenue"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
