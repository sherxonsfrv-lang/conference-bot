const express = require('express');
const router = express.Router();
const { Payment, Conference, User, SystemSettings } = require('../models/mysql');
const { authMiddleware } = require('../middleware/auth');

const CURRENCY = 'RUB';

/**
 * POST /payment/initiate
 */
router.post('/initiate', authMiddleware, async (req, res) => {
  const { conferenceCode } = req.body;

  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const conf = conferenceCode
      ? await Conference.findOne({ where: { conferenceCode: conferenceCode.toUpperCase() } })
      : null;

    // Check if user already has active paid access
    if (user.hasPaidAccess && user.paidAccessUntil > new Date()) {
      return res.json({ alreadyPaid: true, paidUntil: user.paidAccessUntil });
    }

    // Load price dynamically from SystemSettings
    const settings = await SystemSettings.findOne({ where: { id: 1 } });
    const priceRub = settings ? settings.tariffPrice : 249;
    const priceKopecks = priceRub * 100;

    // Placeholder response until provider is integrated:
    const mockOrder = await Payment.create({
      userId: user.id,
      conferenceId: conf?.id,
      amount: priceKopecks,
      currency: CURRENCY,
      providerOrderId: `MOCK-${Date.now()}`,
      providerPaymentUrl: `${process.env.PAYMENT_REDIRECT_URL || 'https://payment.example.com'}?demo=true`,
    });

    res.json({
      orderId: mockOrder.id,
      amount: priceKopecks,
      currency: CURRENCY,
      paymentUrl: mockOrder.providerPaymentUrl,
      note: 'Integrate your payment provider in routes/payment.js',
    });
  } catch (err) {
    console.error('Payment initiate error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /payment/callback
 */
router.post('/callback', async (req, res) => {
  const { orderId, status } = req.body;

  try {
    if (status === 'succeeded' || status === 'success') {
      const order = await Payment.findByPk(orderId, { include: [{ model: User, as: 'user' }] });
      if (!order) return res.status(404).json({ error: 'Order not found' });

      await order.update({
        status: 'succeeded',
        paidAt: new Date()
      });

      // Grant 365 days of paid access
      const paidUntil = new Date();
      paidUntil.setFullYear(paidUntil.getFullYear() + 1);

      await User.update(
        { hasPaidAccess: true, paidAccessUntil: paidUntil },
        { where: { id: order.userId } }
      );

      console.log(`✅ Payment succeeded for user ${order.user.telegramId}`);
    }

    res.json({ received: true });
  } catch (err) {
    console.error('Payment callback error:', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /payment/status
 */
router.get('/status', authMiddleware, async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      hasPaidAccess: user.hasPaidAccess,
      paidAccessUntil: user.paidAccessUntil,
      isActive: user.hasPaidAccess && user.paidAccessUntil > new Date(),
    });
  } catch (err) {
    res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
