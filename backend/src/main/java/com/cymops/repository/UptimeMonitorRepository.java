package com.cymops.repository;

import com.cymops.model.entity.UptimeMonitor;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface UptimeMonitorRepository extends JpaRepository<UptimeMonitor, Long> {
    List<UptimeMonitor> findByProjectIdOrderByCreatedAtDesc(Long projectId);
    List<UptimeMonitor> findByPausedFalse();
    List<UptimeMonitor> findByProjectIdInOrderByCreatedAtDesc(List<Long> projectIds);
}
