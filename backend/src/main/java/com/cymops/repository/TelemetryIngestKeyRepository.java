package com.cymops.repository;

import com.cymops.model.entity.TelemetryIngestKey;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TelemetryIngestKeyRepository extends JpaRepository<TelemetryIngestKey, Long> {
    Optional<TelemetryIngestKey> findByKeyHashAndActiveTrue(String keyHash);
    List<TelemetryIngestKey> findByProjectIdAndActiveTrue(Long projectId);
    List<TelemetryIngestKey> findByProjectIdOrderByCreatedAtDesc(Long projectId);
}
