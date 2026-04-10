package com.cymops.repository;

import com.cymops.model.entity.ProjectMember;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProjectMemberRepository extends JpaRepository<ProjectMember, Long> {
    List<ProjectMember> findByProjectId(Long projectId);
    Optional<ProjectMember> findByUserIdAndProjectId(UUID userId, Long projectId);
    void deleteByUserIdAndProjectId(UUID userId, Long projectId);
}

