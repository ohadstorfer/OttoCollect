
import React from "react";

interface HighlightTextProps {
  text: string;
  highlight: string;
  className?: string;
}

export const HighlightText: React.FC<HighlightTextProps> = ({ 
  text, 
  highlight,
  className = ""
}) => {
  if (!highlight.trim() || !text) {
    return <span className={className}>{text}</span>;
  }

  const regex = new RegExp(`(${highlight.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);

  return (
    <span className={className}>
      {parts.map((part, i) => (
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-200 dark:bg-yellow-800">{part}</mark>
        ) : (
          <React.Fragment key={i}>{part}</React.Fragment>
        )
      ))}
    </span>
  );
};
