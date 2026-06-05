CREATE TABLE public.task_verification_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  email text,
  provider text,
  status text NOT NULL DEFAULT 'pending',
  reward integer NOT NULL DEFAULT 0,
  request_payload jsonb,
  response_payload jsonb,
  verified_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (task_id, user_id)
);
GRANT SELECT, INSERT, UPDATE ON public.task_verification_requests TO authenticated;
GRANT ALL ON public.task_verification_requests TO service_role;
ALTER TABLE public.task_verification_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read their own task verification requests"
ON public.task_verification_requests
FOR SELECT
TO authenticated
USING (
  user_id IN (
    SELECT users.id
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
  )
);
CREATE POLICY "Users can create their own task verification requests"
ON public.task_verification_requests
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IN (
    SELECT users.id
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
  )
);
CREATE POLICY "Users can update their own task verification requests"
ON public.task_verification_requests
FOR UPDATE
TO authenticated
USING (
  user_id IN (
    SELECT users.id
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
  )
)
WITH CHECK (
  user_id IN (
    SELECT users.id
    FROM public.users
    WHERE users.auth_user_id = auth.uid()
  )
);
CREATE TRIGGER trg_task_verification_requests_updated
BEFORE UPDATE ON public.task_verification_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();