export type WidgetConfig = {
  siteKey: string;
  slug: string;
  container: HTMLElement;
  appUrl: string;
};

export type CommentAuthor = {
  name: string;
  email: string;
  image?: string;
};

export type CommentData = {
  id: string;
  body: string;
  authorName: string;
  authorEmail: string;
  authorImage: string | null;
  status: "PENDING" | "APPROVED";
  createdAt: string;
  parentId: string | null;
  replies: CommentData[];
};

export type AuthState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "authenticated"; token: string; user: CommentAuthor }
  | { status: "error"; message: string };
