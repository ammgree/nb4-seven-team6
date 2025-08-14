import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 기본 배지 3종 업서트
  await prisma.badge.upsert({
    where: { name: 'TEN_PARTICIPANTS' },
    update: {},
    create: { name: 'TEN_PARTICIPANTS', label: '참여자 10명 달성' },
  });
  await prisma.badge.upsert({
    where: { name: 'HUNDRED_RECORDS' },
    update: {},
    create: { name: 'HUNDRED_RECORDS', label: '운동 기록 100개 달성' },
  });
  await prisma.badge.upsert({
    where: { name: 'HUNDRED_LIKES' },
    update: {},
    create: { name: 'HUNDRED_LIKES', label: '추천수 100회 달성' },
  });
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
