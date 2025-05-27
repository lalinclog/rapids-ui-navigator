// components/dashboard/TextBlock.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { 
  BoldIcon, 
  ItalicIcon, 
  AlignLeftIcon, 
  AlignCenterIcon, 
  AlignRightIcon,
  TypeIcon,
  PaletteIcon,
  SaveIcon
} from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';

export const TextBlock: React.FC<{
  content: string;
  style?: React.CSSProperties;
  isEditing?: boolean;
  onUpdate?: (content: string, style?: React.CSSProperties) => void;
}> = ({ content, style = {}, isEditing, onUpdate }) => {
  const [text, setText] = useState(content);
  const [currentStyle, setCurrentStyle] = useState<React.CSSProperties>({
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fontSize: 16,
    color: '#000000',
    ...style
  });

  // Sync content and style with parent
  useEffect(() => {
    setText(content);
    setCurrentStyle({
      fontWeight: 'normal',
      fontStyle: 'normal',
      textAlign: 'left',
      fontSize: 16,
      color: '#000000',
      ...style
    });
  }, [content, style]);

  const handleStyleChange = (prop: keyof React.CSSProperties, value: any) => {
    const updatedStyle = { ...currentStyle, [prop]: value };
    setCurrentStyle(updatedStyle);
    // Auto-save changes
    onUpdate?.(text, updatedStyle);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSave = () => {
    onUpdate?.(text, currentStyle);
  };

  return (
    <div 
      className={cn(
        "h-full w-full p-4 flex flex-col",
        isEditing ? "min-h-[200px] min-w-[300px]" : ""
      )}
      style={currentStyle}
    >
      {isEditing ? (
        <div className="flex flex-col h-full gap-2">
          <div className="flex flex-wrap gap-1 mb-2">
            {/* Text formatting controls */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange(
                'fontWeight', 
                currentStyle.fontWeight === 'bold' ? 'normal' : 'bold'
              )}
            >
              <BoldIcon 
                className={currentStyle.fontWeight === 'bold' ? 'text-primary' : ''} 
                size={16} 
              />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange(
                'fontStyle', 
                currentStyle.fontStyle === 'italic' ? 'normal' : 'italic'
              )}
            >
              <ItalicIcon 
                className={currentStyle.fontStyle === 'italic' ? 'text-primary' : ''} 
                size={16} 
              />
            </Button>

            {/* Text alignment */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange('textAlign', 'left')}
            >
              <AlignLeftIcon 
                className={currentStyle.textAlign === 'left' ? 'text-primary' : ''} 
                size={16} 
              />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange('textAlign', 'center')}
            >
              <AlignCenterIcon 
                className={currentStyle.textAlign === 'center' ? 'text-primary' : ''} 
                size={16} 
              />
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStyleChange('textAlign', 'right')}
            >
              <AlignRightIcon 
                className={currentStyle.textAlign === 'right' ? 'text-primary' : ''} 
                size={16} 
              />
            </Button>

            {/* Font size */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <TypeIcon size={16} />
                  <span className="ml-1 text-xs">
                    {typeof currentStyle.fontSize === 'number' ? currentStyle.fontSize : 16}
                  </span>
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-64">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Font Size</h4>
                  <Slider
                    defaultValue={[typeof currentStyle.fontSize === 'number' ? currentStyle.fontSize : 16]}
                    min={8}
                    max={48}
                    step={1}
                    onValueChange={(value) => handleStyleChange('fontSize', value[0])}
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Text color */}
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="sm">
                  <PaletteIcon size={16} />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-48">
                <div className="space-y-2">
                  <h4 className="font-medium text-sm">Text Color</h4>
                  <Input
                    type="color"
                    value={currentStyle.color?.toString() || '#000000'}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                    className="h-10 w-full p-1"
                  />
                </div>
              </PopoverContent>
            </Popover>

            {/* Save button */}
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSave}
              className="ml-auto"
            >
              <SaveIcon size={16} />
            </Button>
          </div>

          <Textarea
            className="w-full flex-1 resize-none border rounded p-3"
            value={text}
            onChange={handleTextChange}
            style={{
              fontWeight: currentStyle.fontWeight,
              fontStyle: currentStyle.fontStyle,
              textAlign: currentStyle.textAlign,
              fontSize: currentStyle.fontSize,
              color: currentStyle.color,
              lineHeight: '1.5',
            }}
          />
        </div>
      ) : (
        <div 
          className="h-full w-full overflow-auto whitespace-pre-wrap"
          style={currentStyle}
        >
          {content}
        </div>
      )}
    </div>
  );
};

export default TextBlock;