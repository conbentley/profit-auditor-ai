
alter table public.profiles 
add column completed_onboarding_tasks text[] default array[]::text[];
