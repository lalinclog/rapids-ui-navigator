"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"

interface TextComponentProps {
  content: string
  onContentChange: (content: string) => void
  editable?: boolean
  config?: {
    fontSize?: number
    fontFamily?: string
    textAlign?: string
    textColor?: string
    fontWeight?: string
    fontStyle?: string
    textDecoration?: string
    lineHeight?: number
    backgroundColor?: string
    textShadow?: boolean
    textOverflow?: boolean
    textWrap?: boolean
    bold?: boolean
    italic?: boolean
    underline?: boolean
    textTransform?: string
    letterSpacing?: number
  }
}

const TextComponent: React.FC<TextComponentProps> = ({ content, onContentChange, editable = true, config = {} }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [text, setText] = useState(content)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const {
    fontSize = 16,
    fontFamily = "sans-serif",
    textAlign = "left",
    textColor = "#000000",
    fontWeight = "normal",
    fontStyle = "normal",
    textDecoration = "none",
    lineHeight = 1.5,
    backgroundColor = "transparent",
    textShadow = false,
    textOverflow = false,
    textWrap = true,
    bold = false,
    italic = false,
    underline = false,
    textTransform = "none",
    letterSpacing = 0,
  } = config

  useEffect(() => {
    setText(content)
  }, [content])

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

  const textStyle: React.CSSProperties = {
    fontSize: typeof fontSize === "number" ? `${fontSize}px` : fontSize,
    fontFamily,
    textAlign: textAlign as "left" | "center" | "right" | "justify",
    color: textColor,
    fontWeight: bold ? "bold" : fontWeight,
    fontStyle: italic ? "italic" : fontStyle,
    textDecoration: underline ? "underline" : textDecoration,
    lineHeight: typeof lineHeight === "number" ? lineHeight : Number.parseFloat(lineHeight as string) || 1.5,
    backgroundColor: backgroundColor === "transparent" ? "transparent" : backgroundColor,
    textShadow: textShadow ? "1px 1px 2px rgba(0,0,0,0.3)" : "none",
    textTransform: textTransform as "none" | "uppercase" | "lowercase" | "capitalize",
    letterSpacing: typeof letterSpacing === "number" ? `${letterSpacing}px` : letterSpacing,
    whiteSpace: textWrap ? "pre-wrap" : "nowrap",
    overflow: textOverflow ? "hidden" : "visible",
    textOverflow: textOverflow ? "ellipsis" : "clip",
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
      className="w-full h-full overflow-hidden p-2 cursor-text break-words"
      onDoubleClick={handleDoubleClick}
      style={textStyle}
    >
      {text || "Double click to edit this text"}
    </div>
  )
}

export default TextComponent
