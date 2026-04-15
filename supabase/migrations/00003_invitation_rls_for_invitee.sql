-- Allow invited users to read their own invitations by token
-- This is needed for the invite acceptance page to work

CREATE POLICY "Invited users can read their invitations"
    ON project_invitations FOR SELECT
    USING (
        -- User's email matches the invitation email
        auth.jwt() ->> 'email' = email
        -- And invitation is not yet accepted
        AND accepted_at IS NULL
    );
