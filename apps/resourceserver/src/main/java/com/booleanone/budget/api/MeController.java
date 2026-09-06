package com.booleanone.budget.api;

import com.booleanone.budget.principal.PrincipalService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Hands a caller back the one thing the resource server knows about them.
 *
 * <p>Stateless and database-free by design: it proves a token was minted for B1 Budget and carried
 * the authority the endpoint asks for, and nothing else.
 */
@RestController
@RequiredArgsConstructor
public class MeController {
  private final PrincipalService principalService;

  /** The principal, which ADR-27 pins to {@code sub} rather than to any name or address. */
  public record MeResponse(String subject) {
  }

  @PreAuthorize("@oauth2.hasScope('budget')")
  @GetMapping("/me")
  public MeResponse me(Authentication authentication) {
    return new MeResponse(this.principalService.subjectOf(authentication));
  }
}
