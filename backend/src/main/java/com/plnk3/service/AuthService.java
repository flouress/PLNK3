package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.LoginResponse;
import org.mindrot.jbcrypt.BCrypt;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

@Service
public class AuthService {

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
     * Validasi login dengan mencocokkan username & password
     * Password diverifikasi menggunakan BCrypt. (Terdapat fallback plaintext sementara)
     */
    public LoginResponse authenticate(String username, String password) {
        try {
            List<List<Object>> values = getAccounts();

            if (values == null || values.isEmpty()) {
                return LoginResponse.failure("Data akun tidak ditemukan");
            }

            // Skip header row (row pertama), cocokkan username & password
            for (int i = 1; i < values.size(); i++) {
                List<Object> row = values.get(i);
                if (row.size() >= 2) {
                    String sheetUsername = row.get(0).toString().trim();
                    String sheetPassword = row.get(1).toString().trim();

                    if (sheetUsername.equalsIgnoreCase(username.trim())) {
                        boolean passwordMatch = false;
                        
                        try {
                            // Coba verifikasi dengan BCrypt
                            if (sheetPassword.startsWith("$2a$") || sheetPassword.startsWith("$2b$") || sheetPassword.startsWith("$2y$")) {
                                passwordMatch = BCrypt.checkpw(password, sheetPassword);
                            } else {
                                // Fallback plaintext jika di Google Sheets belum di-hash
                                passwordMatch = sheetPassword.equals(password);
                            }
                        } catch (Exception e) {
                            passwordMatch = false;
                        }

                        if (passwordMatch) {
                            return LoginResponse.success(sheetUsername, null);
                        }
                    }
                }
            }

            return LoginResponse.failure("Username atau password salah");

        } catch (IOException e) {
            return LoginResponse.failure("Gagal mengakses data: " + e.getMessage());
        }
    }
}
