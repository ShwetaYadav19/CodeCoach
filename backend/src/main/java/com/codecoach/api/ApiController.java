package com.codecoach.api;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class ApiController {
  public record ParseRequest(@NotBlank @Size(max = 30000) String statement) {}
  public record SubmissionRequest(
      @NotBlank String sourceCode,
      @NotBlank String language,
      String mode,
      Map<String, Object> problem
  ) {}

  @GetMapping("/health")
  public Map<String, String> health() {
    return Map.of("status", "ok", "service", "codecoach-api");
  }

  @PostMapping("/problems/parse")
  public Map<String, Object> parse(@Valid @RequestBody ParseRequest request) {
    throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "Problem parsing is not configured. Connect a server-side AI provider and validated problem schema."
    );
  }

  @PostMapping("/submissions")
  public Map<String, Object> submit(@Valid @RequestBody SubmissionRequest request) {
    if (!"java".equalsIgnoreCase(request.language())) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only Java is enabled in this MVP.");
    }
    throw new ResponseStatusException(
        HttpStatus.SERVICE_UNAVAILABLE,
        "Execution is not configured. Connect an isolated Judge0 deployment and trusted test-oracle pipeline."
    );
  }
}