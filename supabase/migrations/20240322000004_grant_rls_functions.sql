-- Grant EXECUTE on RLS helper functions to anon and authenticated roles.
-- Without these, RLS policies that use these functions return 42501 (permission denied)
-- because the API client roles cannot invoke the functions.

GRANT EXECUTE ON FUNCTION public.user_belongs_to_workspace(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.user_belongs_to_workspace(uuid) TO authenticated;

GRANT EXECUTE ON FUNCTION public.user_is_workspace_owner(uuid) TO anon;
GRANT EXECUTE ON FUNCTION public.user_is_workspace_owner(uuid) TO authenticated;
