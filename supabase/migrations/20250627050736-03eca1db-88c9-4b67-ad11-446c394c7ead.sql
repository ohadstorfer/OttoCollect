
CREATE OR REPLACE FUNCTION create_message_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  sender_username text;
  existing_notification_id uuid;
  message_count integer;
  current_content text;
  last_notification_from_sender boolean;
BEGIN
  -- Get sender username
  SELECT username INTO sender_username
  FROM profiles
  WHERE id = NEW.sender_id;

  -- Check if the most recent unread notification for this receiver is a message from the same sender
  SELECT 
    CASE 
      WHEN type = 'message' AND reference_data->>'sender_id' = NEW.sender_id::text THEN true
      ELSE false
    END INTO last_notification_from_sender
  FROM notifications
  WHERE user_id = NEW.receiver_id
    AND is_read = false
  ORDER BY created_at DESC
  LIMIT 1;

  -- If the last notification was from the same sender, update it
  IF last_notification_from_sender = true THEN
    -- Get the existing notification details
    SELECT id, content INTO existing_notification_id, current_content
    FROM notifications
    WHERE user_id = NEW.receiver_id
      AND type = 'message'
      AND reference_data->>'sender_id' = NEW.sender_id::text
      AND is_read = false
    ORDER BY created_at DESC
    LIMIT 1;

    -- Extract current message count from existing notification
    IF current_content ~ '\d+ new messages' THEN
      message_count := (regexp_match(current_content, '(\d+) new messages'))[1]::integer + 1;
    ELSE
      message_count := 2; -- First message + this new one
    END IF;
    
    -- Update existing notification with new count
    UPDATE notifications
    SET 
      content = 'You''ve got ' || message_count || ' new messages from ' || sender_username,
      updated_at = now()
    WHERE id = existing_notification_id;
  ELSE
    -- Create new notification (either no previous notifications or last one was different type/sender)
    INSERT INTO notifications (
      user_id,
      type,
      title,
      content,
      reference_id,
      reference_data
    ) VALUES (
      NEW.receiver_id,
      'message',
      'New Message',
      sender_username || ' sent you a message',
      NEW.id,
      jsonb_build_object('sender_id', NEW.sender_id, 'sender_username', sender_username)
    );
  END IF;

  RETURN NEW;
END;
$function$;
