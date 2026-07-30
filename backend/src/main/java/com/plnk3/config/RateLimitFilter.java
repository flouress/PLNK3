package com.plnk3.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;

/**
 * Rate limiter untuk endpoint login — mencegah brute-force attack.
 * Menggunakan sliding window counter per IP address.
 * 
 * Limit: MAX_ATTEMPTS login attempts per WINDOW_MS dari IP yang sama.
 * Setelah limit tercapai, request ditolak dengan HTTP 429.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE + 1)
public class RateLimitFilter extends OncePerRequestFilter {

    private static final Logger log = LoggerFactory.getLogger(RateLimitFilter.class);

    private static final int MAX_ATTEMPTS = 10;              // Max 5 attempts
    private static final long WINDOW_MS = 15 * 60 * 1000;   // Per 15 menit

    // Menyimpan jumlah attempt per IP
    private final Map<String, RateLimitEntry> attemptMap = new ConcurrentHashMap<>();

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        // Hanya rate-limit endpoint login POST
        if (!"/api/auth/login".equals(request.getRequestURI()) ||
            !"POST".equalsIgnoreCase(request.getMethod())) {
            filterChain.doFilter(request, response);
            return;
        }

        String clientIp = getClientIp(request);

        // Bersihkan entry yang sudah expired
        cleanupExpired();

        RateLimitEntry entry = attemptMap.computeIfAbsent(clientIp, k -> new RateLimitEntry());

        // Reset window jika sudah expired
        long now = System.currentTimeMillis();
        if (now - entry.windowStart > WINDOW_MS) {
            entry.reset(now);
        }

        if (entry.count.incrementAndGet() > MAX_ATTEMPTS) {
            long retryAfterSecs = (WINDOW_MS - (now - entry.windowStart)) / 1000;
            log.warn("RATE LIMIT: IP {} telah melebihi {} login attempts dalam 15 menit",
                    clientIp, MAX_ATTEMPTS);

            response.setStatus(429); // Too Many Requests
            response.setContentType("application/json");
            response.setHeader("Retry-After", String.valueOf(retryAfterSecs));
            response.getWriter().write(
                    "{\"error\": \"Terlalu banyak percobaan login. Coba lagi dalam "
                    + retryAfterSecs + " detik.\"}");
            return;
        }

        filterChain.doFilter(request, response);
    }

    /**
     * Mendapatkan IP asli client, mempertimbangkan proxy headers.
     */
    private String getClientIp(HttpServletRequest request) {
        String xForwardedFor = request.getHeader("X-Forwarded-For");
        if (xForwardedFor != null && !xForwardedFor.isEmpty()) {
            // Ambil IP pertama (client asli) dari header X-Forwarded-For
            return xForwardedFor.split(",")[0].trim();
        }
        return request.getRemoteAddr();
    }

    /**
     * Bersihkan entry yang sudah melewati window time.
     */
    private void cleanupExpired() {
        long now = System.currentTimeMillis();
        attemptMap.entrySet().removeIf(e -> (now - e.getValue().windowStart) > WINDOW_MS);
    }

    /**
     * Entry internal untuk menyimpan state rate limit per IP.
     */
    private static class RateLimitEntry {
        volatile long windowStart = System.currentTimeMillis();
        final AtomicInteger count = new AtomicInteger(0);

        void reset(long now) {
            windowStart = now;
            count.set(0);
        }
    }
}
