package com.plnk3.controller;

import com.plnk3.model.RankingGroup;
import com.plnk3.service.RankingService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/ranking")
public class RankingController {

    private static final Logger log = LoggerFactory.getLogger(RankingController.class);
    private static final String DATE_PATTERN = "^\\d{4}-\\d{2}-\\d{2}$";

    private final RankingService rankingService;

    public RankingController(RankingService rankingService) {
        this.rankingService = rankingService;
    }

    @GetMapping
    public ResponseEntity<?> getRankingData(
            @RequestParam(required = false) String startDate,
            @RequestParam(required = false) String endDate,
            @RequestParam(required = false) Integer month) {

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

        try {
            List<RankingGroup> data = rankingService.getData(startDate, endDate, month);
            return ResponseEntity.ok(data);
        } catch (IOException e) {
            log.error("Gagal mengambil data Ranking", e);
            return ResponseEntity.status(500)
                    .body("{\"error\": \"Gagal mengambil data. Silakan coba lagi.\"}");
        }
    }
}

