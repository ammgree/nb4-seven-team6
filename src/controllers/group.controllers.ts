import { Request, Response, NextFunction } from 'express';
import * as groupService from '../services/group.service.js';

// 추천(좋아요) 1 증가
export async function recommendGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = Number(req.params.groupId);
    const result = await groupService.recommendGroup(groupId);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

// 그룹 참여
export async function joinGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = Number(req.params.groupId);
    const { nickname, password } = req.body;
    const created = await groupService.joinGroup(groupId, { nickname, password });
    res.status(201).json(created);
  } catch (err) {
    next(err);
  }
}

// 그룹 탈퇴
export async function leaveGroup(req: Request, res: Response, next: NextFunction) {
  try {
    const groupId = Number(req.params.groupId);
    const { nickname, password } = req.body;
    const ok = await groupService.leaveGroup(groupId, { nickname, password });
    res.json({ left: ok });
  } catch (err) {
    next(err);
  }
}
