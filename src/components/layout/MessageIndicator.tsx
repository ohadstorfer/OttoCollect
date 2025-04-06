
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
    navigate('/messaging');
  };
  
  // Only show if user is logged in and not already on messaging page
  if (!user || location.pathname === '/messaging') {
    return null;
  }
  
  return (
    <MessageButton userId={user.id} onClick={handleMessageClick} />
  );
}
