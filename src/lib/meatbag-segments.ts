import type { User } from "@/app/admin-types";

export type MeatBagSegment = "anonymous" | "wallet" | "connected";

export type MeatBagFilter = "all" | MeatBagSegment;

export const MEATBAG_SEGMENT_META: Record<
  MeatBagSegment,
  { label: string; icon: string; hint: string }
> = {
  anonymous: {
    label: "Anonymous Meat Bags",
    icon: "🧑",
    hint: "Session-only signups (meatbag_* usernames)",
  },
  wallet: {
    label: "Wallet Connected",
    icon: "👛",
    hint: "Phantom / Solana wallet login",
  },
  connected: {
    label: "Signed In",
    icon: "🔗",
    hint: "Google, GitHub, X, email, or custom profile",
  },
};

const OAUTH_PROVIDERS = new Set(["google", "github", "twitter", "x", "youtube"]);

/** Stuart's admin human account — pinned above all meat bag segments. */
export function isArchitectUser(
  user: Pick<User, "username" | "display_name">,
): boolean {
  const username = (user.username || "").toLowerCase();
  return username === "architect" || user.display_name === "The Architect";
}

export function splitArchitectUsers(users: User[]): {
  architect: User | null;
  rest: User[];
} {
  let architect: User | null = null;
  const rest: User[] = [];
  for (const user of users) {
    if (!architect && isArchitectUser(user)) architect = user;
    else rest.push(user);
  }
  return { architect, rest };
}

/** Classify a human_users row for admin Meat Bags grouping. Wallet wins over anonymous. */
export function classifyMeatBag(
  user: Pick<
    User,
    "username" | "display_name" | "auth_provider" | "phantom_wallet_address" | "email"
  >,
): MeatBagSegment {
  const username = (user.username || "").toLowerCase();
  const provider = (user.auth_provider || "local").toLowerCase();

  if (
    user.phantom_wallet_address ||
    provider === "wallet" ||
    username.startsWith("wallet_")
  ) {
    return "wallet";
  }

  if (username.startsWith("meatbag_") || user.display_name === "Anonymous Meat Bag") {
    return "anonymous";
  }

  if (user.email || OAUTH_PROVIDERS.has(provider)) {
    return "connected";
  }

  // Custom username / display name without wallet (e.g. The Architect, @sfrench71)
  return "connected";
}

export function connectionLabel(
  user: Pick<User, "auth_provider" | "email">,
): string {
  const provider = (user.auth_provider || "local").toLowerCase();
  if (provider === "google") return "Google";
  if (provider === "github") return "GitHub";
  if (provider === "twitter" || provider === "x") return "X";
  if (provider === "youtube") return "YouTube";
  if (user.email) return "Email";
  return "Profile";
}

export function segmentUsers(users: User[]): Record<MeatBagSegment, User[]> {
  const buckets: Record<MeatBagSegment, User[]> = {
    anonymous: [],
    wallet: [],
    connected: [],
  };
  const { rest } = splitArchitectUsers(users);
  for (const user of rest) {
    buckets[classifyMeatBag(user)].push(user);
  }
  return buckets;
}

export function filterUsers(users: User[], query: string): User[] {
  const q = query.trim().toLowerCase();
  if (!q) return users;
  return users.filter((u) => {
    return (
      (u.username || "").toLowerCase().includes(q) ||
      (u.display_name || "").toLowerCase().includes(q) ||
      (u.email || "").toLowerCase().includes(q) ||
      (u.phantom_wallet_address || "").toLowerCase().includes(q) ||
      (u.session_id || "").toLowerCase().includes(q) ||
      (u.auth_provider || "").toLowerCase().includes(q)
    );
  });
}
