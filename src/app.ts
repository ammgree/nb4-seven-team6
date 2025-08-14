import express from 'express';
import groupRoutes from './routes/group.routes.js';
// ...기존 import들

const app = express();

app.use(express.json());
// ...기존 미들웨어

app.use('/groups', groupRoutes); // << 추가

// ...기존 에러 핸들러
export default app;
