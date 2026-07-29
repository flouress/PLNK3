package com.plnk3.model;

public class LoginResponse {
    private boolean success;
    private String message;
    private String username;
    private String token; // Tambahan untuk JWT

    public LoginResponse() {}

    public LoginResponse(boolean success, String message, String username, String token) {
        this.success = success;
        this.message = message;
        this.username = username;
        this.token = token;
    }

    public static LoginResponse success(String username, String token) {
        return new LoginResponse(true, "Login berhasil", username, token);
    }

    public static LoginResponse failure(String message) {
        return new LoginResponse(false, message, null, null);
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }

    public String getToken() { return token; }
    public void setToken(String token) { this.token = token; }
}
