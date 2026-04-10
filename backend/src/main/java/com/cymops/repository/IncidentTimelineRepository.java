package com.cymops.repository;

import com.cymops.model.entity.IncidentTimeline;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IncidentTimelineRepository extends JpaRepository<IncidentTimeline, Long> {
    List<IncidentTimeline> findByRoomIdOrderByCreatedAtAsc(Long roomId);
    List<IncidentTimeline> findByRoomIdOrderByCreatedAtDesc(Long roomId);
}
