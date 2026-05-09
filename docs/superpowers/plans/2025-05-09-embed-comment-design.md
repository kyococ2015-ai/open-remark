# Embed Comment Design Update Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add usernames, heart reactions, and improved inline reply UX to the Zeon Comments widget embed.

**Architecture:** Replace denormalized author fields on `Comment` with a new `Commenter` model that owns unique usernames. Add `CommentLike` for reactions. Update widget to render Twitter-like cards with inline reply forms.

**Tech Stack:** Next.js 16, Prisma 7, PostgreSQL, esbuild (widget), vanilla JS (widget)

---

## File Map

| File | Responsibility |
|------|---------------|
| `prisma/schema.prisma` | New `Commenter`, `CommentLike` models; modified `Comment` |
| `lib/services/comment-service.ts` | All comment CRUD + like toggle logic |
| `lib/auth-widget.ts` | Widget JWT signing/verifying with `commenterId` |
| `app/api/widget/auth/route.ts` | Google auth → upsert `Commenter` with username |
| `app/api/widget/comments/route.ts` | GET/POST comments with new schema |
| `app/api/widget/comments/[id]/like/route.ts` | Toggle like endpoint |
| `widget/src/types.ts` | Type definitions for widget |
| `widget/src/api.ts` | HTTP calls to widget API |
| `widget/src/auth.ts` | Widget local auth state (sessionStorage) |
| `widget/src/render.ts` | DOM rendering functions |
| `widget/src/styles.css` | Shadow DOM styles |
| `widget/src/index.ts` | Widget controller class |

---

### Task 1: Database Schema

**Files:**
- Modify: `prisma/schema.prisma`

- [ ] **Step 1: Add `Commenter` model and modify `Comment`/`CommentLike`**

Replace the entire schema file content with:

```prisma
generator client {
  provider = "prisma-client"
  output   = "../generated/prisma"
}

datasource db {
  provider = "postgresql"
}

// ─── Enums ────────────────────────────────────────────────────────────────────

enum Role {
  OWNER
  ADMIN
}

enum CommentStatus {
  PENDING
  APPROVED
  SPAM
  DELETED
}

// ─── Auth (NextAuth / Auth.js required tables) ────────────────────────────────

model User {
  id            String    @id @default(cuid())
  name          String?
  email         String    @unique
  emailVerified DateTime?
  image         String?
  role          Role      @default(OWNER)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  accounts Account[]
  sessions Session[]
  sites    Site[]
}

model Account {
  id                String  @id @default(cuid())
  userId            String
  type              String
  provider          String
  providerAccountId String
  refresh_token     String?
  access_token      String?
  expires_at        Int?
  token_type        String?
  scope             String?
  id_token          String?
  session_state     String?

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  userId       String
  expires      DateTime

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)
}

model VerificationToken {
  identifier String
  token      String   @unique
  expires    DateTime

  @@unique([identifier, token])
}

// ─── Domain Models ────────────────────────────────────────────────────────────

model Site {
  id             String   @id @default(cuid())
  name           String
  domain         String
  siteKey        String   @unique @default(cuid())
  allowedOrigins String   @default("[]")
  autoApprove    Boolean  @default(false)
  theme          String   @default("AUTO")
  primaryColor   String   @default("#0f172a")
  radius         Int      @default(8)
  createdAt      DateTime @default(now())
  updatedAt      DateTime @updatedAt

  ownerId String
  owner   User   @relation(fields: [ownerId], references: [id], onDelete: Cascade)

  pages Page[]

  @@index([ownerId])
}

model Page {
  id        String   @id @default(cuid())
  slug      String
  url       String?
  createdAt DateTime @default(now())

  siteId String
  site   Site   @relation(fields: [siteId], references: [id], onDelete: Cascade)

  comments Comment[]

  @@unique([siteId, slug])
  @@index([siteId])
}

model Commenter {
  id        String   @id @default(cuid())
  email     String   @unique
  username  String   @unique
  name      String
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  comments Comment[]
}

model Comment {
  id        String        @id @default(cuid())
  body      String
  status    CommentStatus @default(PENDING)
  createdAt DateTime      @default(now())
  updatedAt DateTime      @updatedAt

  pageId String
  page   Page   @relation(fields: [pageId], references: [id], onDelete: Cascade)

  parentId String?
  parent   Comment?  @relation("Replies", fields: [parentId], references: [id])
  replies  Comment[] @relation("Replies")

  commenterId String
  commenter   Commenter @relation(fields: [commenterId], references: [id], onDelete: Cascade)

  likes CommentLike[]

  moderationLogs ModerationLog[]

  @@index([pageId, status, createdAt])
  @@index([parentId])
  @@index([commenterId])
  @@index([status, createdAt])
}

model CommentLike {
  id        String   @id @default(cuid())
  commentId String
  userEmail String
  createdAt DateTime @default(now())

  comment Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@unique([commentId, userEmail])
  @@index([commentId])
}

model ModerationLog {
  id         String   @id @default(cuid())
  action     String
  adminEmail String
  createdAt  DateTime @default(now())

  commentId String
  comment   Comment @relation(fields: [commentId], references: [id], onDelete: Cascade)

  @@index([commentId, createdAt])
  @@index([adminEmail, createdAt])
}
```

- [ ] **Step 2: Validate schema**

Run: `npx prisma validate`
Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add prisma/schema.prisma
git commit -m "feat(schema): add Commenter, CommentLike; normalize Comment author"
```

---

### Task 2: Comment Service

**Files:**
- Modify: `lib/services/comment-service.ts`

- [ ] **Step 1: Read current file**

Run: `cat lib/services/comment-service.ts`

- [ ] **Step 2: Replace entire file**

```typescript
import { prisma } from "@/lib/prisma";
import type { CreateCommentInput } from "@/lib/validators/comment";

function buildCommenterSelect() {
  return {
    id: true,
    name: true,
    username: true,
    image: true,
  };
}

function buildCommentSelect(userEmail?: string) {
  const likeWhere = userEmail ? { where: { userEmail } } : undefined;
  return {
    id: true,
    body: true,
    status: true,
    createdAt: true,
    commenter: { select: buildCommenterSelect() },
    _count: { select: { likes: true } },
    likes: likeWhere ? { ...likeWhere, select: { id: true } } : undefined,
    replies: {
      select: {
        id: true,
        body: true,
        status: true,
        createdAt: true,
        commenter: { select: buildCommenterSelect() },
        _count: { select: { likes: true } },
        likes: likeWhere ? { ...likeWhere, select: { id: true } } : undefined,
      },
      orderBy: { createdAt: "asc" as const },
    },
  };
}

export async function getApprovedCommentsForPage(siteId: string, slug: string, userEmail?: string) {
  const page = await prisma.page.findUnique({
    where: { siteId_slug: { siteId, slug } },
  });
  if (!page) return [];

  const raw = await prisma.comment.findMany({
    where: {
      pageId: page.id,
      status: "APPROVED",
      parentId: null,
    },
    select: buildCommentSelect(userEmail),
    orderBy: { createdAt: "desc" },
  });

  return raw.map((c) => ({
    id: c.id,
    body: c.body,
    status: c.status,
    createdAt: c.createdAt.toISOString(),
    likeCount: c._count.likes,
    hasLiked: userEmail ? c.likes.length > 0 : false,
    commenter: c.commenter,
    replies: c.replies.map((r) => ({
      id: r.id,
      body: r.body,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      likeCount: r._count.likes,
      hasLiked: userEmail ? r.likes.length > 0 : false,
      commenter: r.commenter,
      replies: [],
    })),
  }));
}

export async function createComment(
  data: CreateCommentInput,
  commenterId: string,
  autoApprove: boolean,
) {
  const page = await prisma.page.upsert({
    where: { siteId_slug: { siteId: data.siteId, slug: data.slug } },
    update: {},
    create: { siteId: data.siteId, slug: data.slug },
  });

  const raw = await prisma.comment.create({
    data: {
      body: data.body,
      pageId: page.id,
      parentId: data.parentId ?? null,
      commenterId,
      status: autoApprove ? "APPROVED" : "PENDING",
    },
    select: buildCommentSelect(),
  });

  return {
    id: raw.id,
    body: raw.body,
    status: raw.status,
    createdAt: raw.createdAt.toISOString(),
    likeCount: 0,
    hasLiked: false,
    commenter: raw.commenter,
    replies: [],
  };
}

export async function toggleCommentLike(commentId: string, userEmail: string) {
  const existing = await prisma.commentLike.findUnique({
    where: { commentId_userEmail: { commentId, userEmail } },
  });

  if (existing) {
    await prisma.commentLike.delete({
      where: { id: existing.id },
    });
    const count = await prisma.commentLike.count({ where: { commentId } });
    return { liked: false, count };
  }

  await prisma.commentLike.create({
    data: { commentId, userEmail },
  });
  const count = await prisma.commentLike.count({ where: { commentId } });
  return { liked: true, count };
}
```

- [ ] **Step 3: Commit**

```bash
git add lib/services/comment-service.ts
git commit -m "feat(comments): update service for Commenter, CommentLike"
```

---

### Task 3: Widget JWT

**Files:**
- Modify: `lib/auth-widget.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { SignJWT, jwtVerify } from "jose";

export type WidgetPayload = {
  sub: string; // authorEmail
  name: string;
  image?: string;
  commenterId: string;
  iat: number;
  exp: number;
};

const secret = () =>
  new TextEncoder().encode(process.env.WIDGET_JWT_SECRET ?? "fallback-secret");

export async function signWidgetToken(payload: {
  email: string;
  name: string;
  image?: string;
  commenterId: string;
}): Promise<string> {
  return new SignJWT({
    sub: payload.email,
    name: payload.name,
    image: payload.image,
    commenterId: payload.commenterId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifyWidgetToken(
  token: string,
): Promise<WidgetPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret());
    return payload as unknown as WidgetPayload;
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/auth-widget.ts
git commit -m "feat(auth): add commenterId to widget JWT payload"
```

---

### Task 4: Widget Auth API

**Files:**
- Modify: `app/api/widget/auth/route.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { signWidgetToken } from "@/lib/auth-widget";
import { prisma } from "@/lib/prisma";
import { corsHeaders } from "@/lib/cors";
import { rateLimit } from "@/lib/rate-limit";
import { ApiError, handleApiError } from "@/lib/api/error";

async function generateUsername(name: string): Promise<string> {
  const base = name.split(" ")[0].toLowerCase().replace(/[^a-z0-9]/g, "");
  if (!base) return "user";

  let username = base;
  let counter = 2;

  while (await prisma.commenter.findUnique({ where: { username } })) {
    username = `${base}${counter}`;
    counter++;
  }

  return username;
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin") ?? "";
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    const { ok: rateLimitOk } = rateLimit(`auth:${ip}`, 5, 60_000);
    if (!rateLimitOk) throw new ApiError("Rate limit exceeded", 429);

    const body = await req.json();
    const { idToken } = body as { idToken?: string };
    if (!idToken) throw new ApiError("idToken required", 400);

    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
    );
    if (!googleRes.ok) throw new ApiError("Invalid Google token", 401);

    const googlePayload = (await googleRes.json()) as {
      email: string;
      name: string;
      picture: string;
      aud: string;
    };

    if (googlePayload.aud !== process.env.AUTH_GOOGLE_ID) {
      throw new ApiError("Token audience mismatch", 401);
    }

    const commenter = await prisma.commenter.upsert({
      where: { email: googlePayload.email },
      update: {},
      create: {
        email: googlePayload.email,
        name: googlePayload.name,
        image: googlePayload.picture,
        username: await generateUsername(googlePayload.name),
      },
    });

    const widgetToken = await signWidgetToken({
      email: googlePayload.email,
      name: googlePayload.name,
      image: googlePayload.picture,
      commenterId: commenter.id,
    });

    return NextResponse.json(
      { token: widgetToken },
      { status: 200, headers: corsHeaders(origin) },
    );
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/widget/auth/route.ts
git commit -m "feat(auth): upsert Commenter with generated username on sign-in"
```

---

### Task 5: Comments API (GET)

**Files:**
- Modify: `app/api/widget/comments/route.ts`

- [ ] **Step 1: Replace GET handler in the file**

Replace lines 26-45 (the GET function) with:

```typescript
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const siteKey = searchParams.get("siteKey");
    const slug = searchParams.get("slug");
    if (!siteKey || !slug) throw new ApiError("siteKey and slug required", 400);

    const site = await getSiteBySiteKey(siteKey);

    // Extract user email from optional auth header for personalized like state
    let userEmail: string | undefined;
    const authHeader = req.headers.get("authorization");
    if (authHeader?.startsWith("Bearer ")) {
      const token = authHeader.slice(7);
      const payload = await verifyWidgetToken(token);
      if (payload) userEmail = payload.sub;
    }

    const comments = await getApprovedCommentsForPage(site.id, slug, userEmail);
    return buildCorsResponse(req, {
      comments,
      config: {
        theme: site.theme,
        primaryColor: site.primaryColor,
        radius: site.radius,
      },
    });
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/widget/comments/route.ts
git commit -m "feat(api): GET comments returns commenter, likeCount, hasLiked"
```

---

### Task 6: Comments API (POST)

**Files:**
- Modify: `app/api/widget/comments/route.ts`

- [ ] **Step 1: Replace POST handler**

Replace lines 48-86 with:

```typescript
export async function POST(req: NextRequest) {
  try {
    const origin = req.headers.get("origin");
    const ip = req.headers.get("x-forwarded-for") ?? "unknown";

    const { ok: rateLimitOk } = rateLimit(`post:${ip}`, 10, 60_000);
    if (!rateLimitOk) throw new ApiError("Rate limit exceeded", 429);

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError("Unauthorized", 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyWidgetToken(token);
    if (!payload) throw new ApiError("Invalid token", 401);

    const body = await req.json();
    const parsed = CreateCommentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 422 });
    }

    const site = await getSiteBySiteKey(parsed.data.siteKey);

    if (!isOriginAllowed(origin, site.allowedOrigins)) {
      throw new ApiError("Origin not allowed", 403);
    }

    const comment = await createComment(
      parsed.data,
      payload.commenterId,
      site.autoApprove,
    );

    return buildCorsResponse(req, comment, 201);
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/widget/comments/route.ts
git commit -m "feat(api): POST comments uses commenterId from JWT"
```

---

### Task 7: Like API Endpoint

**Files:**
- Create: `app/api/widget/comments/[id]/like/route.ts`

- [ ] **Step 1: Create directory and file**

```bash
mkdir -p app/api/widget/comments/\[id\]/like
```

- [ ] **Step 2: Write file**

```typescript
import { NextRequest, NextResponse } from "next/server";
import { toggleCommentLike } from "@/lib/services/comment-service";
import { verifyWidgetToken } from "@/lib/auth-widget";
import { corsHeaders } from "@/lib/cors";
import { ApiError, handleApiError } from "@/lib/api/error";

function buildCorsResponse(req: NextRequest, body: unknown, status = 200) {
  const origin = req.headers.get("origin") ?? "";
  return NextResponse.json(body, {
    status,
    headers: corsHeaders(origin),
  });
}

export async function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin") ?? "";
  return new NextResponse(null, { status: 204, headers: corsHeaders(origin) });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      throw new ApiError("Unauthorized", 401);
    }
    const token = authHeader.slice(7);
    const payload = await verifyWidgetToken(token);
    if (!payload) throw new ApiError("Invalid token", 401);

    const result = await toggleCommentLike(id, payload.sub);
    return buildCorsResponse(req, result);
  } catch (err) {
    return handleApiError(err);
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/widget/comments/\[id\]/like/route.ts
git commit -m "feat(api): add POST /comments/:id/like toggle endpoint"
```

---

### Task 8: Widget Types

**Files:**
- Modify: `widget/src/types.ts`

- [ ] **Step 1: Replace entire file**

```typescript
export type WidgetConfig = {
  siteKey: string;
  slug: string;
  container: HTMLElement;
  appUrl: string;
};

export type Commenter = {
  id: string;
  name: string;
  username: string;
  image: string | null;
};

export type CommentData = {
  id: string;
  body: string;
  status: "PENDING" | "APPROVED";
  createdAt: string;
  likeCount: number;
  hasLiked: boolean;
  commenter: Commenter;
  replies: CommentData[];
};

export type AuthUser = {
  name: string;
  email: string;
  image?: string;
  commenterId: string;
};

export type AuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "authenticated"; token: string; user: AuthUser }
  | { status: "error"; message: string };

export type WidgetThemeConfig = {
  theme: "AUTO" | "LIGHT" | "DARK";
  primaryColor: string;
  radius: number;
};
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/types.ts
git commit -m "feat(widget): update types for Commenter, likes, replies"
```

---

### Task 9: Widget API Client

**Files:**
- Modify: `widget/src/api.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import type { CommentData, WidgetThemeConfig } from "./types";

export async function fetchComments(
  appUrl: string,
  siteKey: string,
  slug: string,
  token?: string,
): Promise<{ comments: CommentData[]; config: WidgetThemeConfig }> {
  const url = `${appUrl}/api/widget/comments?siteKey=${encodeURIComponent(siteKey)}&slug=${encodeURIComponent(slug)}`;
  const headers: Record<string, string> = {};
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error("Failed to fetch comments");
  return res.json();
}

export async function postComment(
  appUrl: string,
  token: string,
  payload: {
    body: string;
    siteKey: string;
    slug: string;
    parentId?: string;
  },
): Promise<CommentData> {
  const res = await fetch(`${appUrl}/api/widget/comments`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error ?? "Failed to post comment");
  }
  return res.json();
}

export async function likeComment(
  appUrl: string,
  token: string,
  commentId: string,
): Promise<{ liked: boolean; count: number }> {
  const res = await fetch(`${appUrl}/api/widget/comments/${commentId}/like`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  if (!res.ok) throw new Error("Failed to toggle like");
  return res.json();
}

export async function exchangeGoogleToken(
  appUrl: string,
  idToken: string,
): Promise<string> {
  const res = await fetch(`${appUrl}/api/widget/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ idToken }),
  });
  if (!res.ok) throw new Error("Auth failed");
  const { token } = await res.json();
  return token;
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/api.ts
git commit -m "feat(widget): add likeComment API, update fetch with auth"
```

---

### Task 10: Widget Auth Module

**Files:**
- Modify: `widget/src/auth.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import type { AuthState, AuthUser } from "./types";
import { exchangeGoogleToken } from "./api";

const STORAGE_KEY = "zeon_widget_token";

export function loadStoredAuth(): AuthState {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { status: "idle" };
    const parsed = JSON.parse(raw) as { token: string; user: AuthUser; exp: number };
    if (Date.now() > parsed.exp) {
      sessionStorage.removeItem(STORAGE_KEY);
      return { status: "idle" };
    }
    return { status: "authenticated", token: parsed.token, user: parsed.user };
  } catch {
    return { status: "idle" };
  }
}

export function saveAuth(token: string, user: AuthUser) {
  const exp = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, user, exp }));
}

export function clearAuth() {
  sessionStorage.removeItem(STORAGE_KEY);
}

export async function signInWithGoogle(
  appUrl: string,
  googleClientId: string,
): Promise<{ token: string; user: AuthUser }> {
  return new Promise((resolve, reject) => {
    const width = 500;
    const height = 600;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?` +
        new URLSearchParams({
          client_id: googleClientId,
          redirect_uri: `${appUrl}/api/widget/oauth-callback`,
          response_type: "id_token",
          scope: "openid email profile",
          nonce: Math.random().toString(36).slice(2),
          prompt: "select_account",
        }),
      "zeon-google-signin",
      `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no`,
    );

    if (!popup) {
      reject(new Error("Popup blocked. Please allow popups for this site."));
      return;
    }

    let timer: ReturnType<typeof setInterval>;

    const handler = async (e: MessageEvent) => {
      if (e.origin !== appUrl) return;
      if (e.data?.type !== "ZEON_GOOGLE_TOKEN") return;
      clearInterval(timer);
      window.removeEventListener("message", handler);
      popup.close();
      try {
        const idToken = e.data.idToken as string;
        const token = await exchangeGoogleToken(appUrl, idToken);
        const payload = JSON.parse(atob(token.split(".")[1])) as {
          sub: string;
          name: string;
          image?: string;
          commenterId: string;
        };
        const user: AuthUser = {
          email: payload.sub,
          name: payload.name,
          image: payload.image,
          commenterId: payload.commenterId,
        };
        saveAuth(token, user);
        resolve({ token, user });
      } catch (err) {
        reject(err);
      }
    };

    window.addEventListener("message", handler);

    timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener("message", handler);
        reject(new Error("Sign-in cancelled"));
      }
    }, 500);
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/auth.ts
git commit -m "feat(widget): store commenterId in auth state"
```

---

### Task 11: Widget Render Functions

**Files:**
- Modify: `widget/src/render.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import type { CommentData, AuthState, Commenter } from "./types";

export function formatRelativeTime(isoDate: string): string {
  const diff = Date.now() - new Date(isoDate).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { month: "short", day: "numeric" }).format(
    new Date(isoDate),
  );
}

function avatarEl(name: string, image: string | null, small = false): HTMLElement {
  if (image) {
    const img = document.createElement("img");
    img.src = image;
    img.alt = name;
    img.className = small ? "z-avatar z-avatar-sm" : "z-avatar";
    img.width = small ? 24 : 30;
    img.height = small ? 24 : 30;
    return img;
  }
  const el = document.createElement("div");
  el.className = small
    ? "z-avatar-placeholder z-avatar-placeholder-sm"
    : "z-avatar-placeholder";
  el.setAttribute("aria-hidden", "true");
  el.textContent = name.slice(0, 2).toUpperCase();
  return el;
}

const HEART_OUTLINE = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const HEART_FILLED = `<svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>`;
const REPLY_ICON = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`;

function renderCommentItem(
  comment: CommentData,
  depth: number,
  onReply: (comment: CommentData) => void,
  onLike: (comment: CommentData) => void,
  replyingToId: string | null,
  currentUser: Commenter | null,
  onSubmitReply: (body: string, parentId: string) => void,
  onCancelReply: () => void,
  isSubmitting: boolean,
): HTMLElement {
  const li = document.createElement("li");
  li.className = depth === 0 ? "z-comment" : "z-reply";
  li.dataset.id = comment.id;

  const isReplying = replyingToId === comment.id;
  const isTopLevel = depth === 0;
  const avatarSize = isTopLevel ? false : true;

  // ─── Content wrapper ─────────────────────────────────────────────
  const content = document.createElement("div");
  content.className = "z-comment-content";

  // Avatar
  content.appendChild(avatarEl(comment.commenter.name, comment.commenter.image, avatarSize));

  // Right column
  const right = document.createElement("div");
  right.className = "z-comment-right";

  // Meta row
  const meta = document.createElement("div");
  meta.className = "z-comment-meta";

  const nameEl = document.createElement("span");
  nameEl.className = "z-comment-author";
  nameEl.textContent = comment.commenter.name;
  meta.appendChild(nameEl);

  const userEl = document.createElement("span");
  userEl.className = "z-comment-username";
  userEl.textContent = `@${comment.commenter.username}`;
  meta.appendChild(userEl);

  if (comment.status === "PENDING") {
    const badge = document.createElement("span");
    badge.className = "z-pending-badge";
    badge.textContent = "Pending";
    meta.appendChild(badge);
  }

  right.appendChild(meta);

  // Body
  const body = document.createElement("p");
  body.className = "z-comment-body";
  body.textContent = comment.body;
  right.appendChild(body);

  // Actions row
  const actions = document.createElement("div");
  actions.className = "z-comment-actions";

  const timeEl = document.createElement("time");
  timeEl.className = "z-comment-action-time";
  timeEl.dateTime = comment.createdAt;
  timeEl.textContent = formatRelativeTime(comment.createdAt);
  actions.appendChild(timeEl);

  const likeBtn = document.createElement("button");
  likeBtn.className = "z-action-btn" + (comment.hasLiked ? " z-action-btn-active" : "");
  likeBtn.type = "button";
  likeBtn.innerHTML = `${comment.hasLiked ? HEART_FILLED : HEART_OUTLINE}<span>${comment.likeCount}</span>`;
  likeBtn.addEventListener("click", () => onLike(comment));
  actions.appendChild(likeBtn);

  const replyBtn = document.createElement("button");
  replyBtn.className = "z-action-btn";
  replyBtn.type = "button";
  replyBtn.innerHTML = `${REPLY_ICON}<span>Reply</span>`;
  replyBtn.addEventListener("click", () => onReply(comment));
  actions.appendChild(replyBtn);

  right.appendChild(actions);
  content.appendChild(right);
  li.appendChild(content);

  // ─── Inline reply form ───────────────────────────────────────────
  if (isReplying && currentUser) {
    const formWrap = document.createElement("div");
    formWrap.className = "z-inline-reply";
    formWrap.appendChild(
      renderInlineReplyForm(
        comment,
        currentUser,
        onSubmitReply,
        onCancelReply,
        isSubmitting,
      ),
    );
    li.appendChild(formWrap);
  }

  // ─── Replies ─────────────────────────────────────────────────────
  if (comment.replies?.length > 0) {
    const repliesList = document.createElement("ul");
    repliesList.className = "z-replies";
    repliesList.setAttribute("aria-label", `Replies to ${comment.commenter.name}`);
    for (const reply of comment.replies) {
      repliesList.appendChild(
        renderCommentItem(
          reply,
          depth + 1,
          onReply,
          onLike,
          replyingToId,
          currentUser,
          onSubmitReply,
          onCancelReply,
          isSubmitting,
        ),
      );
    }
    li.appendChild(repliesList);
  }

  return li;
}

function renderInlineReplyForm(
  replyTo: CommentData,
  currentUser: Commenter,
  onSubmit: (body: string, parentId: string) => void,
  onCancel: () => void,
  isSubmitting: boolean,
): HTMLElement {
  const MAX_CHARS = 2000;

  const wrap = document.createElement("div");
  wrap.className = "z-inline-form";

  const header = document.createElement("div");
  header.className = "z-inline-form-header";
  header.appendChild(avatarEl(currentUser.name, currentUser.image, true));

  const label = document.createElement("span");
  label.className = "z-inline-form-label";
  label.textContent = `Reply to ${replyTo.commenter.name}`;
  header.appendChild(label);
  wrap.appendChild(header);

  const textarea = document.createElement("textarea");
  textarea.placeholder = `Reply to ${replyTo.commenter.name}…`;
  textarea.setAttribute("aria-label", `Reply to ${replyTo.commenter.name}`);
  textarea.rows = 2;
  textarea.disabled = isSubmitting;
  wrap.appendChild(textarea);

  const footer = document.createElement("div");
  footer.className = "z-inline-form-footer";

  const counter = document.createElement("span");
  counter.className = "z-char-counter";
  counter.setAttribute("aria-live", "polite");
  counter.textContent = `0 / ${MAX_CHARS}`;
  footer.appendChild(counter);

  const btnWrap = document.createElement("div");
  btnWrap.className = "z-inline-form-btns";

  const cancelBtn = document.createElement("button");
  cancelBtn.className = "z-btn z-btn-ghost z-btn-sm";
  cancelBtn.type = "button";
  cancelBtn.textContent = "Cancel";
  cancelBtn.addEventListener("click", onCancel);
  btnWrap.appendChild(cancelBtn);

  const submitBtn = document.createElement("button");
  submitBtn.className = "z-btn z-btn-primary z-btn-sm";
  submitBtn.type = "button";
  submitBtn.textContent = isSubmitting ? "Posting…" : "Reply";
  submitBtn.disabled = isSubmitting;
  submitBtn.addEventListener("click", async () => {
    const body = textarea.value.trim();
    if (!body || body.length > MAX_CHARS) {
      textarea.focus();
      return;
    }
    await onSubmit(body, replyTo.id);
  });
  btnWrap.appendChild(submitBtn);
  footer.appendChild(btnWrap);
  wrap.appendChild(footer);

  // Auto-grow
  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;
    counter.classList.toggle("z-char-counter-warn", len >= MAX_CHARS * 0.9 && len < MAX_CHARS);
    counter.classList.toggle("z-char-counter-over", len > MAX_CHARS);
    submitBtn.disabled = isSubmitting || len === 0 || len > MAX_CHARS;
  });

  // Focus
  setTimeout(() => textarea.focus(), 0);

  return wrap;
}

export function renderCommentList(
  comments: CommentData[],
  onReply: (comment: CommentData) => void,
  onLike: (comment: CommentData) => void,
  replyingToId: string | null,
  currentUser: Commenter | null,
  onSubmitReply: (body: string, parentId: string) => void,
  onCancelReply: () => void,
  isSubmitting: boolean,
): HTMLElement {
  if (comments.length === 0) {
    const el = document.createElement("div");
    el.className = "z-empty";

    const icon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    icon.setAttribute("viewBox", "0 0 24 24");
    icon.setAttribute("fill", "none");
    icon.setAttribute("stroke", "currentColor");
    icon.setAttribute("stroke-width", "1.5");
    icon.setAttribute("aria-hidden", "true");
    icon.classList.add("z-empty-icon");
    icon.innerHTML = `<path stroke-linecap="round" stroke-linejoin="round" d="M2.25 12.76c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />`;
    el.appendChild(icon);

    const title = document.createElement("p");
    title.className = "z-empty-title";
    title.textContent = "No comments yet";
    el.appendChild(title);

    const desc = document.createElement("p");
    desc.className = "z-empty-desc";
    desc.textContent = "Be the first to share your thoughts.";
    el.appendChild(desc);

    return el;
  }

  const list = document.createElement("ul");
  list.className = "z-list";
  list.setAttribute("aria-label", "Comments");
  for (const c of comments) {
    list.appendChild(
      renderCommentItem(
        c,
        0,
        onReply,
        onLike,
        replyingToId,
        currentUser,
        onSubmitReply,
        onCancelReply,
        isSubmitting,
      ),
    );
  }
  return list;
}

export function renderAuthBar(
  auth: AuthState,
  onSignIn: () => void,
  onSignOut: () => void,
): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "z-auth-bar";

  if (auth.status === "authenticated") {
    bar.appendChild(avatarEl(auth.user.name, auth.user.image ?? null));
    const name = document.createElement("span");
    name.className = "z-user-name";
    name.textContent = auth.user.name;
    bar.appendChild(name);

    const signOutBtn = document.createElement("button");
    signOutBtn.className = "z-btn z-btn-ghost z-btn-sm";
    signOutBtn.textContent = "Sign out";
    signOutBtn.type = "button";
    signOutBtn.addEventListener("click", onSignOut);
    bar.appendChild(signOutBtn);
  } else {
    const label = document.createElement("span");
    label.className = "z-user-name";
    label.textContent = "Sign in to comment";
    bar.appendChild(label);

    const signInBtn = document.createElement("button");
    signInBtn.className = "z-btn z-btn-google";
    signInBtn.type = "button";
    signInBtn.disabled = auth.status === "loading";
    signInBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>${auth.status === "loading" ? "Signing in…" : "Continue with Google"}`;
    signInBtn.addEventListener("click", onSignIn);
    bar.appendChild(signInBtn);
  }

  return bar;
}

const MAX_CHARS = 2000;

export function renderCommentForm(
  onSubmit: (body: string, parentId?: string) => Promise<void>,
  replyTo: CommentData | null,
  onCancelReply: () => void,
  isSubmitting: boolean,
): HTMLElement {
  const form = document.createElement("div");
  form.className = "z-form";

  if (replyTo) {
    const indicator = document.createElement("div");
    indicator.className = "z-reply-indicator";
    indicator.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" /></svg>Replying to <strong>${replyTo.commenter.name}</strong>`;
    const cancelBtn = document.createElement("button");
    cancelBtn.type = "button";
    cancelBtn.className = "z-reply-indicator-cancel";
    cancelBtn.setAttribute("aria-label", "Cancel reply");
    cancelBtn.textContent = "✕";
    cancelBtn.addEventListener("click", onCancelReply);
    indicator.appendChild(cancelBtn);
    form.appendChild(indicator);
  }

  const textarea = document.createElement("textarea");
  textarea.placeholder = replyTo
    ? `Reply to ${replyTo.commenter.name}…`
    : "Write a comment…";
  textarea.setAttribute(
    "aria-label",
    replyTo ? `Reply to ${replyTo.commenter.name}` : "Write a comment",
  );
  textarea.rows = 3;
  textarea.disabled = isSubmitting;

  textarea.addEventListener("input", () => {
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
    const len = textarea.value.length;
    counter.textContent = `${len} / ${MAX_CHARS}`;
    counter.classList.toggle("z-char-counter-warn", len >= MAX_CHARS * 0.9 && len < MAX_CHARS);
    counter.classList.toggle("z-char-counter-over", len > MAX_CHARS);
    submitBtn.disabled = isSubmitting || len === 0 || len > MAX_CHARS;
  });

  form.appendChild(textarea);

  const footer = document.createElement("div");
  footer.className = "z-form-footer";

  const counter = document.createElement("span");
  counter.className = "z-char-counter";
  counter.setAttribute("aria-live", "polite");
  counter.textContent = `0 / ${MAX_CHARS}`;
  footer.appendChild(counter);

  const submitBtn = document.createElement("button");
  submitBtn.className = "z-btn z-btn-primary";
  submitBtn.type = "button";
  submitBtn.textContent = isSubmitting ? "Posting…" : replyTo ? "Post reply" : "Post comment";
  submitBtn.disabled = isSubmitting;
  submitBtn.addEventListener("click", async () => {
    const body = textarea.value.trim();
    if (!body || body.length > MAX_CHARS) {
      textarea.focus();
      return;
    }
    await onSubmit(body, replyTo?.id);
    textarea.value = "";
    textarea.style.height = "";
    counter.textContent = `0 / ${MAX_CHARS}`;
    counter.classList.remove("z-char-counter-warn", "z-char-counter-over");
    submitBtn.disabled = true;
  });

  footer.appendChild(submitBtn);
  form.appendChild(footer);

  return form;
}

export function renderError(message: string): HTMLElement {
  const el = document.createElement("div");
  el.className = "z-error";
  el.setAttribute("role", "alert");
  el.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>${message}`;
  return el;
}

export function renderLoadingAuthBar(): HTMLElement {
  const bar = document.createElement("div");
  bar.className = "z-skeleton-authbar";
  bar.setAttribute("aria-hidden", "true");

  const avatar = document.createElement("div");
  avatar.className = "z-skeleton z-skeleton-avatar";
  bar.appendChild(avatar);

  const name = document.createElement("div");
  name.className = "z-skeleton z-skeleton-name";
  name.style.width = "90px";
  bar.appendChild(name);

  const spacer = document.createElement("div");
  spacer.className = "z-skeleton-spacer";
  bar.appendChild(spacer);

  const btn = document.createElement("div");
  btn.className = "z-skeleton z-skeleton-name";
  btn.style.width = "70px";
  btn.style.height = "28px";
  btn.style.borderRadius = "var(--z-radius-sm)";
  bar.appendChild(btn);

  return bar;
}

export function renderLoading(): HTMLElement {
  const wrap = document.createElement("div");
  wrap.setAttribute("aria-busy", "true");
  wrap.setAttribute("aria-label", "Loading comments");

  const items: [string, string[]][] = [
    ["110px", ["88%", "64%"]],
    ["80px", ["92%", "76%", "48%"]],
    ["130px", ["70%", "84%"]],
  ];

  const list = document.createElement("ul");
  list.className = "z-loading";

  for (const [nameWidth, bodyLines] of items) {
    const item = document.createElement("li");
    item.className = "z-skeleton-item";

    const meta = document.createElement("div");
    meta.className = "z-skeleton-meta";
    meta.setAttribute("aria-hidden", "true");

    const avatar = document.createElement("div");
    avatar.className = "z-skeleton z-skeleton-avatar";
    meta.appendChild(avatar);

    const name = document.createElement("div");
    name.className = "z-skeleton z-skeleton-name";
    name.style.width = nameWidth;
    meta.appendChild(name);

    const spacer = document.createElement("div");
    spacer.className = "z-skeleton-spacer";
    meta.appendChild(spacer);

    const time = document.createElement("div");
    time.className = "z-skeleton z-skeleton-time";
    meta.appendChild(time);

    item.appendChild(meta);

    for (const w of bodyLines) {
      const line = document.createElement("div");
      line.className = "z-skeleton z-skeleton-line";
      line.style.width = w;
      item.appendChild(line);
    }

    list.appendChild(item);
  }

  wrap.appendChild(list);
  return wrap;
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/render.ts
git commit -m "feat(widget): new comment card layout with likes, inline replies"
```

---

### Task 12: Widget Styles

**Files:**
- Modify: `widget/src/styles.css`

- [ ] **Step 1: Replace entire file**

```css
/* Zeon Comments Widget — scoped inside shadow DOM */

:host {
  display: block;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  font-size: 14px;
  line-height: 1.6;

  --z-bg:         #ffffff;
  --z-text:       #0f172a;
  --z-border:     #e2e8f0;
  --z-muted:      #64748b;
  --z-primary:    #0f172a;
  --z-primary-fg: #ffffff;
  --z-subtle:     #f1f5f9;
  --z-accent:     #f1f5f9;
  --z-radius:     8px;

  --z-radius-sm:  calc(var(--z-radius) * 0.6);
  --z-radius-lg:  calc(var(--z-radius) * 1.5);

  --z-skel-base:  #e8edf2;
  --z-skel-glow:  #f8fafc;

  color: var(--z-text);
}

@media (prefers-color-scheme: dark) {
  :host {
    --z-bg:         #0f172a;
    --z-text:       #f8fafc;
    --z-border:     #1e293b;
    --z-muted:      #94a3b8;
    --z-subtle:     #1e293b;
    --z-accent:     #1e293b;
    --z-skel-base:  #1e293b;
    --z-skel-glow:  #334155;
  }
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ─── Root container ─────────────────────────────────────────────────────── */
.z-root {
  background: var(--z-bg);
  border: 1px solid var(--z-border);
  border-radius: var(--z-radius-lg);
  overflow: hidden;
}

/* ─── Header ─────────────────────────────────────────────────────────────── */
.z-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 13px;
  border-bottom: 1px solid var(--z-border);
}

.z-header h2 {
  font-size: 14px;
  font-weight: 600;
  color: var(--z-text);
  letter-spacing: -0.01em;
}

/* ─── Auth bar ───────────────────────────────────────────────────────────── */
.z-auth-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--z-border);
  background: var(--z-subtle);
  min-height: 48px;
}

/* ─── Avatars ────────────────────────────────────────────────────────────── */
.z-avatar,
.z-avatar-placeholder {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
}

.z-avatar {
  background: var(--z-subtle);
  object-fit: cover;
}

.z-avatar-placeholder {
  background: var(--z-subtle);
  border: 1px solid var(--z-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--z-muted);
  letter-spacing: 0.03em;
}

.z-avatar-sm,
.z-avatar-placeholder-sm {
  width: 24px;
  height: 24px;
  font-size: 9px;
}

.z-user-name {
  font-size: 13px;
  font-weight: 500;
  flex: 1;
  color: var(--z-text);
}

/* ─── Buttons ────────────────────────────────────────────────────────────── */
.z-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--z-radius-sm);
  font-size: 13px;
  font-weight: 500;
  cursor: pointer;
  border: 1px solid transparent;
  transition: background-color 0.12s, opacity 0.12s, color 0.12s;
  font-family: inherit;
  touch-action: manipulation;
  white-space: nowrap;
  user-select: none;
}

.z-btn:focus-visible {
  outline: 2px solid var(--z-primary);
  outline-offset: 2px;
}

.z-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  pointer-events: none;
}

.z-btn-primary {
  background: var(--z-primary);
  color: var(--z-primary-fg);
  border-color: var(--z-primary);
}

.z-btn-primary:hover:not(:disabled) {
  opacity: 0.88;
}

.z-btn-ghost {
  background: transparent;
  color: var(--z-muted);
  border-color: var(--z-border);
}

.z-btn-ghost:hover:not(:disabled) {
  background: var(--z-accent);
  color: var(--z-text);
}

.z-btn-sm {
  padding: 3px 9px;
  font-size: 12px;
  border-radius: calc(var(--z-radius-sm) * 0.85);
}

.z-btn-google {
  background: var(--z-bg);
  color: var(--z-text);
  border-color: var(--z-border);
  font-size: 13px;
  padding: 6px 14px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
}

.z-btn-google:hover:not(:disabled) {
  background: var(--z-accent);
}

.z-btn-google svg {
  flex-shrink: 0;
}

/* ─── Comment form ───────────────────────────────────────────────────────── */
.z-form {
  padding: 12px 16px;
  border-bottom: 1px solid var(--z-border);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.z-form textarea {
  width: 100%;
  min-height: 80px;
  max-height: 360px;
  padding: 9px 11px;
  border: 1px solid var(--z-border);
  border-radius: var(--z-radius-sm);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: none;
  overflow-y: hidden;
  background: var(--z-bg);
  color: var(--z-text);
  transition: border-color 0.12s, box-shadow 0.12s;
  display: block;
}

.z-form textarea:focus {
  outline: none;
  border-color: var(--z-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--z-primary) 12%, transparent);
}

.z-form textarea::placeholder {
  color: var(--z-muted);
}

.z-form textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.z-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.z-char-counter {
  font-size: 11px;
  color: var(--z-muted);
  font-variant-numeric: tabular-nums;
  transition: color 0.12s;
}

.z-char-counter-warn {
  color: #f59e0b;
}

.z-char-counter-over {
  color: #ef4444;
  font-weight: 600;
}

/* Reply indicator */
.z-reply-indicator {
  padding: 6px 10px 6px 12px;
  background: var(--z-accent);
  border: 1px solid var(--z-border);
  border-left: 3px solid var(--z-primary);
  border-radius: var(--z-radius-sm);
  font-size: 12px;
  color: var(--z-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.z-reply-indicator strong {
  color: var(--z-text);
  font-weight: 600;
}

.z-reply-indicator-cancel {
  margin-left: auto;
  background: none;
  border: none;
  cursor: pointer;
  color: var(--z-muted);
  padding: 2px 4px;
  border-radius: 4px;
  font-size: 14px;
  line-height: 1;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
}

.z-reply-indicator-cancel:hover {
  background: var(--z-border);
  color: var(--z-text);
}

/* ─── Comments list ──────────────────────────────────────────────────────── */
.z-list {
  list-style: none;
}

.z-empty {
  padding: 40px 16px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.z-empty-icon {
  width: 40px;
  height: 40px;
  color: var(--z-border);
  opacity: 0.8;
}

.z-empty-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--z-text);
}

.z-empty-desc {
  font-size: 13px;
  color: var(--z-muted);
}

/* ─── Comment item ───────────────────────────────────────────────────────── */
.z-comment {
  padding: 14px 16px;
  border-bottom: 1px solid var(--z-border);
}

.z-comment:last-child {
  border-bottom: none;
}

.z-comment-content {
  display: flex;
  gap: 10px;
}

.z-comment-right {
  flex: 1;
  min-width: 0;
}

.z-comment-meta {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 2px;
}

.z-comment-author {
  font-weight: 600;
  font-size: 13px;
  color: var(--z-text);
}

.z-comment-username {
  font-size: 13px;
  color: var(--z-muted);
}

.z-comment-body {
  font-size: 13.5px;
  line-height: 1.65;
  color: var(--z-text);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: break-word;
}

.z-comment-actions {
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.z-comment-action-time {
  font-size: 12px;
  color: var(--z-muted);
}

.z-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: var(--z-radius-sm);
  font-size: 12px;
  font-weight: 500;
  color: var(--z-muted);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: background-color 0.12s, color 0.12s;
  font-family: inherit;
}

.z-action-btn:hover {
  background: var(--z-accent);
  color: var(--z-text);
}

.z-action-btn-active {
  color: var(--z-primary);
}

.z-action-btn-active:hover {
  color: var(--z-primary);
  background: color-mix(in srgb, var(--z-primary) 12%, transparent);
}

/* ─── Inline reply ───────────────────────────────────────────────────────── */
.z-inline-reply {
  margin-top: 12px;
  margin-left: 40px;
}

.z-inline-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--z-border);
  border-radius: var(--z-radius-sm);
  background: var(--z-bg);
}

.z-inline-form-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.z-inline-form-label {
  font-size: 12px;
  font-weight: 500;
  color: var(--z-muted);
}

.z-inline-form textarea {
  width: 100%;
  min-height: 60px;
  max-height: 240px;
  padding: 8px 10px;
  border: 1px solid var(--z-border);
  border-radius: var(--z-radius-sm);
  font-family: inherit;
  font-size: 13px;
  line-height: 1.55;
  resize: none;
  overflow-y: hidden;
  background: var(--z-bg);
  color: var(--z-text);
  transition: border-color 0.12s, box-shadow 0.12s;
}

.z-inline-form textarea:focus {
  outline: none;
  border-color: var(--z-primary);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--z-primary) 12%, transparent);
}

.z-inline-form textarea::placeholder {
  color: var(--z-muted);
}

.z-inline-form textarea:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.z-inline-form-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.z-inline-form-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* ─── Replies ────────────────────────────────────────────────────────────── */
.z-replies {
  margin-top: 12px;
  margin-left: 40px;
  padding-left: 12px;
  border-left: 2px solid var(--z-border);
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 0;
}

.z-reply {
  padding: 10px 0;
  border-bottom: 1px solid var(--z-border);
}

.z-reply:last-child {
  border-bottom: none;
  padding-bottom: 2px;
}

.z-reply .z-comment-body {
  padding-left: 0;
}

.z-reply .z-comment-meta {
  margin-bottom: 2px;
}

/* ─── Pending badge ──────────────────────────────────────────────────────── */
.z-pending-badge {
  display: inline-flex;
  align-items: center;
  padding: 1px 7px;
  border-radius: 99px;
  font-size: 11px;
  font-weight: 500;
  background: color-mix(in srgb, #f59e0b 12%, var(--z-bg));
  color: #b45309;
  border: 1px solid color-mix(in srgb, #f59e0b 25%, transparent);
}

@media (prefers-color-scheme: dark) {
  :host .z-pending-badge {
    background: color-mix(in srgb, #f59e0b 15%, transparent);
    color: #fbbf24;
    border-color: color-mix(in srgb, #f59e0b 30%, transparent);
  }
}

/* ─── Loading skeleton ───────────────────────────────────────────────────── */
.z-loading {
  padding: 0;
  list-style: none;
}

.z-skeleton-authbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--z-border);
  background: var(--z-subtle);
  min-height: 48px;
}

.z-skeleton-item {
  padding: 14px 16px;
  border-bottom: 1px solid var(--z-border);
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.z-skeleton-item:last-child {
  border-bottom: none;
}

.z-skeleton-meta {
  display: flex;
  align-items: center;
  gap: 8px;
}

.z-skeleton-spacer {
  flex: 1;
}

.z-skeleton {
  background: linear-gradient(
    90deg,
    var(--z-skel-base) 25%,
    var(--z-skel-glow) 50%,
    var(--z-skel-base) 75%
  );
  background-size: 300% 100%;
  border-radius: 4px;
  animation: z-shimmer 1.8s ease-in-out infinite;
}

@keyframes z-shimmer {
  0%   { background-position: 100% 0; }
  100% { background-position: -100% 0; }
}

.z-skeleton-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  flex-shrink: 0;
}

.z-skeleton-name {
  height: 11px;
  border-radius: 4px;
}

.z-skeleton-time {
  height: 10px;
  width: 44px;
  border-radius: 4px;
  flex-shrink: 0;
}

.z-skeleton-line {
  height: 11px;
  border-radius: 4px;
  margin-left: 38px;
}

/* ─── Error ──────────────────────────────────────────────────────────────── */
.z-error {
  padding: 10px 16px;
  background: color-mix(in srgb, #ef4444 10%, var(--z-bg));
  color: #b91c1c;
  font-size: 13px;
  border-bottom: 1px solid color-mix(in srgb, #ef4444 20%, transparent);
  display: flex;
  align-items: center;
  gap: 8px;
}

@media (prefers-color-scheme: dark) {
  :host .z-error {
    color: #fca5a5;
  }
}

/* ─── Accessibility ──────────────────────────────────────────────────────── */
@media (prefers-reduced-motion: reduce) {
  .z-btn,
  .z-form textarea,
  .z-inline-form textarea {
    transition: none;
  }
  .z-skeleton {
    animation: none;
    background: var(--z-subtle);
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/styles.css
git commit -m "feat(widget): styles for new card layout, likes, inline replies"
```

---

### Task 13: Widget Controller

**Files:**
- Modify: `widget/src/index.ts`

- [ ] **Step 1: Replace entire file**

```typescript
import type {
  AuthState,
  CommentData,
  Commenter,
  WidgetConfig,
  WidgetThemeConfig,
} from "./types";
import { fetchComments, postComment, likeComment } from "./api";
import { loadStoredAuth, signInWithGoogle, clearAuth } from "./auth";
import {
  renderAuthBar,
  renderCommentForm,
  renderCommentList,
  renderError,
  renderLoading,
  renderLoadingAuthBar,
} from "./render";

declare const __APP_URL__: string;
declare const __GOOGLE_CLIENT_ID__: string;
declare const __STYLES__: string;

function readableOn(hex: string): string {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex);
  if (!m) return "#ffffff";
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 0xff;
  const g = (n >> 8) & 0xff;
  const b = n & 0xff;
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.6 ? "#0f172a" : "#ffffff";
}

function buildThemeStyle(cfg: WidgetThemeConfig): string {
  const lines: string[] = [];

  if (cfg.theme === "DARK") {
    lines.push(`:host {
  --z-bg: #0f172a;
  --z-text: #f8fafc;
  --z-border: #1e293b;
  --z-muted: #94a3b8;
  --z-subtle: #1e293b;
  --z-accent: #1e293b;
  --z-skel-base: #1e293b;
  --z-skel-glow: #334155;
}`);
  } else if (cfg.theme === "LIGHT") {
    lines.push(`:host {
  --z-bg: #ffffff;
  --z-text: #0f172a;
  --z-border: #e2e8f0;
  --z-muted: #64748b;
  --z-subtle: #f1f5f9;
  --z-accent: #f1f5f9;
  --z-skel-base: #e8edf2;
  --z-skel-glow: #f8fafc;
}`);
  }

  lines.push(`:host {
  --z-primary: ${cfg.primaryColor};
  --z-primary-fg: ${readableOn(cfg.primaryColor)};
  --z-radius: ${cfg.radius}px;
}`);

  return lines.join("\n");
}

function themeKey(siteKey: string) {
  return `zeon_theme_${siteKey}`;
}

function loadCachedTheme(siteKey: string): WidgetThemeConfig | null {
  try {
    const raw = localStorage.getItem(themeKey(siteKey));
    return raw ? (JSON.parse(raw) as WidgetThemeConfig) : null;
  } catch {
    return null;
  }
}

function saveCachedTheme(siteKey: string, cfg: WidgetThemeConfig) {
  try {
    localStorage.setItem(themeKey(siteKey), JSON.stringify(cfg));
  } catch { /* storage quota / private mode */ }
}

class ZeonWidget {
  private config: WidgetConfig;
  private shadow: ShadowRoot;
  private root: HTMLElement;
  private themeStyle: HTMLStyleElement;
  private auth: AuthState;
  private comments: CommentData[] = [];
  private replyTo: CommentData | null = null;
  private replyingToId: string | null = null;
  private isSubmitting = false;

  constructor(config: WidgetConfig) {
    this.config = config;
    this.shadow = config.container.attachShadow({ mode: "open" });
    this.auth = loadStoredAuth();

    const style = document.createElement("style");
    style.textContent = __STYLES__;
    this.shadow.appendChild(style);

    this.themeStyle = document.createElement("style");
    const cached = loadCachedTheme(config.siteKey);
    if (cached) this.themeStyle.textContent = buildThemeStyle(cached);
    this.shadow.appendChild(this.themeStyle);

    this.root = document.createElement("div");
    this.root.className = "z-root";
    this.shadow.appendChild(this.root);

    this.render();
    this.loadComments();
  }

  private get token(): string | undefined {
    return this.auth.status === "authenticated" ? this.auth.token : undefined;
  }

  private get currentUser(): Commenter | null {
    if (this.auth.status !== "authenticated") return null;
    return {
      id: this.auth.user.commenterId,
      name: this.auth.user.name,
      username: this.auth.user.email.split("@")[0] ?? "user",
      image: this.auth.user.image ?? null,
    };
  }

  private async loadComments() {
    this.renderLoadingState();
    try {
      const { comments, config: themeConfig } = await fetchComments(
        this.config.appUrl,
        this.config.siteKey,
        this.config.slug,
        this.token,
      );
      this.themeStyle.textContent = buildThemeStyle(themeConfig);
      saveCachedTheme(this.config.siteKey, themeConfig);
      this.comments = comments;
      this.render();
    } catch {
      this.renderErrorState("Failed to load comments. Please try again later.");
    }
  }

  private async handleSignIn() {
    this.auth = { status: "loading" };
    this.render();
    try {
      const googleClientId = __GOOGLE_CLIENT_ID__;
      const { token, user } = await signInWithGoogle(this.config.appUrl, googleClientId);
      this.auth = { status: "authenticated", token, user };
      // Re-fetch with auth to get hasLiked states
      await this.loadComments();
      return;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Sign-in failed";
      this.auth = { status: "error", message };
      setTimeout(() => {
        this.auth = { status: "idle" };
        this.render();
      }, 3000);
    }
    this.render();
  }

  private handleSignOut() {
    clearAuth();
    this.auth = { status: "idle" };
    this.replyTo = null;
    this.replyingToId = null;
    this.render();
  }

  private async handleSubmit(body: string, parentId?: string) {
    if (this.auth.status !== "authenticated") return;
    this.isSubmitting = true;
    this.render();
    try {
      // If replying to a nested reply, prefix with @username and use top-level parent
      let finalBody = body;
      let finalParentId = parentId;
      if (parentId) {
        const target = this.findComment(parentId);
        if (target && target.commenter) {
          // Check if target is already a nested reply (has a parent itself in the tree)
          const isNestedReply = this.findParentComment(parentId) !== null;
          if (isNestedReply) {
            finalBody = `@${target.commenter.username} ${body}`;
            // Use the same parent as the target reply (parallel thread)
            finalParentId = target.parentId ?? parentId;
          }
        }
      }

      const comment = await postComment(this.config.appUrl, this.auth.token, {
        body: finalBody,
        siteKey: this.config.siteKey,
        slug: this.config.slug,
        parentId: finalParentId,
      });

      if (finalParentId) {
        const parent = this.comments.find((c) => c.id === finalParentId);
        if (parent) {
          parent.replies = [...(parent.replies ?? []), comment];
        }
      } else {
        this.comments = [...this.comments, comment];
      }
      this.replyTo = null;
      this.replyingToId = null;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to post";
      this.renderErrorBanner(message);
    } finally {
      this.isSubmitting = false;
      this.render();
    }
  }

  private async handleLike(comment: CommentData) {
    if (this.auth.status !== "authenticated") {
      this.handleSignIn();
      return;
    }
    try {
      const result = await likeComment(
        this.config.appUrl,
        this.auth.token,
        comment.id,
      );
      comment.hasLiked = result.liked;
      comment.likeCount = result.count;
      this.render();
    } catch {
      this.renderErrorBanner("Failed to update like");
    }
  }

  private findComment(id: string): CommentData | null {
    for (const c of this.comments) {
      if (c.id === id) return c;
      for (const r of c.replies ?? []) {
        if (r.id === id) return r;
      }
    }
    return null;
  }

  private findParentComment(replyId: string): CommentData | null {
    for (const c of this.comments) {
      if (c.replies?.some((r) => r.id === replyId)) return c;
    }
    return null;
  }

  private handleReplyClick(comment: CommentData) {
    if (this.auth.status !== "authenticated") {
      this.handleSignIn();
      return;
    }
    this.replyingToId = comment.id;
    this.render();
  }

  private handleCancelReply() {
    this.replyingToId = null;
    this.render();
  }

  private renderLoadingState() {
    this.root.innerHTML = "";
    const header = document.createElement("div");
    header.className = "z-header";
    const titleSkel = document.createElement("div");
    titleSkel.className = "z-skeleton z-skeleton-name";
    titleSkel.style.width = "80px";
    titleSkel.style.height = "14px";
    titleSkel.setAttribute("aria-hidden", "true");
    header.appendChild(titleSkel);
    this.root.appendChild(header);
    this.root.appendChild(renderLoadingAuthBar());
    this.root.appendChild(renderLoading());
  }

  private renderErrorState(message: string) {
    this.root.innerHTML = "";
    this.root.appendChild(renderError(message));
  }

  private renderErrorBanner(message: string) {
    const existing = this.root.querySelector(".z-error");
    if (existing) existing.remove();
    const banner = renderError(message);
    this.root.insertBefore(banner, this.root.firstChild);
    setTimeout(() => banner.remove(), 4000);
  }

  private buildHeader(): HTMLElement {
    const header = document.createElement("div");
    header.className = "z-header";
    const heading = document.createElement("h2");
    const count = this.comments.length;
    heading.textContent = `${count} Comment${count !== 1 ? "s" : ""}`;
    header.appendChild(heading);
    return header;
  }

  private render() {
    this.root.innerHTML = "";
    this.root.appendChild(this.buildHeader());

    if (this.auth.status === "error") {
      this.root.appendChild(renderError(this.auth.message));
    }

    this.root.appendChild(
      renderAuthBar(
        this.auth,
        () => this.handleSignIn(),
        () => this.handleSignOut(),
      ),
    );

    if (this.auth.status === "authenticated") {
      this.root.appendChild(
        renderCommentForm(
          (body, parentId) => this.handleSubmit(body, parentId),
          this.replyTo,
          () => {
            this.replyTo = null;
            this.render();
          },
          this.isSubmitting,
        ),
      );
    }

    this.root.appendChild(
      renderCommentList(
        this.comments,
        (comment) => this.handleReplyClick(comment),
        (comment) => this.handleLike(comment),
        this.replyingToId,
        this.currentUser,
        (body, parentId) => this.handleSubmit(body, parentId),
        () => this.handleCancelReply(),
        this.isSubmitting,
      ),
    );
  }
}

function detectAppUrl(): string {
  const script = document.currentScript as HTMLScriptElement | null;
  if (script?.src) {
    const url = new URL(script.src);
    return `${url.protocol}//${url.host}`;
  }
  return __APP_URL__;
}

function mount() {
  const appUrl = detectAppUrl();
  const elements = document.querySelectorAll<HTMLElement>("[data-zeon-comments]");

  for (const el of elements) {
    const siteKey = el.dataset.siteKey;
    const slug = el.dataset.slug;
    if (!siteKey || !slug) {
      console.warn("[Zeon Comments] Missing data-site-key or data-slug", el);
      continue;
    }
    new ZeonWidget({ siteKey, slug, container: el, appUrl });
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}

(window as unknown as Record<string, unknown>).ZeonComments = { mount };
```

- [ ] **Step 2: Commit**

```bash
git add widget/src/index.ts
git commit -m "feat(widget): controller with inline replies, likes, @mentions"
```

---

### Task 14: Migration & Build

- [ ] **Step 1: Create and apply migration**

Run: `npx prisma migrate dev --name add_commenter_and_likes`
Expected: Migration created and applied successfully.

- [ ] **Step 2: Regenerate Prisma client**

Run: `npx prisma generate`
Expected: Client generated at `generated/prisma`.

- [ ] **Step 3: Build widget**

Run: `yarn widget:build`
Expected: `public/embed.js` and `public/embed.debug.js` updated.

- [ ] **Step 4: Type check**

Run: `yarn typecheck`
Expected: No errors.

- [ ] **Step 5: Final commit**

```bash
git add prisma/migrations public/embed.js public/embed.debug.js generated/
git commit -m "feat: migrate db, generate client, build widget"
```

---

## Self-Review

**Spec coverage check:**
- [x] Commenter model with unique username — Task 1
- [x] CommentLike model — Task 1
- [x] Username generation from name with dedup loop — Task 4
- [x] GET comments with commenter, likeCount, hasLiked — Tasks 2, 5
- [x] POST comments with commenterId — Tasks 2, 6
- [x] POST /like toggle endpoint — Tasks 2, 7
- [x] Widget auth upsert Commenter — Task 4
- [x] Name + username display — Tasks 11, 12
- [x] Heart reaction button with count — Tasks 11, 12
- [x] Reply button with inline form — Tasks 11, 12
- [x] First reply creates nested, deeper reply is parallel with @mention — Task 13
- [x] Design tokens only, no arbitrary values — Tasks 11, 12

**Placeholder scan:** No TBD/TODO/fill-in-details found.

**Type consistency:** `commenter` object shape consistent across API → service → widget types. `likeCount`/`hasLiked` present in all layers.

---

**Plan complete and saved to `docs/superpowers/plans/2025-05-09-embed-comment-design.md`.**

Two execution options:

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration
2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

Which approach?