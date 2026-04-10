package com.cymops;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CymopsApplication {

	public static void main(String[] args) {
		SpringApplication.run(CymopsApplication.class, args);
	}

}
