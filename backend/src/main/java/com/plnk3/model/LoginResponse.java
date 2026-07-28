package com.plnk3.model;

public class LoginResponse {
    private boolean success;
    private String message;
    private String username;

    public LoginResponse() {}

    public LoginResponse(boolean success, String message, String username) {
        this.success = success;
        this.message = message;
        this.username = username;
    }

    public static LoginResponse success(String username) {
        return new LoginResponse(true, "Login berhasil", username);
    }

    public static LoginResponse failure(String message) {
        return new LoginResponse(false, message, null);
    }

    public boolean isSuccess() { return success; }
    public void setSuccess(boolean success) { this.success = success; }

    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }

    public String getUsername() { return username; }
    public void setUsername(String username) { this.username = username; }
}
