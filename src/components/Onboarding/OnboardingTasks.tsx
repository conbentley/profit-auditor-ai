
import { Card } from "@/components/ui/card";
import { Loader2, PartyPopper } from "lucide-react";
import { TaskItem } from "./TaskItem";
import { useOnboardingTasks } from "./useOnboardingTasks";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export default function OnboardingTasks() {
  const { 
    tasks, 
    isLoading, 
    isGenerating, 
    showCompletionDialog,
    handleTaskCompletion,
    handleCompletionClose
  } = useOnboardingTasks();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
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

      <Dialog open={showCompletionDialog} onOpenChange={handleCompletionClose}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center flex flex-col items-center gap-4">
              <PartyPopper className="h-12 w-12 text-green-500" />
              <span>Congratulations!</span>
            </DialogTitle>
          </DialogHeader>
          <div className="text-center space-y-4">
            <p className="text-muted-foreground">
              You have completed your onboarding process. You're now ready to make the most of our platform!
            </p>
            <Button onClick={handleCompletionClose} className="w-full">
              Thank You
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
