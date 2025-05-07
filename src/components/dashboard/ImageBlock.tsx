
// components/dashboard/ImageBlock.tsx
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ImagePlus, Trash2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

// Add the missing uploadImage function
const uploadImage = async (file: File): Promise<{ url: string }> => {
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
  onUpdate: (url: string, altText?: string) => void;
}> = ({ url, altText, isEditing, onUpdate }) => {
  const [localUrl, setLocalUrl] = useState(url);
  const [localAltText, setLocalAltText] = useState(altText || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsLoading(true);
      try {
        const result = await uploadImage(file);
        setLocalUrl(result.url);
        onUpdate(result.url, localAltText);
        toast({
          title: "Upload Successful",
          description: "Image has been uploaded successfully",
        });
      } catch (error) {
        console.error('Error uploading image:', error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  return (
    <div className="h-full w-full flex flex-col">
      {localUrl ? (
        <>
          <div className="flex-grow flex items-center justify-center p-4 relative">
            <img 
              src={localUrl} 
              alt={localAltText} 
              className="max-h-full max-w-full object-contain"
            />
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center bg-background/80">
                <div className="loader animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
              </div>
            )}
          </div>
          {isEditing && (
            <div className="p-2 border-t flex gap-2">
              <input
                type="text"
                value={localAltText}
                onChange={(e) => setLocalAltText(e.target.value)}
                onBlur={() => onUpdate(localUrl, localAltText)}
                placeholder="Image description"
                className="flex-grow text-sm p-2 border rounded"
              />
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
          )}
        </>
      ) : isEditing ? (
        <label className={`flex flex-col items-center justify-center gap-2 p-4 h-full cursor-pointer border-2 border-dashed rounded-lg ${isLoading ? 'opacity-50 pointer-events-none' : ''}`}>
          {isLoading ? (
            <div className="loader animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
          ) : (
            <>
              <ImagePlus className="h-8 w-8 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Upload Image</span>
            </>
          )}
          <input 
            type="file" 
            className="hidden"
            accept="image/*"
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
  );
};

export default ImageBlock;
