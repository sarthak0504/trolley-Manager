import { Router } from 'express';
import { execute } from '../pipeline/pipeline';
import { authMiddleware, AuthRequest } from '../pipeline/middleware/auth.middleware';
import {
  validateCreateTrolley,
  validateAssignTrolley,
  validateMarkReturned,
} from '../pipeline/validators/trolley.validator';
import { trolleyService } from '../services/trolley.service';

const router = Router();

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const result = await execute({
      validate: () => validateCreateTrolley(req.body),
      run: () => trolleyService.addTrolley(userId, req.body.id),
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/toggle', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    await execute({
      run: () => trolleyService.toggleAvailability(userId, req.params.id),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/assign', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { clientId, clientName } = req.body;
    await execute({
      validate: () => validateAssignTrolley(req.body),
      run: () => trolleyService.assignTrolley(userId, req.params.id, clientId, clientName),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/:id/return', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { toDate, adjustedPayment } = req.body;
    await execute({
      validate: () => validateMarkReturned(req.body),
      run: () => trolleyService.markReturned(userId, req.params.id, toDate, adjustedPayment),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.patch('/history/:clientId', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { newName, newStartDate } = req.body;
    await execute({
      run: () =>
        trolleyService.updateTrolleyHistoryForClient(
          userId,
          req.params.clientId,
          newName,
          newStartDate,
        ),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
