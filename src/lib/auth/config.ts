import { betterAuth } from "better-auth"

export const auth = betterAuth({
  secret: process.env.BETTER_AUTH_SECRET || "fallback-secret-key-for-development-only",
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    additionalFields: {
      username: {
        type: "string",
        required: true,
        unique: true,
      },
      display_name: {
        type: "string",
        required: false,
      },
      avatar_url: {
        type: "string",
        required: false,
      },
    },
  },
  plugins: [
    // Add rate limiting
    {
      id: "rate-limit",
      init: (ctx) => {
        return {
          onRequest: async (request) => {
            // Implement rate limiting logic here
            const ip = request.headers.get("x-forwarded-for") || "unknown"
            // Add rate limiting using Redis
          },
        }
      },
    },
  ],
  advanced: {
    generateId: () => crypto.randomUUID(),
  },
})