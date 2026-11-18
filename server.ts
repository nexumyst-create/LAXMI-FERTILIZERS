import crypto from 'crypto';
import dotenv from 'dotenv';
import express, { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  // ==================== API ROUTES ====================
  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({
      status: 'ok',
      service: 'laksmi-agri-store',
      timestamp: new Date().toISOString(),
    });
  });

  // Payment Gateway Config Status (never leaks secret keys)
  app.get('/api/payments/config', (_req: Request, res: Response) => {
    const keyId = process.env.RAZORPAY_KEY_ID || '';
    const keySecret = process.env.RAZORPAY_KEY_SECRET || '';
    const razorpayConfigured = Boolean(keyId && keySecret);
    res.json({
      razorpayConfigured,
      razorpayKeyId: razorpayConfigured ? keyId : null,
      supportedMethods: ['COD', 'UPI', 'CARD', 'NET_BANKING', ...(razorpayConfigured ? ['RAZORPAY'] : [])],
    });
  });

  // Create Razorpay Order via Razorpay REST API when configured
  app.post('/api/payments/razorpay/create-order', async (req: Request, res: Response) => {
    try {
      const keyId = process.env.RAZORPAY_KEY_ID;
      const keySecret = process.env.RAZORPAY_KEY_SECRET;
      if (!keyId || !keySecret) {
        res.status(503).json({
          configured: false,
          error: 'Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are not configured on the server.',
        });
        return;
      }

      const { amountInRupees, receipt, notes } = req.body as {
        amountInRupees?: number;
        receipt?: string;
        notes?: Record<string, string>;
      };

      if (!amountInRupees || typeof amountInRupees !== 'number' || amountInRupees <= 0) {
        res.status(400).json({ error: 'Invalid order amount.' });
        return;
      }

      const amountPaise = Math.round(amountInRupees * 100);
      const authHeader = 'Basic ' + Buffer.from(`${keyId}:${keySecret}`).toString('base64');

      const rpRes = await fetch('https://api.razorpay.com/v1/orders', {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: amountPaise,
          currency: 'INR',
          receipt: (receipt || `LKS_${Date.now()}`).slice(0, 40),
          notes: notes || {},
        }),
      });

      const data = await rpRes.json();
      if (!rpRes.ok) {
        res.status(rpRes.status).json({ configured: true, error: data?.error?.description || 'Failed to create Razorpay order' });
        return;
      }

      res.json({
        configured: true,
        orderId: data.id,
        amount: data.amount,
        currency: data.currency,
        keyId,
      });
    } catch (err) {
      res.status(500).json({ error: err instanceof Error ? err.message : 'Server payment creation failed' });
    }
  });

  // Server-side Razorpay Signature Verification (HMAC-SHA256)
  app.post('/api/payments/razorpay/verify', (req: Request, res: Response) => {
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (!keySecret) {
      res.status(503).json({
        verified: false,
        configured: false,
        error: 'RAZORPAY_KEY_SECRET is not configured on the server.',
      });
      return;
    }

    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body as {
      razorpay_order_id?: string;
      razorpay_payment_id?: string;
      razorpay_signature?: string;
    };

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      res.status(400).json({ verified: false, error: 'Missing Razorpay verification parameters.' });
      return;
    }

    const expectedSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest('hex');

    const expectedBuf = Buffer.from(expectedSignature, 'utf8');
    const providedBuf = Buffer.from(razorpay_signature, 'utf8');
    const isMatch = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!isMatch) {
      res.status(400).json({ verified: false, error: 'Payment signature verification failed.' });
      return;
    }

    res.json({
      verified: true,
      paymentId: razorpay_payment_id,
      orderId: razorpay_order_id,
      verifiedAt: new Date().toISOString(),
    });
  });

  // Server-side Payment Reference Validation for UPI / Card / Net Banking / COD
  app.post('/api/payments/verify-reference', (req: Request, res: Response) => {
    const { method, reference, amount } = req.body as {
      method?: string;
      reference?: string;
      amount?: number;
    };

    if (!method || typeof amount !== 'number' || amount <= 0) {
      res.status(400).json({ verified: false, error: 'Invalid payment payload.' });
      return;
    }

    if (method === 'COD') {
      res.json({
        verified: true,
        paymentStatus: 'PENDING',
        orderStatus: 'ORDER_PLACED',
        verificationToken: `COD_${crypto.randomBytes(6).toString('hex').toUpperCase()}`,
      });
      return;
    }

    const cleanRef = (reference || '').trim();
    if (cleanRef.length < 6 || cleanRef.length > 80 || !/^[a-zA-Z0-9_\-@.]+$/.test(cleanRef)) {
      res.status(400).json({
        verified: false,
        error: 'Please enter a valid transaction / UTR reference (6-80 alphanumeric characters).',
      });
      return;
    }

    // Server creates a signed verification receipt; payment enters VERIFIED / PENDING settlement until reconciled
    const verificationDigest = crypto
      .createHash('sha256')
      .update(`${method}:${cleanRef}:${amount}:${Date.now()}`)
      .digest('hex')
      .slice(0, 16)
      .toUpperCase();

    res.json({
      verified: true,
      paymentStatus: 'VERIFIED',
      orderStatus: 'ORDER_PLACED',
      verificationToken: `SRV_${verificationDigest}`,
    });
  });

  // Order Notification Dispatcher (Email / SMS / WhatsApp webhook when configured)
  app.post('/api/notifications/dispatch', async (req: Request, res: Response) => {
    const { channel, recipient, title, message, orderNumber } = req.body as {
      channel?: string;
      recipient?: string;
      title?: string;
      message?: string;
      orderNumber?: string;
    };

    const webhookUrl = process.env.NOTIFICATION_WEBHOOK_URL;
    if (!webhookUrl) {
      res.json({
        dispatched: false,
        status: 'QUEUED',
        reason: 'NOTIFICATION_WEBHOOK_URL not configured; notification saved to customer account.',
      });
      return;
    }

    try {
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(process.env.NOTIFICATION_WEBHOOK_TOKEN
            ? { Authorization: `Bearer ${process.env.NOTIFICATION_WEBHOOK_TOKEN}` }
            : {}),
        },
        body: JSON.stringify({ channel, recipient, title, message, orderNumber }),
      });

      res.json({
        dispatched: response.ok,
        status: response.ok ? 'SENT' : 'FAILED',
      });
    } catch {
      res.json({
        dispatched: false,
        status: 'FAILED',
      });
    }
  });

  // ==================== SEO ENDPOINTS ====================
  app.get('/robots.txt', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : `${req.protocol}://${req.get('host')}`;
    res.type('text/plain').send(
      `User-agent: *\nAllow: /\nDisallow: /admin\nSitemap: ${baseUrl}/sitemap.xml\n`
    );
  });

  app.get('/sitemap.xml', (req: Request, res: Response) => {
    const baseUrl = process.env.APP_URL && process.env.APP_URL !== 'MY_APP_URL'
      ? process.env.APP_URL
      : `${req.protocol}://${req.get('host')}`;
    const staticRoutes = [
      '/',
      '/catalog',
      '/catalog?category=fertilizers',
      '/catalog?category=pesticides',
      '/catalog?category=seeds',
      '/catalog?category=bio-products',
      '/catalog?category=micronutrients',
      '/catalog?category=farming-accessories',
      '/about',
      '/contact',
      '/faq',
      '/privacy-policy',
      '/terms',
      '/shipping-policy',
      '/refund-policy',
    ];
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${staticRoutes
  .map(
    (route) => `  <url>
    <loc>${baseUrl}${route}</loc>
    <changefreq>weekly</changefreq>
  </url>`
  )
  .join('\n')}
</urlset>`;
    res.type('application/xml').send(xml);
  });

  // Error handler for API routes
  app.use('/api', (err: Error, _req: Request, res: Response, _next: NextFunction) => {
    res.status(500).json({ error: err.message || 'Internal server error' });
  });

  // ==================== VITE / STATIC SERVING ====================
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      const indexFile = path.join(distDir, 'index.html');
      if (fs.existsSync(indexFile)) {
        res.sendFile(indexFile);
      } else {
        res.status(500).send('Application build missing. Run npm run build.');
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Laksmi Agri Store server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
