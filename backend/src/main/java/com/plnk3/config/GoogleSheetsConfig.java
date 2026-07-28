package com.plnk3.config;

import com.google.api.client.googleapis.javanet.GoogleNetHttpTransport;
import com.google.api.client.json.gson.GsonFactory;
import com.google.api.services.sheets.v4.Sheets;
import com.google.api.services.sheets.v4.SheetsScopes;
import com.google.auth.http.HttpCredentialsAdapter;
import com.google.auth.oauth2.GoogleCredentials;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.io.IOException;
import java.io.InputStream;
import java.security.GeneralSecurityException;
import java.util.Collections;

@Configuration
public class GoogleSheetsConfig {

    @Value("${google.sheets.spreadsheet-id}")
    private String spreadsheetId;

    @Bean
    public Sheets sheetsService() throws GeneralSecurityException, IOException {
        InputStream credentialsStream;
        
        // 1. Cek apakah ada environment variable GOOGLE_CREDENTIALS_JSON (untuk Cloud Deployment)
        String envJson = System.getenv("GOOGLE_CREDENTIALS_JSON");
        
        if (envJson != null && !envJson.trim().isEmpty()) {
            credentialsStream = new java.io.ByteArrayInputStream(envJson.getBytes(java.nio.charset.StandardCharsets.UTF_8));
        } else {
            // 2. Fallback ke file lokal di src/main/resources (untuk Lokal Development)
            credentialsStream = getClass().getClassLoader().getResourceAsStream("credentials.json");
            
            if (credentialsStream == null) {
                throw new IOException("credentials.json not found in classpath. "
                        + "Pastikan file credentials.json ada di src/main/resources/ "
                        + "atau set environment variable GOOGLE_CREDENTIALS_JSON");
            }
        }

        GoogleCredentials credentials = GoogleCredentials.fromStream(credentialsStream)
                .createScoped(Collections.singletonList(SheetsScopes.SPREADSHEETS_READONLY));

        return new Sheets.Builder(
                GoogleNetHttpTransport.newTrustedTransport(),
                GsonFactory.getDefaultInstance(),
                new HttpCredentialsAdapter(credentials))
                .setApplicationName("Dashboard K3 PLN")
                .build();
    }

    @Bean
    public String spreadsheetId() {
        return spreadsheetId;
    }
}
