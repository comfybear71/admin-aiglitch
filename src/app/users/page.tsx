"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import { useAdmin } from "../AdminContext";
import type { User, UserDetail } from "../admin-types";
import {
  classifyMeatBag,
  connectionLabel,
  filterUsers,
  isArchitectUser,
  MEATBAG_SEGMENT_META,
  segmentUsers,
  splitArchitectUsers,
  type MeatBagFilter,
  type MeatBagSegment,
} from "@/lib/meatbag-segments";

const SEGMENT_ORDER: MeatBagSegment[] = ["anonymous", "wallet", "connected"];

const DEFAULT_SECTION_OPEN: Record<MeatBagSegment, boolean> = {
  anonymous: true,
  wallet: false,
  connected: false,
};

const FILTER_PILLS: { id: MeatBagFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "anonymous", label: "🧑 Anonymous" },
  { id: "wallet", label: "👛 Wallet" },
  { id: "connected", label: "🔗 Signed In" },
];

export default function UsersPage() {
  const { authenticated, users, fetchUsers } = useAdmin();

  const [selectedUser, setSelectedUser] = useState<UserDetail | null>(null);
  const [userSearch, setUserSearch] = useState("");
  const [segmentFilter, setSegmentFilter] = useState<MeatBagFilter>("all");
  const [sectionOpen, setSectionOpen] = useState(DEFAULT_SECTION_OPEN);
  const [editingUser, setEditingUser] = useState<{ id: string; display_name: string; username: string; bio: string; avatar_emoji: string; is_active: boolean } | null>(null);
  const [userActionLoading, setUserActionLoading] = useState(false);

  useEffect(() => {
    if (authenticated && users.length === 0) fetchUsers();
  }, [authenticated]);

  const fetchUserDetail = useCallback(async (userId: string) => {
    setUserActionLoading(true);
    const res = await fetch(`/api/admin/users?action=detail&user_id=${userId}`);
    if (res.ok) { const data = await res.json(); setSelectedUser(data.user); }
    setUserActionLoading(false);
  }, []);

  const updateUser = async () => {
    if (!editingUser) return;
    setUserActionLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: editingUser.id, ...editingUser }),
    });
    if (res.ok) { setEditingUser(null); fetchUsers(); if (selectedUser?.id === editingUser.id) fetchUserDetail(editingUser.id); }
    setUserActionLoading(false);
  };

  const deleteUser = async (userId: string, username: string) => {
    if (!confirm(`Delete @${username} and ALL their data? This cannot be undone.`)) return;
    setUserActionLoading(true);
    const res = await fetch("/api/admin/users", {
      method: "DELETE", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });
    if (res.ok) { setSelectedUser(null); setEditingUser(null); fetchUsers(); }
    setUserActionLoading(false);
  };

  const mergeAccounts = async (targetUserId: string, oldUsernames: string[]) => {
    if (!confirm(`Merge data from ${oldUsernames.join(", ")} into this account?`)) return;
    setUserActionLoading(true);
    const target = users.find(u => u.id === targetUserId);
    if (!target) { setUserActionLoading(false); return; }
    const res = await fetch("/api/auth/human", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "merge_accounts", session_id: target.session_id, old_usernames: oldUsernames }),
    });
    if (res.ok) { const data = await res.json(); alert(data.message); fetchUsers(); fetchUserDetail(targetUserId); }
    setUserActionLoading(false);
  };

  const filteredUsers = useMemo(
    () => filterUsers(users, userSearch),
    [users, userSearch],
  );
  const { architect, rest: filteredRest } = useMemo(
    () => splitArchitectUsers(filteredUsers),
    [filteredUsers],
  );
  const segmentedUsers = useMemo(
    () => segmentUsers(filteredUsers),
    [filteredUsers],
  );
  const segmentCounts = useMemo(
    () => segmentUsers(users),
    [users],
  );
  const architectAccount = useMemo(
    () => users.find(isArchitectUser) ?? null,
    [users],
  );
  const meatBagCount = architectAccount ? users.length - 1 : users.length;

  const renderUserCard = (u: User) => (
    <div
      key={u.id}
      className={`bg-gray-900 border rounded-xl p-3 sm:p-4 cursor-pointer hover:border-purple-500/50 transition-colors ${selectedUser?.id === u.id ? "border-purple-500/50" : "border-gray-800"}`}
      onClick={() => fetchUserDetail(u.id)}
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xl shrink-0">{u.avatar_emoji}</span>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-xs sm:text-sm text-gray-300 truncate">{u.display_name}</p>
              {!u.is_active && (
                <span className="px-1 py-0.5 bg-red-500/20 text-red-400 rounded text-[10px] font-bold">OFF</span>
              )}
              {classifyMeatBag(u) === "connected" && (
                <span className="px-1.5 py-0.5 bg-cyan-500/10 text-cyan-400 rounded text-[10px] font-bold">
                  {connectionLabel(u)}
                </span>
              )}
            </div>
            <p className="text-[10px] sm:text-xs text-gray-500">@{u.username}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <div className="flex gap-2 text-xs">
              <span title="Likes">❤️ {u.likes}</span>
              <span title="Comments">💬 {u.comments}</span>
              <span title="NFTs">🎴 {u.nfts}</span>
              <span title="Coins">🪙 {u.coin_balance.toLocaleString()}</span>
            </div>
            <p className="text-[10px] text-gray-500">{new Date(u.last_seen).toLocaleDateString()}</p>
          </div>
          {classifyMeatBag(u) === "wallet" && (
            <span title="Phantom wallet" className="text-purple-400 text-sm">👛</span>
          )}
          {u.auth_provider === "google" && <span title="Google" className="text-sm">🔵</span>}
          {u.auth_provider === "github" && <span title="GitHub" className="text-sm">🐙</span>}
          {(u.auth_provider === "twitter" || u.auth_provider === "x") && (
            <span title="X" className="text-sm">𝕏</span>
          )}
        </div>
      </div>
    </div>
  );

  const renderSegmentBlock = (segment: MeatBagSegment) => {
    const list = segmentedUsers[segment];
    if (list.length === 0) return null;
    const meta = MEATBAG_SEGMENT_META[segment];
    const open = sectionOpen[segment];
    return (
      <section key={segment} className="border border-gray-800 rounded-xl overflow-hidden">
        <button
          type="button"
          onClick={() =>
            setSectionOpen((prev) => ({ ...prev, [segment]: !prev[segment] }))
          }
          className="w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 bg-gray-900/80 hover:bg-gray-800/60 transition-colors text-left"
        >
          <h3 className="text-xs font-bold text-gray-300">
            {meta.icon} {meta.label}
            <span className="ml-2 text-gray-500 font-normal">({list.length})</span>
          </h3>
          <div className="flex items-center gap-2 shrink-0">
            <p className="text-[10px] text-gray-600 hidden sm:block">{meta.hint}</p>
            <span className="text-gray-500 text-xs">{open ? "▼" : "▶"}</span>
          </div>
        </button>
        {open && (
          <div className="p-2 space-y-2 border-t border-gray-800 bg-gray-950/40">
            {list.map(renderUserCard)}
          </div>
        )}
      </section>
    );
  };

  return (
    <div className="space-y-3">
      {/* Search bar */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 sm:p-4">
        <div className="flex items-center gap-2">
          <input value={userSearch} onChange={(e) => setUserSearch(e.target.value)}
            placeholder="Search by username, display name, or wallet..."
            className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" />
          <button onClick={fetchUsers} className="px-3 py-2 bg-purple-500/20 text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-500/30">Refresh</button>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-3">
          {FILTER_PILLS.map((pill) => {
            const count =
              pill.id === "all"
                ? meatBagCount
                : segmentCounts[pill.id as MeatBagSegment].length;
            const active = segmentFilter === pill.id;
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSegmentFilter(pill.id)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold transition-colors ${
                  active
                    ? "bg-purple-500/30 text-purple-200 border border-purple-500/50"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                }`}
              >
                {pill.label} ({count})
              </button>
            );
          })}
        </div>
        <p className="text-[10px] text-gray-500 mt-2">
          {meatBagCount} meat bags
          {architectAccount ? " + The Architect" : ""}
          {" · "}
          {segmentCounts.anonymous.length} anonymous
          {" · "}
          {segmentCounts.wallet.length} wallet
          {" · "}
          {segmentCounts.connected.length} signed in
          {userSearch ? ` · ${filteredRest.length} matching search` : ""}
        </p>
      </div>

      {/* User detail modal */}
      {selectedUser && (
        <div className="bg-gray-900 border-2 border-purple-500/50 rounded-xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">{selectedUser.avatar_emoji}</span>
              <div>
                <p className="font-bold text-lg">{selectedUser.display_name}</p>
                <p className="text-sm text-gray-400">@{selectedUser.username}</p>
              </div>
              {!selectedUser.is_active && <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">DISABLED</span>}
            </div>
            <button onClick={() => { setSelectedUser(null); setEditingUser(null); }} className="text-gray-400 hover:text-white text-xl px-2">✕</button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-purple-400">{selectedUser.stats.likes}</p><p className="text-[10px] text-gray-500">Likes</p></div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-blue-400">{selectedUser.stats.comments}</p><p className="text-[10px] text-gray-500">Comments</p></div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-amber-400">{selectedUser.nfts.length}</p><p className="text-[10px] text-gray-500">NFTs</p></div>
            <div className="bg-gray-800/50 rounded-lg p-2 text-center"><p className="text-lg font-bold text-green-400">{selectedUser.coins.balance.toLocaleString()}</p><p className="text-[10px] text-gray-500">Coins</p></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Auth: </span><span className="text-gray-300">{selectedUser.auth_provider || "local"}</span></div>
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Wallet: </span><span className="text-gray-300 font-mono">{selectedUser.phantom_wallet_address ? `${selectedUser.phantom_wallet_address.slice(0, 8)}...${selectedUser.phantom_wallet_address.slice(-6)}` : "None"}</span></div>
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Joined: </span><span className="text-gray-300">{new Date(selectedUser.created_at).toLocaleDateString()}</span></div>
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Last seen: </span><span className="text-gray-300">{new Date(selectedUser.last_seen).toLocaleString()}</span></div>
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Bookmarks: </span><span className="text-gray-300">{selectedUser.stats.bookmarks}</span></div>
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Following: </span><span className="text-gray-300">{selectedUser.stats.subscriptions}</span></div>
            <div className="bg-gray-800/30 rounded-lg p-2 sm:col-span-2"><span className="text-gray-500">Session: </span><span className="text-gray-300 font-mono text-[10px]">{selectedUser.session_id}</span></div>
            {selectedUser.bio && <div className="bg-gray-800/30 rounded-lg p-2 sm:col-span-2"><span className="text-gray-500">Bio: </span><span className="text-gray-300">{selectedUser.bio}</span></div>}
            <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Lifetime coins: </span><span className="text-gray-300">{selectedUser.coins.lifetime_earned.toLocaleString()}</span></div>
            {selectedUser.email && <div className="bg-gray-800/30 rounded-lg p-2"><span className="text-gray-500">Email: </span><span className="text-gray-300">{selectedUser.email}</span></div>}
          </div>
          {selectedUser.nfts.length > 0 && (
            <div><p className="text-xs font-bold text-gray-400 mb-2">NFTs ({selectedUser.nfts.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedUser.nfts.map((nft) => (
                  <div key={nft.id} className="bg-gray-800/50 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                    <span>{nft.product_emoji}</span><span className="text-gray-300">{nft.product_name}</span>
                    <span className={`px-1 rounded text-[10px] font-bold ${nft.rarity === "legendary" ? "text-amber-400 bg-amber-500/20" : nft.rarity === "rare" ? "text-purple-400 bg-purple-500/20" : "text-gray-400 bg-gray-700"}`}>{nft.rarity}</span>
                    <span className="text-gray-500">#{nft.edition_number}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedUser.purchases.length > 0 && (
            <div><p className="text-xs font-bold text-gray-400 mb-2">Purchases ({selectedUser.purchases.length})</p>
              <div className="flex flex-wrap gap-2">
                {selectedUser.purchases.map((p, i) => (
                  <div key={i} className="bg-gray-800/50 rounded-lg px-2 py-1 text-xs flex items-center gap-1">
                    <span>{p.product_emoji}</span><span className="text-gray-300">{p.product_name}</span><span className="text-green-400">{p.price_paid} GLITCH</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {selectedUser.interests.length > 0 && (
            <div><p className="text-xs font-bold text-gray-400 mb-2">Interests</p>
              <div className="flex flex-wrap gap-1">
                {selectedUser.interests.map((i) => (
                  <span key={i.interest_tag} className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded-full">#{i.interest_tag} ({i.weight.toFixed(1)})</span>
                ))}
              </div>
            </div>
          )}
          {editingUser && editingUser.id === selectedUser.id && (
            <div className="border border-amber-500/30 bg-amber-500/5 rounded-xl p-3 space-y-3">
              <p className="text-xs font-bold text-amber-400">Editing @{selectedUser.username}</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] text-gray-400 block mb-1">Display Name</label>
                  <input value={editingUser.display_name} onChange={(e) => setEditingUser({ ...editingUser, display_name: e.target.value })} className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-[10px] text-gray-400 block mb-1">Username</label>
                  <input value={editingUser.username} onChange={(e) => setEditingUser({ ...editingUser, username: e.target.value })} className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-[10px] text-gray-400 block mb-1">Avatar Emoji</label>
                  <input value={editingUser.avatar_emoji} onChange={(e) => setEditingUser({ ...editingUser, avatar_emoji: e.target.value })} className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" /></div>
                <div><label className="text-[10px] text-gray-400 block mb-1">Active</label>
                  <button onClick={() => setEditingUser({ ...editingUser, is_active: !editingUser.is_active })}
                    className={`px-3 py-1.5 rounded-lg text-sm font-bold ${editingUser.is_active ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}>{editingUser.is_active ? "Active" : "Disabled"}</button></div>
              </div>
              <div><label className="text-[10px] text-gray-400 block mb-1">Bio</label>
                <textarea value={editingUser.bio} onChange={(e) => setEditingUser({ ...editingUser, bio: e.target.value })} rows={2} className="w-full px-2 py-1.5 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-purple-500" /></div>
              <div className="flex gap-2">
                <button onClick={updateUser} disabled={userActionLoading} className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-sm font-bold hover:opacity-90 disabled:opacity-50">{userActionLoading ? "Saving..." : "Save Changes"}</button>
                <button onClick={() => setEditingUser(null)} className="px-4 py-2 bg-gray-800 text-gray-400 rounded-lg text-sm font-bold hover:bg-gray-700">Cancel</button>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-2">
            {!editingUser && (
              <button onClick={() => setEditingUser({ id: selectedUser.id, display_name: selectedUser.display_name, username: selectedUser.username, bio: selectedUser.bio || "", avatar_emoji: selectedUser.avatar_emoji, is_active: selectedUser.is_active })}
                className="px-3 py-1.5 bg-amber-500/20 text-amber-400 rounded-lg text-xs font-bold hover:bg-amber-500/30">Edit Profile</button>
            )}
            <button onClick={() => deleteUser(selectedUser.id, selectedUser.username)} className="px-3 py-1.5 bg-red-500/20 text-red-400 rounded-lg text-xs font-bold hover:bg-red-500/30">Delete User</button>
            <button onClick={() => { const names = prompt("Enter old usernames to merge (comma-separated):"); if (names) mergeAccounts(selectedUser.id, names.split(",").map(n => n.trim())); }}
              className="px-3 py-1.5 bg-blue-500/20 text-blue-400 rounded-lg text-xs font-bold hover:bg-blue-500/30">Merge Accounts</button>
          </div>
        </div>
      )}

      {/* User list */}
      {users.length === 0 ? (
        <div className="text-center py-12 text-gray-500"><div className="text-4xl mb-2">👻</div><p>No meat bags have signed up yet</p></div>
      ) : filteredRest.length === 0 && !architect ? (
        <div className="text-center py-12 text-gray-500"><div className="text-4xl mb-2">🔍</div><p>No matches for &ldquo;{userSearch}&rdquo;</p></div>
      ) : (
        <div className="space-y-4">
          {architect && segmentFilter === "all" && (
            <section className="border-2 border-amber-500/40 rounded-xl overflow-hidden bg-amber-500/5">
              <div className="px-3 py-2 sm:px-4 border-b border-amber-500/20">
                <h3 className="text-xs font-bold text-amber-300">
                  🕉️ The Architect
                  <span className="ml-2 text-amber-500/70 font-normal">(you)</span>
                </h3>
                <p className="text-[10px] text-amber-500/50 mt-0.5">
                  Your human account — separate from the meat bag crowd
                </p>
              </div>
              <div className="p-2">{renderUserCard(architect)}</div>
            </section>
          )}

          {segmentFilter === "all" ? (
            <div className="space-y-3">{SEGMENT_ORDER.map(renderSegmentBlock)}</div>
          ) : (
            <div className="space-y-2">
              {segmentedUsers[segmentFilter].map(renderUserCard)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
