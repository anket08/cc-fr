package com.cymops.repository;

import com.cymops.model.entity.UptimeCheck;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.LocalDateTime;
import java.util.List;

public interface UptimeCheckRepository extends JpaRepository<UptimeCheck, Long> {
    List<UptimeCheck> findByMonitorIdOrderByCheckedAtDesc(Long monitorId, Pageable pageable);

    @Query("SELECT c FROM UptimeCheck c WHERE c.monitor.id = :monitorId AND c.checkedAt >= :since ORDER BY c.checkedAt ASC")
    List<UptimeCheck> findRecentChecks(@Param("monitorId") Long monitorId, @Param("since") LocalDateTime since);

    @Query("SELECT c FROM UptimeCheck c WHERE c.monitor.id = :monitorId ORDER BY c.checkedAt DESC")
    List<UptimeCheck> findLatestByMonitorId(@Param("monitorId") Long monitorId, Pageable pageable);

    @Query("SELECT COUNT(c) FROM UptimeCheck c WHERE c.monitor.id = :monitorId AND c.isUp = true AND c.checkedAt >= :since")
    long countUpChecks(@Param("monitorId") Long monitorId, @Param("since") LocalDateTime since);

    @Query("SELECT COUNT(c) FROM UptimeCheck c WHERE c.monitor.id = :monitorId AND c.checkedAt >= :since")
    long countTotalChecks(@Param("monitorId") Long monitorId, @Param("since") LocalDateTime since);

    @Query("SELECT AVG(c.responseTimeMs) FROM UptimeCheck c WHERE c.monitor.id = :monitorId AND c.checkedAt >= :since")
    Double avgResponseTime(@Param("monitorId") Long monitorId, @Param("since") LocalDateTime since);

    @Query("SELECT MIN(c.responseTimeMs) FROM UptimeCheck c WHERE c.monitor.id = :monitorId AND c.checkedAt >= :since")
    Integer minResponseTime(@Param("monitorId") Long monitorId, @Param("since") LocalDateTime since);

    @Query("SELECT MAX(c.responseTimeMs) FROM UptimeCheck c WHERE c.monitor.id = :monitorId AND c.checkedAt >= :since")
    Integer maxResponseTime(@Param("monitorId") Long monitorId, @Param("since") LocalDateTime since);

    void deleteByMonitorId(Long monitorId);
}
