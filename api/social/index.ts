import type { VercelRequest, VercelResponse } from '@vercel/node';
import { neon } from '@neondatabase/serverless';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  const sql = neon(process.env.DATABASE_URL!) as any;
  const route = req.query.route as string;

  // HTTP cache headers for read-heavy GET endpoints (served by Vercel CDN)
  if (req.method === 'GET') {
    if (route === 'profile') {
      res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=300');
    } else if (route === 'nameHistory') {
      res.setHeader('Cache-Control', 's-maxage=3600, stale-while-revalidate=86400');
    }
  }

  switch (route) {
    case 'notifications': return handleNotifications(req, res, sql);
    case 'subscriptions': return handleSubscriptions(req, res, sql);
    case 'comments': return handleComments(req, res, sql);
    case 'profile-comments': return handleProfileComments(req, res, sql);
    case 'profile': return handleProfile(req, res, sql);
    case 'nameHistory': return handleNameHistory(req, res, sql);
    case 'blocks': return handleBlocks(req, res, sql);
    default: return res.status(400).json({ error: 'Unknown route' });
  }
}

// ==================== COMMENTS ====================

async function handleComments(req: VercelRequest, res: VercelResponse, sql: any) {
  if (req.method === 'GET') {
    // Comments by user (for profile)
    const { userId: commentUserId } = req.query;
    if (commentUserId && typeof commentUserId === 'string') {
      const rows = await sql`SELECT c.id, c.clue_id, c.content, c.created_at, cl.word as clue_word
        FROM comments c LEFT JOIN clues cl ON c.clue_id = cl.id
        WHERE c.user_id = ${commentUserId} ORDER BY c.created_at DESC`;
      return res.json(rows.map((r: Record<string, unknown>) => ({
        id: Number(r.id), clueId: r.clue_id as string, clueWord: (r.clue_word as string) || '',
        content: r.content as string, createdAt: Number(r.created_at),
      })));
    }

    const { clueId } = req.query;
    if (!clueId || typeof clueId !== 'string') return res.status(400).json({ error: 'clueId required' });
    const rows = await sql`SELECT c.id, c.user_id, c.content, c.created_at, c.reply_to_id, u.display_name,
      rc.user_id as reply_user_id, ru.display_name as reply_display_name, rc.content as reply_content
      FROM comments c LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN comments rc ON c.reply_to_id = rc.id
      LEFT JOIN users ru ON rc.user_id = ru.id
      WHERE c.clue_id = ${clueId} ORDER BY c.created_at DESC`;
    return res.json(rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id), userId: r.user_id as string, displayName: (r.display_name as string) || (r.user_id as string),
      content: r.content as string, createdAt: Number(r.created_at),
      replyToId: r.reply_to_id ? Number(r.reply_to_id) : null,
      replyToDisplayName: (r.reply_display_name as string) || null,
      replyToContent: (r.reply_content as string) || null,
    })));
  }

  if (req.method === 'POST') {
    const { clueId, userId, content, replyToId } = req.body;
    if (!clueId || !userId || !content?.trim()) return res.status(400).json({ error: 'clueId, userId, content required' });
    const now = Date.now();
    const trimmed = content.trim();
    const replyId = replyToId ? Number(replyToId) : null;
    const rows = await sql`INSERT INTO comments (clue_id, user_id, content, created_at, reply_to_id) VALUES (${clueId}, ${userId}, ${trimmed}, ${now}, ${replyId}) RETURNING id`;
    // Notifications: notify clue author + mentioned users
    try {
      const clueInfo = await sql`SELECT user_id, word FROM clues WHERE id = ${clueId}`;
      const notifiedSet = new Set<string>();
      // Notify clue author about new comment
      if (clueInfo.length > 0 && clueInfo[0].user_id !== userId) {
        notifiedSet.add(clueInfo[0].user_id as string);
        await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, message, created_at)
          VALUES (${clueInfo[0].user_id}, 'new_comment', ${userId}, ${clueId}, ${clueInfo[0].word}, ${trimmed}, ${now})`;
      }
      // Notify author of the comment being replied to
      if (replyId) {
        const replyRows = await sql`SELECT user_id FROM comments WHERE id = ${replyId}`;
        if (replyRows.length > 0) {
          const replyAuthorId = replyRows[0].user_id as string;
          if (replyAuthorId !== userId && !notifiedSet.has(replyAuthorId)) {
            notifiedSet.add(replyAuthorId);
            await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, message, created_at)
              VALUES (${replyAuthorId}, 'reply', ${userId}, ${clueId}, ${clueInfo.length > 0 ? clueInfo[0].word : null}, ${trimmed}, ${now})`;
          }
        }
      }
      // Notify mentioned users (@[nickname] bracket format + legacy @nickname)
      const bracketMentions = trimmed.match(/@\[([^\]]+)\]/g);
      const legacyMentions = trimmed.replace(/@\[[^\]]+\]/g, '').match(/@([\wа-яА-ЯёЁ\-()]+)/g);
      const mentions = [...(bracketMentions || []), ...(legacyMentions || [])];
      if (mentions.length > 0) {
        const names = mentions.map((m: string) => m.startsWith('@[') ? m.slice(2, -1) : m.slice(1)).filter(Boolean);
        for (const name of names) {
          const userRows = await sql`SELECT id FROM users WHERE display_name = ${name}`;
          if (userRows.length > 0) {
            const mentionedId = userRows[0].id as string;
            if (mentionedId !== userId && !notifiedSet.has(mentionedId)) {
              notifiedSet.add(mentionedId);
              await sql`INSERT INTO notifications (user_id, type, actor_id, clue_id, clue_word, message, created_at)
                Values (${mentionedId}, 'mention', ${userId}, ${clueId}, ${clueInfo.length > 0 ? clueInfo[0].word : null}, ${trimmed}, ${now})`;
            }
          }
        }
      }
    } catch { /* notifications are best-effort */ }
    return res.json({ ok: true, id: Number(rows[0].id) });
  }

  if (req.method === 'DELETE') {
    const { id, adminId, userId } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    // Admin can delete any comment
    if (adminId && typeof adminId === 'string') {
      const adminRows = await sql`SELECT is_admin FROM users WHERE id = ${adminId}`;
      if (adminRows.length === 0 || !adminRows[0].is_admin) return res.status(403).json({ error: 'Not admin' });
      await sql`DELETE FROM comments WHERE id = ${Number(id)}`;
      return res.json({ ok: true });
    }
    // Author can delete own comment
    if (userId && typeof userId === 'string') {
      const result = await sql`DELETE FROM comments WHERE id = ${Number(id)} AND user_id = ${userId}`;
      if (result.length === 0 && (result as unknown as { count?: number }).count === 0) return res.status(403).json({ error: 'Not your comment' });
      return res.json({ ok: true });
    }
    return res.status(400).json({ error: 'adminId or userId required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== SUBSCRIPTIONS ====================

async function handleSubscriptions(req: VercelRequest, res: VercelResponse, sql: any) {
  if (req.method === 'GET') {
    const { userId, targetId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    if (targetId && typeof targetId === 'string') {
      const rows = await sql`SELECT id FROM subscriptions WHERE subscriber_id = ${userId} AND target_id = ${targetId}` as Record<string, unknown>[];
      return res.json({ subscribed: rows.length > 0 });
    }
    const rows = await sql`SELECT s.target_id, u.display_name FROM subscriptions s LEFT JOIN users u ON s.target_id = u.id WHERE s.subscriber_id = ${userId} ORDER BY s.created_at DESC`;
    return res.json(rows.map((r: Record<string, unknown>) => ({ targetId: r.target_id, displayName: (r.display_name as string) || r.target_id })));
  }

  if (req.method === 'POST') {
    const { subscriberId, targetId } = req.body;
    if (!subscriberId || !targetId) return res.status(400).json({ error: 'subscriberId and targetId required' });
    if (subscriberId === targetId) return res.status(400).json({ error: 'Cannot subscribe to yourself' });
    await sql`INSERT INTO subscriptions (subscriber_id, target_id, created_at) VALUES (${subscriberId}, ${targetId}, ${Date.now()}) ON CONFLICT (subscriber_id, target_id) DO NOTHING`;
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { subscriberId, targetId } = req.query;
    if (!subscriberId || !targetId) return res.status(400).json({ error: 'subscriberId and targetId required' });
    await sql`DELETE FROM subscriptions WHERE subscriber_id = ${subscriberId as string} AND target_id = ${targetId as string}`;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== NOTIFICATIONS ====================

async function handleNotifications(req: VercelRequest, res: VercelResponse, sql: any) {
  const mapRow = (r: Record<string, unknown>) => {
    const scoreInfo = r.score_info ? JSON.parse(r.score_info as string) : null;
    return {
      id: Number(r.id), type: r.type as string, actorId: r.actor_id as string,
      actorName: (r.actor_name as string) || (r.actor_id as string),
      clueId: r.clue_id as string, clueWord: r.clue_word as string,
      clueNumber: r.clue_number != null ? Number(r.clue_number) : null,
      scoreInfo, message: (r.message as string) || null,
      createdAt: Number(r.created_at), read: r.read as boolean,
    };
  };

  if (req.method === 'GET') {
    const { userId, all } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });

    // Full paginated fetch for notifications page
    if (all === 'true') {
      const offset = Number(req.query.offset) || 0;
      const limit = Math.min(Number(req.query.limit) || 50, 200);

      const [rows, countRows] = await Promise.all([
        sql`SELECT n.id, n.type, n.actor_id, n.clue_id, n.clue_word, n.score_info, n.message, n.created_at, n.read, u.display_name as actor_name, c.number as clue_number
          FROM notifications n LEFT JOIN users u ON n.actor_id = u.id LEFT JOIN clues c ON c.id = n.clue_id
          WHERE n.user_id = ${userId}
          ORDER BY n.created_at DESC LIMIT ${limit} OFFSET ${offset}`,
        sql`SELECT COUNT(*)::int as total FROM notifications n WHERE n.user_id = ${userId}`,
      ]) as [Record<string, unknown>[], Record<string, unknown>[]];

      return res.json({ notifications: rows.map(mapRow), total: Number(countRows[0]?.total) || 0 });
    }

    // Default: last 50 for bell dropdown
    const rows = await sql`SELECT n.id, n.type, n.actor_id, n.clue_id, n.clue_word, n.score_info, n.message, n.created_at, n.read, u.display_name as actor_name, c.number as clue_number
      FROM notifications n LEFT JOIN users u ON n.actor_id = u.id LEFT JOIN clues c ON c.id = n.clue_id
      WHERE n.user_id = ${userId} ORDER BY n.created_at DESC LIMIT 50` as Record<string, unknown>[];
    return res.json(rows.map(mapRow));
  }

  if (req.method === 'POST') {
    const { userId, action } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId required' });
    if (action === 'read_all') {
      await sql`UPDATE notifications SET read = true WHERE user_id = ${userId}`;
      return res.json({ ok: true });
    }
    if (action === 'read' && req.body.id) {
      await sql`UPDATE notifications SET read = true WHERE id = ${Number(req.body.id)} AND user_id = ${userId}`;
      return res.json({ ok: true });
    }
    if (action === 'clear_all') {
      await sql`DELETE FROM notifications WHERE user_id = ${userId}`;
      return res.json({ ok: true });
    }
    if (action === 'delete_selected') {
      const ids: number[] = req.body.ids;
      if (!Array.isArray(ids) || ids.length === 0) return res.status(400).json({ error: 'ids array required' });
      await sql`DELETE FROM notifications WHERE id = ANY(${ids}) AND user_id = ${userId}`;
      return res.json({ ok: true, deleted: ids.length });
    }
    return res.status(400).json({ error: 'Unknown action' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== PROFILE COMMENTS ====================

async function handleProfileComments(req: VercelRequest, res: VercelResponse, sql: any) {
  if (req.method === 'GET') {
    const { profileUserId } = req.query;
    if (!profileUserId || typeof profileUserId !== 'string') return res.status(400).json({ error: 'profileUserId required' });
    // Check if comments are disabled (graceful fallback if column doesn't exist yet)
    let commentsDisabled = false;
    try {
      const userRows = await sql`SELECT comments_disabled FROM users WHERE id = ${profileUserId}`;
      commentsDisabled = userRows.length > 0 && !!userRows[0].comments_disabled;
    } catch { /* column may not exist yet */ }
    const rows = await sql`SELECT pc.id, pc.author_id, pc.content, pc.created_at, pc.reply_to_id, u.display_name,
      rpc.author_id as reply_author_id, ru.display_name as reply_display_name, rpc.content as reply_content
      FROM profile_comments pc LEFT JOIN users u ON pc.author_id = u.id
      LEFT JOIN profile_comments rpc ON pc.reply_to_id = rpc.id
      LEFT JOIN users ru ON rpc.author_id = ru.id
      WHERE pc.profile_user_id = ${profileUserId} ORDER BY pc.created_at DESC`;
    return res.json({ commentsDisabled, comments: rows.map((r: Record<string, unknown>) => ({
      id: Number(r.id), authorId: r.author_id as string, displayName: (r.display_name as string) || (r.author_id as string),
      content: r.content as string, createdAt: Number(r.created_at),
      replyToId: r.reply_to_id ? Number(r.reply_to_id) : null,
      replyToDisplayName: (r.reply_display_name as string) || null,
      replyToContent: (r.reply_content as string) || null,
    })) });
  }

  if (req.method === 'POST') {
    const { profileUserId, authorId, content, replyToId, action } = req.body;
    // Toggle comments on/off
    if (action === 'toggle_comments') {
      const { userId, disabled } = req.body;
      if (!userId) return res.status(400).json({ error: 'userId required' });
      try {
        await sql`UPDATE users SET comments_disabled = ${!!disabled} WHERE id = ${userId}`;
      } catch {
        // Column may not exist — create it and retry
        await sql`ALTER TABLE users ADD COLUMN IF NOT EXISTS comments_disabled BOOLEAN DEFAULT false`;
        await sql`UPDATE users SET comments_disabled = ${!!disabled} WHERE id = ${userId}`;
      }
      return res.json({ ok: true });
    }
    if (!profileUserId || !authorId || !content?.trim()) return res.status(400).json({ error: 'profileUserId, authorId, content required' });
    // Check if comments are disabled (allow profile owner to still comment)
    if (profileUserId !== authorId) {
      try {
        const disabledRows = await sql`SELECT comments_disabled FROM users WHERE id = ${profileUserId}`;
        if (disabledRows.length > 0 && disabledRows[0].comments_disabled) {
          return res.status(403).json({ error: 'Comments disabled' });
        }
      } catch { /* column may not exist yet — allow comment */ }
    }
    const now = Date.now();
    const trimmed = content.trim();
    const replyId = replyToId ? Number(replyToId) : null;
    const rows = await sql`INSERT INTO profile_comments (profile_user_id, author_id, content, created_at, reply_to_id) VALUES (${profileUserId}, ${authorId}, ${trimmed}, ${now}, ${replyId}) RETURNING id`;
    // Notify profile owner + replied-to author
    try {
      const notifiedSet = new Set<string>();
      if (profileUserId !== authorId) {
        notifiedSet.add(profileUserId);
        await sql`INSERT INTO notifications (user_id, type, actor_id, message, created_at)
          VALUES (${profileUserId}, 'profile_comment', ${authorId}, ${trimmed}, ${now})`;
      }
      if (replyId) {
        const replyRows = await sql`SELECT author_id FROM profile_comments WHERE id = ${replyId}`;
        if (replyRows.length > 0) {
          const replyAuthorId = replyRows[0].author_id as string;
          if (replyAuthorId !== authorId && !notifiedSet.has(replyAuthorId)) {
            await sql`INSERT INTO notifications (user_id, type, actor_id, message, created_at)
              VALUES (${replyAuthorId}, 'reply', ${authorId}, ${trimmed}, ${now})`;
          }
        }
      }
    } catch { /* best-effort */ }
    return res.json({ ok: true, id: Number(rows[0].id) });
  }

  if (req.method === 'DELETE') {
    const { id, adminId, userId } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });
    // Admin can delete any
    if (adminId && typeof adminId === 'string') {
      const adminRows = await sql`SELECT is_admin FROM users WHERE id = ${adminId}`;
      if (adminRows.length === 0 || !adminRows[0].is_admin) return res.status(403).json({ error: 'Not admin' });
      await sql`DELETE FROM profile_comments WHERE id = ${Number(id)}`;
      return res.json({ ok: true });
    }
    // Author can delete own, or profile owner can delete any on their profile
    if (userId && typeof userId === 'string') {
      // Try delete own comment first
      const own = await sql`DELETE FROM profile_comments WHERE id = ${Number(id)} AND author_id = ${userId} RETURNING id`;
      if (own.length > 0) return res.json({ ok: true });
      // Try delete as profile owner
      const asOwner = await sql`DELETE FROM profile_comments WHERE id = ${Number(id)} AND profile_user_id = ${userId} RETURNING id`;
      if (asOwner.length > 0) return res.json({ ok: true });
      return res.status(403).json({ error: 'Not authorized' });
    }
    return res.status(400).json({ error: 'adminId or userId required' });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== PROFILE (bio, country) ====================

async function handleProfile(req: VercelRequest, res: VercelResponse, sql: any) {
  if (req.method === 'GET') {
    const { userId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const rows = await sql`SELECT display_name, avatar_url, bio, country FROM users WHERE id = ${userId}`;
    if (rows.length === 0) return res.status(404).json({ error: 'User not found' });
    const u = rows[0];
    return res.json({
      displayName: u.display_name,
      avatarUrl: u.avatar_url || null,
      bio: u.bio || '',
      country: u.country || '',
    });
  }

  if (req.method === 'PATCH') {
    const { userId, bio, country } = req.body || {};
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    const existing = await sql`SELECT id FROM users WHERE id = ${userId}`;
    if (existing.length === 0) return res.status(404).json({ error: 'User not found' });
    if (typeof bio === 'string') {
      const trimmedBio = bio.trim().slice(0, 200);
      await sql`UPDATE users SET bio = ${trimmedBio} WHERE id = ${userId}`;
    }
    if (typeof country === 'string') {
      await sql`UPDATE users SET country = ${country.trim().slice(0, 10)} WHERE id = ${userId}`;
    }
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// ==================== NAME HISTORY ====================

async function handleNameHistory(req: VercelRequest, res: VercelResponse, sql: any) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  const { userId } = req.query;
  if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
  const rows = await sql`SELECT old_name, changed_at FROM name_history WHERE user_id = ${userId} ORDER BY changed_at DESC LIMIT 50`;
  return res.json(rows.map((r: Record<string, unknown>) => ({
    oldName: r.old_name as string,
    changedAt: Number(r.changed_at),
  })));
}

// ==================== BLOCKS ====================

async function handleBlocks(req: VercelRequest, res: VercelResponse, sql: any) {
  if (req.method === 'GET') {
    const { userId, targetId } = req.query;
    if (!userId || typeof userId !== 'string') return res.status(400).json({ error: 'userId required' });
    if (targetId && typeof targetId === 'string') {
      // Check block direction
      const rows = await sql`SELECT blocker_id FROM blocked_users WHERE (blocker_id = ${userId} AND blocked_id = ${targetId}) OR (blocker_id = ${targetId} AND blocked_id = ${userId})` as Record<string, unknown>[];
      const blockedByMe = rows.some((r: Record<string, unknown>) => r.blocker_id === userId);
      const blockedByThem = rows.some((r: Record<string, unknown>) => r.blocker_id === targetId);
      return res.json({ blocked: rows.length > 0, blockedByMe, blockedByThem });
    }
    // List users blocked by this user
    const rows = await sql`SELECT b.blocked_id, u.display_name FROM blocked_users b LEFT JOIN users u ON b.blocked_id = u.id WHERE b.blocker_id = ${userId} ORDER BY b.created_at DESC`;
    return res.json(rows.map((r: Record<string, unknown>) => ({ blockedId: r.blocked_id, displayName: (r.display_name as string) || r.blocked_id })));
  }

  if (req.method === 'POST') {
    const { blockerId, blockedId } = req.body;
    if (!blockerId || !blockedId) return res.status(400).json({ error: 'blockerId and blockedId required' });
    if (blockerId === blockedId) return res.status(400).json({ error: 'Cannot block yourself' });
    await sql`INSERT INTO blocked_users (blocker_id, blocked_id, created_at) VALUES (${blockerId}, ${blockedId}, ${Date.now()}) ON CONFLICT (blocker_id, blocked_id) DO NOTHING`;
    return res.json({ ok: true });
  }

  if (req.method === 'DELETE') {
    const { blockerId, blockedId } = req.query;
    if (!blockerId || !blockedId) return res.status(400).json({ error: 'blockerId and blockedId required' });
    await sql`DELETE FROM blocked_users WHERE blocker_id = ${blockerId as string} AND blocked_id = ${blockedId as string}`;
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
