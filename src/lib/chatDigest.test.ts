import { describe, expect, it } from 'vitest';
import { buildChatDigest, DigestMessage } from './chatDigest';

const mk = (over: Partial<DigestMessage>): DigestMessage => ({
  senderUsername: 'sender',
  content: 'hello',
  referenceItemId: null,
  itemDescription: null,
  createdAt: '2026-08-16T10:00:00Z',
  ...over,
});

describe('buildChatDigest', () => {
  it('returns null when there are no messages', () => {
    expect(buildChatDigest('collector1', [])).toBeNull();
  });

  it('uses the appendix subject verbatim', () => {
    const digest = buildChatDigest('collector1', [mk({})]);
    expect(digest!.subject).toBe('Your OttoCollect Chat report – Do not reply');
  });

  it('greets the user and includes the do-not-reply line', () => {
    const digest = buildChatDigest('collector1', [mk({})]);
    expect(digest!.text).toContain('Dear collector1,');
    expect(digest!.text).toContain(
      'Do not reply to this email. Please respond through your OttoCollect account chat!'
    );
  });

  it('omits the marketplace section when only direct messages exist', () => {
    const digest = buildChatDigest('u', [mk({ senderUsername: 'alice' })]);
    expect(digest!.text).not.toContain('Marketplace Item Chat Messages');
    expect(digest!.text).toContain('Your OttoCollect Direct Chat Messages:');
    expect(digest!.text).toContain('1) From alice');
  });

  it('omits the direct section when only marketplace messages exist', () => {
    const digest = buildChatDigest('u', [
      mk({ referenceItemId: 'i1', itemDescription: 'Ottoman Empire 5 Livres (1915)', senderUsername: 'bob' }),
    ]);
    expect(digest!.text).toContain('Marketplace Item Chat Messages');
    expect(digest!.text).toContain('1) Item: Ottoman Empire 5 Livres (1915) - from bob');
    expect(digest!.text).not.toContain('Your OttoCollect Direct Chat Messages:');
  });

  it('groups multiple messages from the same sender for the same item, in order', () => {
    const digest = buildChatDigest('u', [
      mk({ referenceItemId: 'i1', itemDescription: 'Item A', senderUsername: 'bob', content: 'first', createdAt: '2026-08-16T09:00:00Z' }),
      mk({ referenceItemId: 'i1', itemDescription: 'Item A', senderUsername: 'bob', content: 'second', createdAt: '2026-08-16T10:00:00Z' }),
    ]);
    const text = digest!.text;
    expect(text).toContain('1) Item: Item A - from bob');
    expect(text.indexOf('first')).toBeGreaterThan(-1);
    expect(text.indexOf('first')).toBeLessThan(text.indexOf('second'));
    // one group, not two entries
    expect(text).not.toContain('2) Item:');
  });

  it('caps each section at 3 entries with an overflow line naming remaining senders and count', () => {
    const messages = [
      mk({ referenceItemId: 'i1', itemDescription: 'A', senderUsername: 's1' }),
      mk({ referenceItemId: 'i2', itemDescription: 'B', senderUsername: 's2' }),
      mk({ referenceItemId: 'i3', itemDescription: 'C', senderUsername: 's3' }),
      mk({ referenceItemId: 'i4', itemDescription: 'D', senderUsername: 's4' }),
      mk({ referenceItemId: 'i5', itemDescription: 'E', senderUsername: 's5' }),
    ];
    const text = buildChatDigest('u', messages)!.text;
    expect(text).toContain('3) Item: C - from s3');
    expect(text).not.toContain('Item: D');
    expect(text).toContain(
      '4) Additional Marketplace Messages - You have (2) additional Marketplace messages from the following users: s4, s5'
    );
  });

  it('caps the direct section the same way', () => {
    const messages = ['a', 'b', 'c', 'd'].map((name, i) =>
      mk({ senderUsername: name, content: `msg-${i}` })
    );
    const text = buildChatDigest('u', messages)!.text;
    expect(text).toContain('3) From c');
    expect(text).toContain(
      '4) Additional OttoCollect Direct Chat Messages - You have (1) additional messages from the following users: d'
    );
  });

  it('handles both sections at once', () => {
    const text = buildChatDigest('u', [
      mk({ referenceItemId: 'i1', itemDescription: 'A', senderUsername: 'mkt' }),
      mk({ senderUsername: 'direct' }),
    ])!.text;
    expect(text.indexOf('Marketplace Item Chat Messages')).toBeLessThan(
      text.indexOf('Your OttoCollect Direct Chat Messages:')
    );
  });
});
