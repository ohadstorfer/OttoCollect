
import React from "react";
import { HighlightText } from "./HighlightText";

interface WithHighlightProps {
  text: string;
  searchTerm: string;
  className?: string;
}

export const withHighlight = (text: string, searchTerm?: string, className?: string) => {
  console.log(`withHighlight: text="${text || ''}", searchTerm="${searchTerm || ''}"`);
  
  if (!text) {
    return ""; // Return empty string for null/undefined text
  }
  
  if (!searchTerm || searchTerm.trim() === '') {
    console.log("withHighlight: No search term, returning original text");
    return text;
  }
  
  console.log("withHighlight: Returning highlighted text component");
  return (
    <HighlightText 
      text={text} 
      highlight={searchTerm}
      className={className}
    />
  );
};
