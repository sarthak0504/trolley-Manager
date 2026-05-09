import { Router } from 'express';
import { execute } from '../pipeline/pipeline';
import { authMiddleware, AuthRequest } from '../pipeline/middleware/auth.middleware';
import {
  validateCreateClient,
  validateUpdateClient,
  validateEditRentCycle,
} from '../pipeline/validators/client.validator';
import { clientService } from '../services/client.service';

const router = Router();

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const result = await execute({
      validate: () => validateCreateClient(req.body),
      run: () => clientService.addClient(userId, req.body),
    });
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.put('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    await execute({
      validate: () => validateUpdateClient(req.body),
      run: () => clientService.updateClient(userId, req.params.id, req.body),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    await execute({
      run: () => clientService.deleteClient(userId, req.params.id),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/sync-rent', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    await execute({
      run: () => clientService.syncClientRent(userId, req.params.id),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.post('/:id/rent-history', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { trolleyNo, cycleDateStr, newRentAmount } = req.body;
    await execute({
      validate: () => validateEditRentCycle(req.body),
      run: () =>
        clientService.editRentHistoryForCycle(
          userId,
          req.params.id,
          trolleyNo,
          cycleDateStr,
          Number(newRentAmount),
        ),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
