package com.plnk3.config;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

@ControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleAllExceptions(Exception ex) {
        // Log error secara internal (bisa menggunakan SLF4J/Logback)
        System.err.println("Internal Error Occurred: " + ex.getMessage());
        ex.printStackTrace();

        // Kembalikan pesan yang aman ke client
        return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                .body("{\"error\": \"Terjadi kesalahan pada sistem. Silakan hubungi administrator.\"}");
    }
}
