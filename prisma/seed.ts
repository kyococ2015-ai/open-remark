import { PrismaClient, CommentStatus } from "../generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import { config } from "dotenv"

config()

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL })
const db = new PrismaClient({ adapter })

async function main() {
  // Seed a demo user
  const user = await db.user.upsert({
    where: { email: "demo@example.com" },
    update: {},
    create: {
      email: "demo@example.com",
      name: "Demo Owner",
      image: "https://avatars.githubusercontent.com/u/1?v=4",
    },
  })

  // Seed a demo site
  const site = await db.site.upsert({
    where: { siteKey: "demo-site-key-001" },
    update: {},
    create: {
      name: "My Astro Blog",
      domain: "myblog.com",
      siteKey: "demo-site-key-001",
      allowedOrigins: JSON.stringify(["https://myblog.com"]),
      autoApprove: false,
      ownerId: user.id,
    },
  })

  // Seed a demo page
  const page = await db.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "/posts/hello-world" } },
    update: {},
    create: {
      slug: "/posts/hello-world",
      url: "https://myblog.com/posts/hello-world",
      siteId: site.id,
    },
  })

  // Seed demo commenters
  const commenters = await Promise.all(
    [
      { name: "Alice", email: "alice@example.com", username: "alice" },
      { name: "Bob", email: "bob@example.com", username: "bob" },
      { name: "Spammer", email: "spam@evil.com", username: "spammer" },
    ].map((c) =>
      db.commenter.upsert({
        where: { email: c.email },
        update: {},
        create: c,
      })
    )
  )

  // Seed demo comments
  const comments = [
    {
      body: "Great post! Really enjoyed reading this.",
      commenterId: commenters[0].id,
      status: CommentStatus.APPROVED,
    },
    {
      body: "Thanks for sharing, very helpful!",
      commenterId: commenters[1].id,
      status: CommentStatus.PENDING,
    },
    {
      body: "Buy cheap software at discount-software.ru!!!",
      commenterId: commenters[2].id,
      status: CommentStatus.SPAM,
    },
  ]

  for (const c of comments) {
    await db.comment.create({
      data: { ...c, pageId: page.id },
    })
  }

  console.log("Seed complete")
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
