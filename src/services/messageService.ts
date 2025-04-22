
// Fix the property name issue:
async function sendMessage(senderId: string, receiverId: string, content: string, referenceItemId?: string) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        sender_id: senderId,
        receiver_id: receiverId,
        content: content,
        reference_item_id: referenceItemId
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
      return null;
    }

    return data;
  } catch (err) {
    console.error('Unexpected error in sendMessage:', err);
    return null;
  }
}
