package com.plnk3.controller;

import com.plnk3.model.CvvRecord;
import com.plnk3.service.CvvService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/cvv")
public class CvvController {

    private static final Logger log = LoggerFactory.getLogger(CvvController.class);
    private static final String DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

    private final CvvService cvvService;

    public CvvController(CvvService cvvService) {
        this.cvvService = cvvService;
    }

    @GetMapping
    public ResponseEntity<?> getCvvData(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer month,
            @RequestParam(required = false) Integer year) {

        // Validasi input
        if (startDate != null && !startDate.matches(DATE_PATTERN)) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Format startDate tidak valid. Gunakan format yyyy-MM-dd\"}");
        }
        if (endDate != null && !endDate.matches(DATE_PATTERN)) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Format endDate tidak valid. Gunakan format yyyy-MM-dd\"}");
        }
        if (month != null && (month < 1 || month > 12)) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Nilai month harus antara 1-12\"}");
        }
        if (year != null && (year < 2000 || year > 2100)) {
            return ResponseEntity.badRequest()
                    .body("{\"error\": \"Nilai year tidak valid\"}");
        }

        try {
            List<CvvRecord> data = cvvService.getData(startDate, endDate, month, year);
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            log.error("Gagal mengambil data CVV", e);
            return ResponseEntity.status(500)
                    .body("{\"error\": \"Gagal mengambil data. Silakan coba lagi.\"}");
        }
    }
}

