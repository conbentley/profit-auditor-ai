
import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts";
import { formatCurrency } from "@/lib/formatters";

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

interface ExpenseDistributionChartProps {
  data: Array<{
    name: string;
    value: number;
  }>;
}

export default function ExpenseDistributionChart({ data }: ExpenseDistributionChartProps) {
  return (
    <Card className="p-6">
      <h2 className="text-lg font-medium mb-4">Expense Distribution</h2>
      <div className="h-80">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={100}
              label={(entry) => entry.name}
            >
              {data.map((_, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip formatter={(value: number) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
