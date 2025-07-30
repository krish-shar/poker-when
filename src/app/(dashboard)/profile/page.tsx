"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { UserProfileForm } from "@/components/forms/user-profile-form"
import { useSession } from "@/lib/auth/client"
import { UserProfile } from "@/types"

export default function ProfilePage() {
  const { data: session, status } = useSession()
  const [profile, setProfile] = useState<UserProfile | undefined>()
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (session?.user) {
      // Load user profile from API
      loadUserProfile()
    }
  }, [session])

  const loadUserProfile = async () => {
    try {
      setIsLoading(true)
      const response = await fetch(`/api/users/${session?.user?.id}/profile`)
      if (response.ok) {
        const profileData = await response.json()
        setProfile(profileData)
      }
    } catch (error) {
      console.error("Failed to load profile:", error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSaveProfile = async (data: any) => {
    setIsLoading(true)
    try {
      const response = await fetch(`/api/users/${session?.user?.id}/profile`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to update profile")
      }

      const updatedProfile = await response.json()
      setProfile(updatedProfile)
    } catch (error) {
      console.error("Profile update error:", error)
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  if (status === "loading") {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3"></div>
          <div className="space-y-4">
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
            <div className="h-32 bg-muted rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="container max-w-4xl mx-auto py-8">
        <Card>
          <CardHeader>
            <CardTitle>Access Denied</CardTitle>
            <CardDescription>
              You need to be logged in to view your profile.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="container max-w-4xl mx-auto py-8">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Profile Settings</h1>
          <p className="text-muted-foreground">
            Manage your account settings and poker preferences.
          </p>
        </div>

        <UserProfileForm
          profile={profile}
          onSave={handleSaveProfile}
          isLoading={isLoading}
        />
      </div>
    </div>
  )
}