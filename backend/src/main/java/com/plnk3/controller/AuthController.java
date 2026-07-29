package com.plnk3.controller;

import com.plnk3.model.LoginRequest;
import com.plnk3.model.LoginResponse;
import com.plnk3.service.AuthService;
import com.plnk3.util.JwtUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;
    private final JwtUtil jwtUtil;

    public AuthController(AuthService authService, JwtUtil jwtUtil) {
        this.authService = authService;
        this.jwtUtil = jwtUtil;
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponse> login(@RequestBody LoginRequest request) {
        LoginResponse response = authService.authenticate(
                request.getUsername(), request.getPassword());

        if (response.isSuccess()) {
            String token = jwtUtil.generateToken(response.getUsername());
            response.setToken(token);
            return ResponseEntity.ok(response);
        } else {
            return ResponseEntity.status(401).body(response);
        }
    }
}
