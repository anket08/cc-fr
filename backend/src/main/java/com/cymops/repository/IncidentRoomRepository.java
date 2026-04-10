package com.cymops.repository;

import com.cymops.model.entity.IncidentRoom;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IncidentRoomRepository extends JpaRepository<IncidentRoom, Long> {
    List<IncidentRoom> findByProjectId(Long projectId);
    List<IncidentRoom> findByProjectIdIn(List<Long> projectIds);
}
