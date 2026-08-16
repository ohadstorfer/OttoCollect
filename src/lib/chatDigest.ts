// Daily chat→email digest body builder (spec §7.2 + PDF appendix).
// Pure and provider-agnostic: the send-chat-digest edge function feeds it the
// day's messages and mails the returned subject/text. English-only by design —
// the appendix specifies the copy verbatim.

export interface DigestMessage {
  senderUsername: string;
  content: string;
  referenceItemId: string | null;
  /** "{country} {denomination} ({year})" — present for marketplace messages. */
  itemDescription: string | null;
  createdAt: string;
}

export interface ChatDigest {
  subject: string;
  text: string;
}

const MAX_ENTRIES_PER_SECTION = 3;

interface Group {
  key: string;
  heading: (n: number) => string;
  contents: string[];
  senderUsername: string;
}

function groupMessages(
  messages: DigestMessage[],
  keyOf: (m: DigestMessage) => string,
  headingOf: (m: DigestMessage) => (n: number) => string
): Group[] {
  const groups = new Map<string, Group>();
  for (const m of messages) {
    const key = keyOf(m);
    let group = groups.get(key);
    if (!group) {
      group = { key, heading: headingOf(m), contents: [], senderUsername: m.senderUsername };
      groups.set(key, group);
    }
    group.contents.push(m.content);
  }
  return Array.from(groups.values());
}

function renderSection(
  title: string,
  groups: Group[],
  allMessages: DigestMessage[],
  overflowLine: (count: number, senders: string) => string
): string {
  const lines: string[] = [title, ''];
  const shown = groups.slice(0, MAX_ENTRIES_PER_SECTION);
  shown.forEach((group, i) => {
    lines.push(group.heading(i + 1));
    for (const content of group.contents) lines.push(content);
    lines.push('');
  });

  const hidden = groups.slice(MAX_ENTRIES_PER_SECTION);
  if (hidden.length > 0) {
    const hiddenKeys = new Set(hidden.map((g) => g.key));
    // (x) counts the remaining *messages*; the sender list is unique, in order.
    const hiddenCount = allMessages.reduce(
      (n, m) => n + (hiddenKeys.has(m.referenceItemId ? `${m.referenceItemId}|${m.senderUsername}` : m.senderUsername) ? 1 : 0),
      0
    );
    const senders = Array.from(new Set(hidden.map((g) => g.senderUsername))).join(', ');
    lines.push(overflowLine(hiddenCount, senders));
    lines.push('');
  }
  return lines.join('\n');
}

/** Returns null when there is nothing to send (digest days require ≥1 message). */
export function buildChatDigest(username: string, messages: DigestMessage[]): ChatDigest | null {
  if (messages.length === 0) return null;

  const sorted = [...messages].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
  const marketplace = sorted.filter((m) => m.referenceItemId);
  const direct = sorted.filter((m) => !m.referenceItemId);

  const parts: string[] = [
    'Your OttoCollect Chat report',
    '',
    `Dear ${username},`,
    '',
    'Here is a summary of all chat messages sent to you today.',
    'Do not reply to this email. Please respond through your OttoCollect account chat!',
    '',
  ];

  if (marketplace.length > 0) {
    const groups = groupMessages(
      marketplace,
      (m) => `${m.referenceItemId}|${m.senderUsername}`,
      (m) => (n) => `${n}) Item: ${m.itemDescription ?? 'Marketplace item'} - from ${m.senderUsername}`
    );
    parts.push(
      renderSection(
        'Marketplace Item Chat Messages',
        groups,
        marketplace,
        (count, senders) =>
          `${MAX_ENTRIES_PER_SECTION + 1}) Additional Marketplace Messages - You have (${count}) additional Marketplace messages from the following users: ${senders}`
      )
    );
  }

  if (direct.length > 0) {
    const groups = groupMessages(
      direct,
      (m) => m.senderUsername,
      (m) => (n) => `${n}) From ${m.senderUsername}`
    );
    parts.push(
      renderSection(
        'Your OttoCollect Direct Chat Messages:',
        groups,
        direct,
        (count, senders) =>
          `${MAX_ENTRIES_PER_SECTION + 1}) Additional OttoCollect Direct Chat Messages - You have (${count}) additional messages from the following users: ${senders}`
      )
    );
  }

  return {
    subject: 'Your OttoCollect Chat report – Do not reply',
    text: parts.join('\n'),
  };
}
