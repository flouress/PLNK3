package com.plnk3.controller;

import com.plnk3.model.CvvRecord;
import com.plnk3.service.CvvService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/cvv")
public class CvvController {

    private final CvvService cvvService;

    public CvvController(CvvService cvvService) {
        this.cvvService = cvvService;
    }

    @GetMapping
    public ResponseEntity<?> getCvvData(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer month) {
        try {
            List<CvvRecord> data = cvvService.getData(startDate, endDate, month);
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            return ResponseEntity.status(500)
                    .body("{\"error\": \"Gagal mengambil data CVV: " + e.getMessage() + "\"}");
        }
    }
}
