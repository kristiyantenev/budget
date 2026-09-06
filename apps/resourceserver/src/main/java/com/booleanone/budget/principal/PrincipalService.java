package com.booleanone.budget.principal;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;

/**
 * The domain side of "who is asking".
 *
 * <p>The two authorization questions are asked in different places on purpose. The controller
 * asks what {@code b1-budget-web} was allowed to request on this person's behalf, which is a
 * scope and belongs at the HTTP edge. This asks what the person may do, which ADR-27 says is a
 * client role, and it belongs next to the work rather than next to the transport.
 */
@Service
public class PrincipalService {

  // ADR-27: a client role on b1-budget-api, not a realm role and not a claim naming one person.
  @PreAuthorize("hasRole('budget-user')")
  public String subjectOf(Authentication authentication) {
    return authentication.getName();
  }
}
