"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Loader2 } from "lucide-react"

interface ImageComponentProps {
  src: string
  onContentChange: (src: string) => void
}

const ImageComponent: React.FC<ImageComponentProps> = ({ src, onContentChange }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [inputValue, setInputValue] = useState(src)
  const [error, setError] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [validatedSrc, setValidatedSrc] = useState(src)

  // Validate and update image source when src prop changes
  useEffect(() => {
    setInputValue(src)
    if (src) {
      setIsLoading(true)
      setValidatedSrc(src)
    }
  }, [src])

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Basic URL validation
    let url = inputValue.trim()

    // If it's not empty and doesn't start with http(s), assume it needs https://
    if (url && !url.match(/^https?:\/\//i)) {
      url = `https://${url}`
      setInputValue(url)
    }

    onContentChange(url)
    setIsLoading(true)
    setError(false)
    setValidatedSrc(url)
    setIsEditing(false)
  }

  const handleImageError = () => {
    setError(true)
    setIsLoading(false)
  }

  const handleImageLoad = () => {
    setError(false)
    setIsLoading(false)
  }

  if (isEditing) {
    return (
      <div className="h-full flex flex-col p-2">
        <form onSubmit={handleSubmit} className="flex flex-col gap-2">
          <input
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            type="text"
            placeholder="Enter image URL"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button type="button" variant="outline" onClick={() => setIsEditing(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </div>
    )
  }

  if (error) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-gray-100 cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        <div className="text-gray-500 text-center px-4">
          <p>Image failed to load</p>
          <p className="text-xs mt-1">The URL may be invalid or the image might be restricted</p>
        </div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsEditing(true)}>
          Change URL
        </Button>
      </div>
    )
  }

  if (!validatedSrc) {
    return (
      <div
        className="w-full h-full flex flex-col items-center justify-center bg-gray-100 cursor-pointer"
        onDoubleClick={handleDoubleClick}
      >
        <div className="text-gray-500">No image URL provided</div>
        <Button variant="outline" size="sm" className="mt-2" onClick={() => setIsEditing(true)}>
          Add Image URL
        </Button>
      </div>
    )
  }

  return (
    <div className="w-full h-full flex items-center justify-center relative" onDoubleClick={handleDoubleClick}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-75">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      )}
      <img
        src={validatedSrc || "/placeholder.svg"}
        alt="Dashboard Item"
        className="max-w-full max-h-full object-contain"
        onError={handleImageError}
        onLoad={handleImageLoad}
        style={{ display: isLoading ? "none" : "block" }}
      />
    </div>
  )
}

export default ImageComponent
