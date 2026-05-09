import { Router } from 'express';
import { execute } from '../pipeline/pipeline';
import { authMiddleware, AuthRequest } from '../pipeline/middleware/auth.middleware';
import { validatePayment } from '../pipeline/validators/payment.validator';
import { paymentService } from '../services/payment.service';

const router = Router({ mergeParams: true });

router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    await execute({
      validate: () => validatePayment(req.body),
      run: () => paymentService.addPayment(userId, req.params.clientId, req.body),
    });
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.put('/:paymentId', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { oldAmount, ...newData } = req.body;
    await execute({
      validate: () => validatePayment(newData),
      run: () =>
        paymentService.updatePayment(
          userId,
          req.params.clientId,
          req.params.paymentId,
          newData,
          oldAmount,
        ),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

router.delete('/:paymentId', authMiddleware, async (req, res, next) => {
  try {
    const userId = (req as AuthRequest).userId;
    const { amount } = req.body;
    await execute({
      run: () =>
        paymentService.deletePayment(
          userId,
          req.params.clientId,
          req.params.paymentId,
          Number(amount),
        ),
    });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
});

export default router;
