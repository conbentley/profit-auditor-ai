
import { Card } from "@/components/ui/card";
import { Recommendation } from "@/types/audit";

interface AuditRecommendationsProps {
  recommendations: Recommendation[];
}

export function AuditRecommendations({ recommendations }: AuditRecommendationsProps) {
  return (
    <div>
      <h4 className="font-medium mb-2">Recommendations</h4>
      <div className="space-y-4">
        {recommendations.map((rec, index) => (
          <Card key={index} className="p-4">
            <h5 className="font-medium">{rec.title}</h5>
            <p className="text-sm text-muted-foreground mt-1">
              {rec.description}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">
                Impact: {rec.impact}
              </span>
              <span className="text-xs px-2 py-1 bg-purple-100 text-purple-800 rounded">
                Difficulty: {rec.difficulty}
              </span>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
