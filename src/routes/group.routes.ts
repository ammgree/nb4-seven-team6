import { Router } from 'express';
import { recommendGroup, joinGroup, leaveGroup } from '../controllers/group.controllers.js';

// 필요시 여기서 전용 미들웨어(레이트리밋 등)도 붙일 수 있음
const router = Router();

router.post('/:groupId/recommend', recommendGroup); // 추천 1 증가
router.post('/:groupId/join',       joinGroup);      // 참여
router.post('/:groupId/leave',      leaveGroup);     // 탈퇴

export default router;
