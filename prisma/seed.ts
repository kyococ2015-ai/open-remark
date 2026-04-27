import { PrismaClient, CommentStatus } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter });

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
  });

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
  });

  // Seed a demo page
  const page = await db.page.upsert({
    where: { siteId_slug: { siteId: site.id, slug: "/posts/hello-world" } },
    update: {},
    create: {
      slug: "/posts/hello-world",
      url: "https://myblog.com/posts/hello-world",
      siteId: site.id,
    },
  });

  // Seed demo comments
  const comments = [
    {
      body: "Great post! Really enjoyed reading this.",
      authorName: "Alice",
      authorEmail: "alice@example.com",
      status: CommentStatus.APPROVED,
    },
    {
      body: "Thanks for sharing, very helpful!",
      authorName: "Bob",
      authorEmail: "bob@example.com",
      status: CommentStatus.PENDING,
    },
    {
      body: "Buy cheap software at discount-software.ru!!!",
      authorName: "Spammer",
      authorEmail: "spam@evil.com",
      status: CommentStatus.SPAM,
    },
  ];

  for (const c of comments) {
    await db.comment.create({
      data: { ...c, pageId: page.id },
    });
  }

  console.log("Seed complete");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
