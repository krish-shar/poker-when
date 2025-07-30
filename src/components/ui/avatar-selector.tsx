"use client"

import { useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

// Predefined avatar icons (you can add more or use actual icon libraries)
const AVATAR_ICONS = [
  { id: "spades", name: "Spades", emoji: "♠️" },
  { id: "hearts", name: "Hearts", emoji: "♥️" },
  { id: "diamonds", name: "Diamonds", emoji: "♦️" },
  { id: "clubs", name: "Clubs", emoji: "♣️" },
  { id: "chip-red", name: "Red Chip", emoji: "🔴" },
  { id: "chip-blue", name: "Blue Chip", emoji: "🔵" },
  { id: "chip-green", name: "Green Chip", emoji: "🟢" },
  { id: "chip-yellow", name: "Yellow Chip", emoji: "🟡" },
  { id: "king", name: "King", emoji: "👑" },
  { id: "ace", name: "Ace", emoji: "🎯" },
  { id: "dice", name: "Dice", emoji: "🎲" },
  { id: "money", name: "Money", emoji: "💰" },
  { id: "fire", name: "Fire", emoji: "🔥" },
  { id: "lightning", name: "Lightning", emoji: "⚡" },
  { id: "star", name: "Star", emoji: "⭐" },
  { id: "shark", name: "Shark", emoji: "🦈" },
  { id: "eagle", name: "Eagle", emoji: "🦅" },
  { id: "wolf", name: "Wolf", emoji: "🐺" },
  { id: "tiger", name: "Tiger", emoji: "🐅" },
  { id: "lion", name: "Lion", emoji: "🦁" },
]

interface AvatarSelectorProps {
  selectedIcon?: string
  onSelect: (iconId: string) => void
  className?: string
}

export function AvatarSelector({ selectedIcon, onSelect, className }: AvatarSelectorProps) {
  return (
    <div className={cn("grid grid-cols-5 gap-2", className)}>
      {AVATAR_ICONS.map((icon) => (
        <Button
          key={icon.id}
          variant={selectedIcon === icon.id ? "default" : "outline"}
          size="sm"
          className={cn(
            "aspect-square p-2 text-2xl",
            selectedIcon === icon.id && "ring-2 ring-primary"
          )}
          onClick={() => onSelect(icon.id)}
          title={icon.name}
        >
          {icon.emoji}
        </Button>
      ))}
    </div>
  )
}

interface AvatarDisplayProps {
  iconId: string
  size?: "sm" | "md" | "lg"
  className?: string
}

export function AvatarDisplay({ iconId, size = "md", className }: AvatarDisplayProps) {
  const icon = AVATAR_ICONS.find((i) => i.id === iconId)
  
  const sizeClasses = {
    sm: "w-8 h-8 text-lg",
    md: "w-12 h-12 text-2xl",
    lg: "w-16 h-16 text-3xl",
  }

  if (!icon) {
    return (
      <div className={cn(
        "rounded-full bg-muted flex items-center justify-center",
        sizeClasses[size],
        className
      )}>
        <span className="text-muted-foreground">?</span>
      </div>
    )
  }

  return (
    <div className={cn(
      "rounded-full bg-primary/10 flex items-center justify-center border",
      sizeClasses[size],
      className
    )}>
      <span>{icon.emoji}</span>
    </div>
  )
}

export { AVATAR_ICONS }