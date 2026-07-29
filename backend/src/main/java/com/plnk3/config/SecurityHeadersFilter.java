package com.plnk3.config;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

/**
 * Filter untuk menambahkan security headers pada setiap HTTP response.
 * Mencegah clickjacking, MIME sniffing, dan meng-enforce best practices.
 */
@Component
@Order(Ordered.HIGHEST_PRECEDENCE)
public class SecurityHeadersFilter extends OncePerRequestFilter {

    @Override
    protected void doFilterInternal(HttpServletRequest request,
                                     HttpServletResponse response,
                                     FilterChain filterChain) throws ServletException, IOException {

        // Cegah clickjacking — halaman tidak boleh di-embed dalam iframe
        response.setHeader("X-Frame-Options", "DENY");

        // Cegah MIME sniffing — browser harus menghormati Content-Type yang dikirim server
        response.setHeader("X-Content-Type-Options", "nosniff");

        // Kontrol informasi referrer yang dikirim saat navigasi ke halaman lain
        response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

        // Batasi akses ke fitur browser yang tidak diperlukan
        response.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");

        // Cache control untuk API responses — jangan cache data sensitif
        if (request.getRequestURI().startsWith("/api/")) {
            response.setHeader("Cache-Control", "no-store, no-cache, must-revalidate");
            response.setHeader("Pragma", "no-cache");
        }

        filterChain.doFilter(request, response);
    }
}
