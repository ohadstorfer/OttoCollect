
import React from "react";
import { HighlightText } from "./HighlightText";

interface WithHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export const withHighlight = (text: string, searchTerm?: string, className?: string) => {
  if (!searchTerm || searchTerm.trim() === '') return text;
  
  return (
    <HighlightText 
      text={text} 
      highlight={searchTerm}
      className={className}
    />
  );
};
