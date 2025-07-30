import { NextRequest, NextResponse } from "next/server"
import { supabase, supabaseAdmin } from "@/lib/supabase/client"
import { auth } from "@/lib/auth/config"

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is accessing their own profile or has permission
    if (session.user.id !== params.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // Get user profile from database
    const { data: profile, error } = await supabase
      .from("user_profiles")
      .select("*")
      .eq("user_id", params.userId)
      .single()

    if (error && error.code !== "PGRST116") { // PGRST116 = no rows returned
      throw error
    }

    // If no profile exists, create a default one
    if (!profile) {
      const { data: newProfile, error: createError } = await supabaseAdmin
        .from("user_profiles")
        .insert({
          user_id: params.userId,
          preferences: {
            theme: "light",
            sound_enabled: true,
            notifications_enabled: true,
            auto_muck: false,
            show_hand_strength: true,
          },
          privacy_settings: {
            show_stats: true,
            show_online_status: true,
            allow_friend_requests: true,
          },
        })
        .select()
        .single()

      if (createError) {
        throw createError
      }

      return NextResponse.json(newProfile)
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error fetching user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    // Verify authentication
    const session = await auth.api.getSession({ headers: request.headers })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Check if user is updating their own profile
    if (session.user.id !== params.userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = await request.json()
    const { display_name, bio, avatar_icon, preferences, privacy_settings } = body

    // Validate input
    if (display_name && (display_name.length < 2 || display_name.length > 100)) {
      return NextResponse.json(
        { error: "Display name must be between 2 and 100 characters" },
        { status: 400 }
      )
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: "Bio must be 500 characters or less" },
        { status: 400 }
      )
    }

    // Update profile
    const { data: profile, error } = await supabaseAdmin
      .from("user_profiles")
      .upsert({
        user_id: params.userId,
        display_name,
        bio,
        avatar_url: avatar_icon, // Store the icon ID as avatar_url
        preferences,
        privacy_settings,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json(profile)
  } catch (error) {
    console.error("Error updating user profile:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}