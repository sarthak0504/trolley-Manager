import { Router } from 'express';
import { execute } from '../pipeline/pipeline';
import { authMiddleware, AuthRequest } from '../pipeline/middleware/auth.middleware';
import { validateExpense } from '../pipeline/validators/expense.validator';
import { expenseService } from '../services/expense.service';

const router = Router();

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const result = await execute({
      validate: () => validateExpense(req.body),
      run: () => expenseService.addExpense(userId, req.body),
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
      validate: () => validateExpense(req.body),
      run: () => expenseService.updateExpense(userId, req.params.id, req.body),
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
      run: () => expenseService.deleteExpense(userId, req.params.id),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
