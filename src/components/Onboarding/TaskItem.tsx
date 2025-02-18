
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Task } from "./types";
import { useNavigate } from "react-router-dom";

interface TaskItemProps {
  task: Task;
  isDisabled: boolean;
  isGenerating: boolean;
  requiredTask?: Task | null;
  onTaskClick: (taskId: string, route: string) => void;
}

export function TaskItem({ 
  task, 
  isDisabled, 
  isGenerating, 
  requiredTask, 
  onTaskClick 
}: TaskItemProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!task.isCompleted && task.id !== 'audit') {
      navigate(task.route);
    } else {
      onTaskClick(task.id, task.route);
    }
  };

  return (
    <div className="flex items-start gap-4">
      <div className="mt-1">
        {task.isCompleted ? (
          <CheckCircle2 className="w-6 h-6 text-green-500" />
        ) : (
          <Circle className="w-6 h-6 text-gray-300" />
        )}
      </div>
      <div className="flex-1">
        <h3 className="text-lg font-medium">{task.title}</h3>
        <p className="text-gray-500 mb-2">{task.description}</p>
        <Button 
          variant={task.isCompleted ? "outline" : "default"}
          onClick={handleClick}
          disabled={isDisabled || (task.id === 'audit' && isGenerating)}
        >
          {task.isCompleted 
            ? 'Completed - View Again' 
            : task.id === 'audit'
              ? isGenerating 
                ? <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </div>
                : 'Generate'
              : task.id === 'chat'
                ? 'Chat'
                : 'Connect'
          }
        </Button>
        {isDisabled && (
          <p className="text-sm text-orange-600 mt-1">
            {task.id === 'chat' 
              ? "Complete 'Connect Your Data' and 'Generate Your First Audit' first"
              : `Complete "${requiredTask?.title}" first`
            }
          </p>
        )}
      </div>
    </div>
  );
}
