/***************************
 ** Randall Raboy ©️ 2024 **
 ***************************/
package com.randallraboy.gastar;

import com.randallraboy.gastar.security.UsersProperties;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.context.properties.EnableConfigurationProperties;

@SpringBootApplication
@EnableConfigurationProperties(UsersProperties.class)
public class Application {

    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
