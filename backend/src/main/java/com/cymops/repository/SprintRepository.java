package com.cymops.repository;

import com.cymops.model.entity.Sprint;
import com.cymops.model.enums.SprintStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface SprintRepository extends JpaRepository<Sprint, Long> {
    List<Sprint> findByProjectIdOrderByCreatedAtAsc(Long projectId);
    Optional<Sprint> findByProjectIdAndStatus(Long projectId, SprintStatus status);
    Optional<Sprint> findFirstByProjectIdAndStatusOrderByCreatedAtAsc(Long projectId, SprintStatus status);
}
