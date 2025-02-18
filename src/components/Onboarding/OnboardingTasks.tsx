
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { useOnboardingTasks } from "./useOnboardingTasks";

export default function OnboardingTasks() {
  const { tasks, isLoading, isGenerating, handleTaskCompletion } = useOnboardingTasks();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <Card className="p-6">
      <h2 className="text-2xl font-semibold mb-6">Welcome! Let's get you started</h2>
      <div className="space-y-6">
        {tasks.map((task) => {
          const requiredTask = task.requiredTask ? tasks.find(t => t.id === task.requiredTask) : null;
          const isDisabled = requiredTask && !requiredTask.isCompleted;

          return (
            <TaskItem
              key={task.id}
              task={task}
              isDisabled={isDisabled}
              isGenerating={isGenerating}
              requiredTask={requiredTask}
              onTaskClick={handleTaskCompletion}
            />
          );
        })}
      </div>
    </Card>
  );
}
