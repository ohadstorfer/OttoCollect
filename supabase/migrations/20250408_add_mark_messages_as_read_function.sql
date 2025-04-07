
-- Create a function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
  from_user_id uuid,
  to_user_id uuid
) RETURNS void AS $$
BEGIN
  UPDATE messages
  SET is_read = true
  WHERE sender_id = from_user_id 
    AND receiver_id = to_user_id 
    AND is_read = false;
END;
$$ LANGUAGE plpgsql;
