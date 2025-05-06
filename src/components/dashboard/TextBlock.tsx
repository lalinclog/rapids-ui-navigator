// components/dashboard/TextBlock.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { FontBoldIcon, FontItalicIcon } from '@radix-ui/react-icons';

const TextBlock: React.FC<{
  content: string;
  style?: React.CSSProperties;
  isEditing?: boolean;
  onUpdate?: (content: string) => void;
}> = ({ content, style, isEditing, onUpdate }) => {
  const [text, setText] = useState(content);
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);

  return (
    <div className="h-full w-full p-4" style={style}>
      {isEditing ? (
        <div className="flex flex-col h-full">
          <div className="flex gap-2 mb-2">
            <Button variant="ghost" size="sm" onClick={() => setIsBold(!isBold)}>
              <FontBoldIcon className={isBold ? 'text-primary' : ''} />
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsItalic(!isItalic)}>
              <FontItalicIcon className={isItalic ? 'text-primary' : ''} />
            </Button>
          </div>
          <Textarea
            className="flex-grow"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onUpdate?.(text)}
            style={{
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
            }}
          />
        </div>
      ) : (
        <div 
          className="h-full w-full"
          style={{
            ...style,
            fontWeight: isBold ? 'bold' : 'normal',
            fontStyle: isItalic ? 'italic' : 'normal',
          }}
        >
          {content}
        </div>
      )}
    </div>
  );
};