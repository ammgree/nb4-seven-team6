import bcrypt from 'bcryptjs';
import { prisma } from '../config/db.js'; // 네 프로젝트의 Prisma 클라이언트 export (db.ts)

// 서비스 내부 상수: 배지 키
const BADGES = {
  TEN_PARTICIPANTS: 'TEN_PARTICIPANTS',
  HUNDRED_RECORDS: 'HUNDRED_RECORDS',
  HUNDRED_LIKES: 'HUNDRED_LIKES',
} as const;

// 추천(좋아요) 1 증가 → 배지 재평가
export async function recommendGroup(groupId: number) {
  // 원자적 증가(increment)는 동시성 안전
  const updated = await prisma.group.update({
    where: { id: groupId },
    data: { likeCount: { increment: 1 } },
    select: { id: true, likeCount: true },
  });

  await evaluateAndAwardBadges(groupId);
  return updated;
}

// 그룹 참여(닉네임 중복 방지, 비밀번호 해시)
export async function joinGroup(
  groupId: number,
  payload: { nickname: string; password: string }
) {
  const { nickname, password } = payload;
  if (!nickname || !password) {
    const err = new Error('nickname/password 필수');
    (err as any).status = 400;
    throw err;
  }

  const hash = await bcrypt.hash(password, 10);

  // 트랜잭션: 참가자 생성 → 배지 검사(참여자수 10명 조건)
  const created = await prisma.$transaction(async (tx) => {
    try {
      const participant = await tx.participant.create({
        data: { groupId, nickname, password: hash },
        select: { id: true, groupId: true, nickname: true, createdAt: true },
      });

      await evaluateAndAwardBadges(groupId, tx);
      return participant;
    } catch (e: any) {
      // (groupId, nickname) 유니크 충돌
      if (e.code === 'P2002') {
        const err = new Error('이미 사용 중인 닉네임입니다.');
        (err as any).status = 409;
        throw err;
      }
      throw e;
    }
  });

  return created;
}

// 그룹 탈퇴(비번 검증, 기록 동반 삭제)
export async function leaveGroup(
  groupId: number,
  payload: { nickname: string; password: string }
) {
  const { nickname, password } = payload;
  if (!nickname || !password) {
    const err = new Error('nickname/password 필수');
    (err as any).status = 400;
    throw err;
  }

  const user = await prisma.participant.findUnique({
    where: { groupId_nickname: { groupId, nickname } },
    select: { id: true, password: true },
  });
  if (!user) {
    const err = new Error('참여자 없음');
    (err as any).status = 404;
    throw err;
  }

  const ok = await bcrypt.compare(password, user.password);
  if (!ok) {
    const err = new Error('비밀번호 불일치');
    (err as any).status = 401;
    throw err;
  }

  // 기록 → 참가자 순으로 삭제(참조 무결성)
  await prisma.$transaction(async (tx) => {
    await tx.record.deleteMany({ where: { participantId: user.id } });
    await tx.participant.delete({ where: { id: user.id } });
    // 보통 획득 배지는 회수하지 않음(정책에 따라 다름)
  });

  return true;
}

/* ---------------------- */
/* 배지 평가/부여 공용함수 */
/* ---------------------- */

// tx가 주어지면 그 트랜잭션으로 실행(없으면 전역 prisma)
async function evaluateAndAwardBadges(groupId: number, tx = prisma) {
  // 한 번의 질의로 카운트/보유배지 스냅샷 확보 → ORM 최적화 포인트
  const snapshot = await tx.group.findUnique({
    where: { id: groupId },
    select: {
      id: true,
      likeCount: true,
      _count: { select: { participants: true, records: true } },
      badges: { select: { badge: { select: { name: true } } } },
    },
  });
  if (!snapshot) return;

  const owned = new Set(snapshot.badges.map((b) => b.badge.name));
  const toGive: string[] = [];

  if (snapshot._count.participants >= 10 && !owned.has(BADGES.TEN_PARTICIPANTS)) {
    toGive.push(BADGES.TEN_PARTICIPANTS);
  }
  if (snapshot._count.records >= 100 && !owned.has(BADGES.HUNDRED_RECORDS)) {
    toGive.push(BADGES.HUNDRED_RECORDS);
  }
  if (snapshot.likeCount >= 100 && !owned.has(BADGES.HUNDRED_LIKES)) {
    toGive.push(BADGES.HUNDRED_LIKES);
  }
  if (toGive.length === 0) return;

  // 배지 id 매핑 조회 후 조합키([groupId,badgeId])로 중복 부여 방지
  const badges = await tx.badge.findMany({
    where: { name: { in: toGive } },
    select: { id: true, name: true },
  });

  await Promise.all(
    badges.map((b) =>
      tx.badgeToGroup.create({
        data: { groupId, badgeId: b.id },
      })
    )
  );
}
