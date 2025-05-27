// components/dashboard/ImageBlock.tsx
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, Trash2, Edit, Save } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const uploadImage = async (file: File, onProgress?: (progress: number) => void): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  
  try {
    const response = await fetch('/api/bi/upload', {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error('Failed to upload image');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error uploading image:', error);
    toast({
      title: "Upload Failed",
      description: "Failed to upload image. Please try again.",
      variant: "destructive"
    });
    throw error;
  }
};

export const ImageBlock: React.FC<{
  url: string;
  altText?: string;
  isEditing?: boolean;
  onUpdate: (url: string, altText?: string, style?: React.CSSProperties) => void;
  style?: React.CSSProperties;
}> = ({ url, altText = '', isEditing, onUpdate, style = {} }) => {
  const [localUrl, setLocalUrl] = useState(url);
  const [localAltText, setLocalAltText] = useState(altText);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditingAltText, setIsEditingAltText] = useState(false);
  const [currentStyle, setCurrentStyle] = useState<React.CSSProperties>({
    objectFit: 'contain',
    objectPosition: 'center',
    ...style
  });

  // Sync with parent props
  useEffect(() => {
    setLocalUrl(url);
    setLocalAltText(altText);
  }, [url, altText]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      setUploadProgress(0);
      
      try {
        // Simulate progress (replace with actual progress events if your API supports it)
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, 90));
        }, 200);

        const result = await uploadImage(file, (progress) => {
          setUploadProgress(progress);
        });

        clearInterval(progressInterval);
        setUploadProgress(100);
        
        setLocalUrl(result.url);
        onUpdate(result.url, localAltText, currentStyle);
        
        toast({
          title: "Upload Successful",
          description: "Image has been uploaded successfully",
        });
        
        setTimeout(() => setUploadProgress(0), 500);
      } catch (error) {
        console.error('Error uploading image:', error);
        setUploadProgress(0);
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSave = () => {
    onUpdate(localUrl, localAltText, currentStyle);
    setIsEditingAltText(false);
  };

  const handleStyleChange = (property: string, value: string) => {
    const newStyle = { ...currentStyle, [property]: value };
    setCurrentStyle(newStyle);
    onUpdate(localUrl, localAltText, newStyle);
  };

  return (
    <div className="h-full w-full flex flex-col group">
      {/* Image display area */}
      <div className="flex-grow relative overflow-hidden">
        {localUrl ? (
          <>
            <img 
              src={localUrl} 
              alt={localAltText} 
              className={cn(
                "h-full w-full",
                currentStyle.objectFit === 'contain' ? 'object-contain' : 'object-cover',
                currentStyle.objectPosition === 'center' ? 'object-center' : 
                currentStyle.objectPosition === 'top' ? 'object-top' : 'object-bottom'
              )}
              style={{
                ...currentStyle,
                // Ensure these aren't overridden by className
                objectFit: undefined,
                objectPosition: undefined
              }}
            />
            {isLoading && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/80 gap-2 p-4">
                <Progress value={uploadProgress} className="w-full h-2" />
                <span className="text-sm text-muted-foreground">
                  {uploadProgress}% Uploaded
                </span>
              </div>
            )}
          </>
        ) : isEditing ? (
          <label className={`flex flex-col items-center justify-center gap-2 p-4 h-full cursor-pointer border-2 border-dashed rounded-lg ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
            {isLoading ? (
              <div className="flex flex-col items-center justify-center gap-2">
                <Progress value={uploadProgress} className="w-full h-2" />
                <span className="text-sm text-muted-foreground">
                  {uploadProgress}% Uploaded
                </span>
              </div>
            ) : (
              <>
                <ImagePlus className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Upload Image</span>
                <span className="text-xs text-muted-foreground">PNG, JPG, GIF up to 5MB</span>
              </>
            )}
            <input 
              type="file" 
              className="hidden"
              accept="image/png, image/jpeg, image/gif"
              onChange={handleFileChange}
              disabled={isLoading}
            />
          </label>
        ) : (
          <div className="h-full w-full flex items-center justify-center text-muted-foreground">
            No image selected
          </div>
        )}
      </div>

      {/* Editing controls */}
      {isEditing && (
        <div className="p-2 border-t flex flex-wrap gap-2 items-center">
          {localUrl ? (
            <>
              {isEditingAltText ? (
                <div className="flex gap-2 flex-grow">
                  <Input
                    type="text"
                    value={localAltText}
                    onChange={(e) => setLocalAltText(e.target.value)}
                    placeholder="Image description"
                    className="flex-grow text-sm"
                  />
                  <Button variant="ghost" size="sm" onClick={handleSave}>
                    <Save className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingAltText(true)}
                  className="flex-grow justify-start text-left truncate"
                >
                  <span className="truncate">{localAltText || 'Add description'}</span>
                  <Edit className="h-4 w-4 ml-2" />
                </Button>
              )}

              <div className="flex gap-1">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Fit
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40">
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleStyleChange('objectFit', 'contain')}
                      >
                        {currentStyle.objectFit === 'contain' && '✓ '}Contain
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleStyleChange('objectFit', 'cover')}
                      >
                        {currentStyle.objectFit === 'cover' && '✓ '}Cover
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="ghost" size="sm">
                      Position
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-40">
                    <div className="space-y-2">
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleStyleChange('objectPosition', 'center')}
                      >
                        {currentStyle.objectPosition === 'center' && '✓ '}Center
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleStyleChange('objectPosition', 'top')}
                      >
                        {currentStyle.objectPosition === 'top' && '✓ '}Top
                      </Button>
                      <Button
                        variant="ghost"
                        className="w-full justify-start"
                        onClick={() => handleStyleChange('objectPosition', 'bottom')}
                      >
                        {currentStyle.objectPosition === 'bottom' && '✓ '}Bottom
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>

                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => {
                    setLocalUrl('');
                    onUpdate('');
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ImageBlock;