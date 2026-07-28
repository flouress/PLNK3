package com.plnk3.controller;

import com.plnk3.model.PsaRecord;
import com.plnk3.service.PsaService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/psa")
public class PsaController {

    private final PsaService psaService;

    public PsaController(PsaService psaService) {
        this.psaService = psaService;
    }

    @GetMapping
    public ResponseEntity<?> getPsaData(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer month) {
        try {
            List<PsaRecord> data = psaService.getData(startDate, endDate, month);
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body("{\"error\": \"Gagal mengambil data PSA: " + e.getMessage() + "\"}");
        }
    }
}
