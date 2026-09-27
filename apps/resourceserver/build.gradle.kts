plugins {
  java
  alias(libs.plugins.spring.boot)
  alias(libs.plugins.dependency.management)
}

description = "Budgeting API for B1 Budget: zero-based budgeting, categories, transactions, reporting, and sync."

dependencies {
  implementation("org.springframework.boot:spring-boot-starter-webmvc")
  implementation("org.springframework.boot:spring-boot-starter-security-oauth2-resource-server")
  implementation("org.springframework.boot:spring-boot-starter-validation")
  testImplementation("org.springframework.boot:spring-boot-starter-test")
}

tasks.bootJar {
  layered {
    enabled = true
  }
}
