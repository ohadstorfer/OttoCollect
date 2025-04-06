
import React, { useState } from 'react';
import { MessageButton } from '@/components/messages/MessageButton';
import { useNavigate } from 'react-router-dom';
import { useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';

export function MessageIndicator() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const handleMessageClick = () => {
    navigate('/community');
  };
  
  // Only show if user is logged in and not already on community page
  if (!user || location.pathname === '/community') {
    return null;
  }
  
  return (
    <MessageButton userId={user.id} onClick={handleMessageClick} />
  );
}
