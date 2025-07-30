"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { AvatarSelector, AvatarDisplay } from "@/components/ui/avatar-selector"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { toast } from "sonner"
import { UserProfile, UserPreferences, PrivacySettings } from "@/types"

const profileSchema = z.object({
  display_name: z.string().min(2, "Display name must be at least 2 characters").optional(),
  bio: z.string().max(500, "Bio must be 500 characters or less").optional(),
  avatar_icon: z.string().min(1, "Please select an avatar"),
  preferences: z.object({
    theme: z.enum(["light", "dark", "system"]),
    sound_enabled: z.boolean(),
    notifications_enabled: z.boolean(),
    auto_muck: z.boolean(),
    show_hand_strength: z.boolean(),
  }),
  privacy_settings: z.object({
    show_stats: z.boolean(),
    show_online_status: z.boolean(),
    allow_friend_requests: z.boolean(),
  }),
})

type ProfileFormData = z.infer<typeof profileSchema>

interface UserProfileFormProps {
  profile?: UserProfile
  onSave: (data: ProfileFormData) => Promise<void>
  isLoading?: boolean
}

export function UserProfileForm({ profile, onSave, isLoading }: UserProfileFormProps) {
  const [selectedAvatar, setSelectedAvatar] = useState(profile?.avatar_url || "spades")

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isDirty },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      display_name: profile?.display_name || "",
      bio: profile?.bio || "",
      avatar_icon: profile?.avatar_url || "spades",
      preferences: {
        theme: (profile?.preferences as UserPreferences)?.theme || "light",
        sound_enabled: (profile?.preferences as UserPreferences)?.sound_enabled ?? true,
        notifications_enabled: (profile?.preferences as UserPreferences)?.notifications_enabled ?? true,
        auto_muck: (profile?.preferences as UserPreferences)?.auto_muck ?? false,
        show_hand_strength: (profile?.preferences as UserPreferences)?.show_hand_strength ?? true,
      },
      privacy_settings: {
        show_stats: (profile?.privacy_settings as PrivacySettings)?.show_stats ?? true,
        show_online_status: (profile?.privacy_settings as PrivacySettings)?.show_online_status ?? true,
        allow_friend_requests: (profile?.privacy_settings as PrivacySettings)?.allow_friend_requests ?? true,
      },
    },
  })

  const preferences = watch("preferences")
  const privacySettings = watch("privacy_settings")

  const handleAvatarSelect = (iconId: string) => {
    setSelectedAvatar(iconId)
    setValue("avatar_icon", iconId, { shouldDirty: true })
  }

  const onSubmit = async (data: ProfileFormData) => {
    try {
      await onSave(data)
      toast.success("Profile updated successfully!")
    } catch (error) {
      toast.error("Failed to update profile. Please try again.")
      console.error("Profile update error:", error)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      {/* Basic Profile Information */}
      <Card>
        <CardHeader>
          <CardTitle>Profile Information</CardTitle>
          <CardDescription>
            Update your display name, avatar, and bio.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="display_name">Display Name</Label>
            <Input
              id="display_name"
              {...register("display_name")}
              placeholder="Enter your display name"
            />
            {errors.display_name && (
              <p className="text-sm text-destructive">{errors.display_name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Avatar</Label>
            <div className="flex items-center gap-4">
              <AvatarDisplay iconId={selectedAvatar} size="lg" />
              <div className="flex-1">
                <AvatarSelector
                  selectedIcon={selectedAvatar}
                  onSelect={handleAvatarSelect}
                />
              </div>
            </div>
            {errors.avatar_icon && (
              <p className="text-sm text-destructive">{errors.avatar_icon.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...register("bio")}
              placeholder="Tell others about yourself..."
              rows={3}
            />
            {errors.bio && (
              <p className="text-sm text-destructive">{errors.bio.message}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Game Preferences */}
      <Card>
        <CardHeader>
          <CardTitle>Game Preferences</CardTitle>
          <CardDescription>
            Customize your poker playing experience.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Sound Effects</Label>
              <p className="text-sm text-muted-foreground">
                Play sounds for game events
              </p>
            </div>
            <Switch
              checked={preferences.sound_enabled}
              onCheckedChange={(checked) => setValue("preferences.sound_enabled", checked, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Notifications</Label>
              <p className="text-sm text-muted-foreground">
                Receive notifications for game events
              </p>
            </div>
            <Switch
              checked={preferences.notifications_enabled}
              onCheckedChange={(checked) => setValue("preferences.notifications_enabled", checked, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Auto Muck</Label>
              <p className="text-sm text-muted-foreground">
                Automatically fold losing hands at showdown
              </p>
            </div>
            <Switch
              checked={preferences.auto_muck}
              onCheckedChange={(checked) => setValue("preferences.auto_muck", checked, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Hand Strength</Label>
              <p className="text-sm text-muted-foreground">
                Display hand strength indicator during play
              </p>
            </div>
            <Switch
              checked={preferences.show_hand_strength}
              onCheckedChange={(checked) => setValue("preferences.show_hand_strength", checked, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Privacy Settings</CardTitle>
          <CardDescription>
            Control what information is visible to other players.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Statistics</Label>
              <p className="text-sm text-muted-foreground">
                Allow others to view your playing statistics
              </p>
            </div>
            <Switch
              checked={privacySettings.show_stats}
              onCheckedChange={(checked) => setValue("privacy_settings.show_stats", checked, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Show Online Status</Label>
              <p className="text-sm text-muted-foreground">
                Display when you're online and available to play
              </p>
            </div>
            <Switch
              checked={privacySettings.show_online_status}
              onCheckedChange={(checked) => setValue("privacy_settings.show_online_status", checked, { shouldDirty: true })}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Allow Friend Requests</Label>
              <p className="text-sm text-muted-foreground">
                Let other players send you friend requests
              </p>
            </div>
            <Switch
              checked={privacySettings.allow_friend_requests}
              onCheckedChange={(checked) => setValue("privacy_settings.allow_friend_requests", checked, { shouldDirty: true })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={!isDirty || isLoading}
          className="min-w-[120px]"
        >
          {isLoading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </form>
  )
}