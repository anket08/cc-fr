package com.cymops.repository;

import com.cymops.model.entity.DbIncident;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDateTime;
import java.util.List;

public interface DbIncidentRepository extends JpaRepository<DbIncident, Long> {
    List<DbIncident> findByStatusOrderByStartedAtDesc(String status);
    long countByStatus(String status);
        long countByStartedAtAfter(LocalDateTime startedAt);

        @Query(value = """
                        select coalesce(avg(extract(epoch from (resolved_at - started_at)) / 60.0), 0)
                        from db_incidents
                        where resolved_at is not null
                            and started_at >= ?1
                        """, nativeQuery = true)
        double findAverageMttrMinutesSince(LocalDateTime since);
}
