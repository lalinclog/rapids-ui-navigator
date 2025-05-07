
// components/dashboard/TextBlock.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { BoldIcon as FontBoldIcon, ItalicIcon as FontItalicIcon } from 'lucide-react';

export const TextBlock: React.FC<{
  content: string;
  style?: React.CSSProperties;
  isEditing?: boolean;
  onUpdate?: (content: string, style?: React.CSSProperties) => void;
}> = ({ content, style = {}, isEditing, onUpdate }) => {
  const [text, setText] = useState(content);
  const [isBold, setIsBold] = useState(style?.fontWeight === 'bold');
  const [isItalic, setIsItalic] = useState(style?.fontStyle === 'italic');

  const handleStyleChange = (styleProp: string, value: string) => {
    const updatedStyle = { ...style, [styleProp]: value };
    if (styleProp === 'fontWeight') {
      setIsBold(value === 'bold');
    } else if (styleProp === 'fontStyle') {
      setIsItalic(value === 'italic');
    }
    onUpdate?.(text, updatedStyle);
  };

  return (
    <div className="h-full w-full p-4" style={style}>
      {isEditing ? (
        <div className="flex flex-col h-full">
          <div className="flex gap-2 mb-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange('fontWeight', isBold ? 'normal' : 'bold')}
            >
              <FontBoldIcon className={isBold ? 'text-primary' : ''} size={16} />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange('fontStyle', isItalic ? 'normal' : 'italic')}
            >
              <FontItalicIcon className={isItalic ? 'text-primary' : ''} size={16} />
            </Button>
          </div>
          <Textarea
            className="flex-grow"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={() => onUpdate?.(text, {
              ...style,
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
            })}
            style={{
              fontWeight: isBold ? 'bold' : 'normal',
              fontStyle: isItalic ? 'italic' : 'normal',
            }}
          />
        </div>
      ) : (
        <div 
          className="h-full w-full overflow-auto"
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

export default TextBlock;
