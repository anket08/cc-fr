package com.cymops.repository;

import com.cymops.model.entity.TelemetryIngestEvent;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TelemetryIngestEventRepository extends JpaRepository<TelemetryIngestEvent, Long> {
	List<TelemetryIngestEvent> findTop1ByOrderByReceivedAtDesc();
}
