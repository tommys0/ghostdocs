-- Add policy for owners to read their own projects directly
-- This fixes the chicken-and-egg problem where we can't read the project
-- after insert because the SELECT policy requires membership
CREATE POLICY "Owners can read own projects"
    ON projects FOR SELECT
    USING (auth.uid() = owner_id);
