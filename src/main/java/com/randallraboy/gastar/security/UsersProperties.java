/***************************
 ** Randall Raboy ©️ 2024 **
 ***************************/
package com.randallraboy.gastar.security;

import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("gastar.users")
public record UsersProperties(List<String> adminEmails) {}
