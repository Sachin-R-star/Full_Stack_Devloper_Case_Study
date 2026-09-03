import rateLimit from 'express-rate-limit';

// Rate Limiter for Login Endpoint — Protects against brute-force password guessing
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // Limit each IP to 10 login requests per windowMs
  standardHeaders: true, // Return rate limit info in `RateLimit-*` headers
  legacyHeaders: false, // Disable `X-RateLimit-*` headers
  message: {
    status: 429,
    message: 'Too many login attempts from this IP address. Please try again after 15 minutes.',
  },
});

// Rate Limiter for Public Registration Endpoint — Prevents spam organization creation
export const registerRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // Limit each IP to 5 organization registrations per hour
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Registration rate limit exceeded. Maximum 5 account creations per hour per IP address.',
  },
});

// General API Rate Limiter — Prevents denial of service and aggressive scraping
export const apiRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300, // Limit each IP to 300 requests per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    status: 429,
    message: 'Too many API requests from this IP. Rate limit exceeded.',
  },
});
