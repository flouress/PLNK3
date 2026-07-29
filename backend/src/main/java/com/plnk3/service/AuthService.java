package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.LoginResponse;
import org.mindrot.jbcrypt.BCrypt;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

@Service
public class AuthService {

    private static final Logger log = LoggerFactory.getLogger(AuthService.class);

    private final Sheets sheetsService;
    private final String spreadsheetId;

    // Cache mechanism untuk mencegah DoS / Rate Limit
    private List<List<Object>> cachedAccounts;
    private long lastCacheTime = 0;
    private static final long CACHE_TTL_MS = 60 * 60 * 1000; // 1 jam

    public AuthService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    private synchronized List<List<Object>> getAccounts() throws IOException {
        long now = System.currentTimeMillis();
        // Return cache jika belum expired
        if (cachedAccounts != null && (now - lastCacheTime) < CACHE_TTL_MS) {
            return cachedAccounts;
        }

        // Jika expired atau null, fetch dari Google Sheets
        String range = "Akun!A:B";
        cachedAccounts = sheetsService.spreadsheets().values()
                .get(spreadsheetId, range)
                .execute()
                .getValues();
        lastCacheTime = now;
        
        return cachedAccounts;
    }

    /**
     * Validasi login dengan mencocokkan username & password.
     * Password WAJIB disimpan dalam format BCrypt hash di Google Sheets.
     * Plaintext fallback sudah dihapus demi keamanan.
     */
    public LoginResponse authenticate(String username, String password) {
        try {
            // Validasi input dasar
            if (username == null || username.trim().isEmpty() ||
                password == null || password.isEmpty()) {
                return LoginResponse.failure("Username dan password wajib diisi");
            }

            List<List<Object>> values = getAccounts();

            if (values == null || values.isEmpty()) {
                log.warn("Akun data kosong atau tidak ditemukan di spreadsheet");
                return LoginResponse.failure("Data akun tidak ditemukan");
            }

            String trimmedUsername = username.trim();

            // Skip header row (row pertama), cocokkan username & password
            for (int i = 1; i < values.size(); i++) {
                List<Object> row = values.get(i);
                if (row.size() >= 2) {
                    String sheetUsername = row.get(0).toString().trim();
                    String sheetPassword = row.get(1).toString().trim();

                    // Case-sensitive username matching untuk keamanan
                    if (sheetUsername.equals(trimmedUsername)) {
                        boolean passwordMatch = false;
                        
                        try {
                            // Hanya terima password dalam format BCrypt hash
                            if (sheetPassword.startsWith("$2a$") ||
                                sheetPassword.startsWith("$2b$") ||
                                sheetPassword.startsWith("$2y$")) {
                                passwordMatch = BCrypt.checkpw(password, sheetPassword);
                            } else {
                                // Password belum di-hash — TOLAK login, log peringatan
                                log.error("SECURITY: Akun '{}' memiliki password PLAINTEXT di spreadsheet! "
                                        + "Hash password tersebut dengan BCrypt segera.", sheetUsername);
                                return LoginResponse.failure("Akun tidak dapat digunakan. Hubungi administrator.");
                            }
                        } catch (Exception e) {
                            log.error("Error saat verifikasi password untuk user '{}'", sheetUsername, e);
                            passwordMatch = false;
                        }

                        if (passwordMatch) {
                            log.info("Login berhasil untuk user: {}", sheetUsername);
                            return LoginResponse.success(sheetUsername, null);
                        } else {
                            log.warn("Login gagal — password salah untuk user: {}", sheetUsername);
                        }
                    }
                }
            }

            log.warn("Login gagal — username tidak ditemukan: {}", trimmedUsername);
            return LoginResponse.failure("Username atau password salah");

        } catch (IOException e) {
            log.error("Gagal mengakses Google Sheets untuk autentikasi", e);
            return LoginResponse.failure("Gagal mengakses data. Silakan coba lagi.");
        }
    }
}

