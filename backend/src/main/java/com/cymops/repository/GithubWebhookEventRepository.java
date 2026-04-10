package com.cymops.repository;

import com.cymops.model.entity.GithubWebhookEvent;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GithubWebhookEventRepository extends JpaRepository<GithubWebhookEvent, Long> {
}
