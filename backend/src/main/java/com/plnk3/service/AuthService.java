package com.plnk3.service;

import com.google.api.services.sheets.v4.Sheets;
import com.plnk3.model.LoginResponse;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.stereotype.Service;

import java.io.IOException;
import java.util.List;

@Service
public class AuthService {

    private final Sheets sheetsService;
    private final String spreadsheetId;

    public AuthService(Sheets sheetsService, @Qualifier("spreadsheetId") String spreadsheetId) {
        this.sheetsService = sheetsService;
        this.spreadsheetId = spreadsheetId;
    }

    /**
     * Validasi login dengan mencocokkan username & password
     * terhadap data di tab "Akun" pada Google Sheets.
     * Password dicocokkan secara plaintext sesuai PRD.
     */
    public LoginResponse authenticate(String username, String password) {
        try {
            // Baca semua data dari tab "Akun"
            String range = "Akun!A:B";
            List<List<Object>> values = sheetsService.spreadsheets().values()
                    .get(spreadsheetId, range)
                    .execute()
                    .getValues();

            if (values == null || values.isEmpty()) {
                return LoginResponse.failure("Data akun tidak ditemukan");
            }

            // Skip header row (row pertama), cocokkan username & password
            for (int i = 1; i < values.size(); i++) {
                List<Object> row = values.get(i);
                if (row.size() >= 2) {
                    String sheetUsername = row.get(0).toString().trim();
                    String sheetPassword = row.get(1).toString().trim();

                    if (sheetUsername.equalsIgnoreCase(username.trim())
                            && sheetPassword.equals(password)) {
                        return LoginResponse.success(sheetUsername);
                    }
                }
            }

            return LoginResponse.failure("Username atau password salah");

        } catch (IOException e) {
            return LoginResponse.failure("Gagal mengakses data: " + e.getMessage());
        }
    }
}
