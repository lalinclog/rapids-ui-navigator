"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface TextComponentProps {
  content: string
  onContentChange: (content: string) => void
  editable?: boolean
  config?: {
    fontSize?: string
    fontFamily?: string
    textAlign?: string
    textColor?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    lineHeight?: string
  }
}

const TextComponent: React.FC<TextComponentProps> = ({ content, onContentChange, editable = true, config = {} }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    fontSize = "16px",
    fontFamily = "sans-serif",
    textAlign = "left",
    textColor = "#000000",
    fontWeight = "normal",
    fontStyle = "normal",
    textDecoration = "none",
    lineHeight = "1.5",
  } = config

  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus()
      textareaRef.current.select()
    }
  }, [isEditing])

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!editable) return
    e.stopPropagation()
    setIsEditing(true)
  }

  const handleBlur = () => {
    setIsEditing(false)
    onContentChange(text)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && e.shiftKey === false) {
      e.preventDefault()
      setIsEditing(false)
      onContentChange(text)
    }
  }

  const textStyle = {
    fontSize,
    fontFamily,
    textAlign: textAlign as "left" | "center" | "right",
    color: textColor,
    fontWeight,
    fontStyle,
    textDecoration,
    lineHeight,
  }

  if (isEditing && editable) {
    return (
      <textarea
        ref={textareaRef}
        className="w-full h-full p-2 border-none focus:outline-none focus:ring-0 resize-none"
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        style={textStyle}
      />
    )
  }

  return (
    <div
      className="w-full h-full overflow-hidden p-2 cursor-text whitespace-pre-wrap break-words"
      onDoubleClick={handleDoubleClick}
      style={textStyle}
    >
      {text || "Double click to edit this text"}
    </div>
  )
}

export default TextComponent
