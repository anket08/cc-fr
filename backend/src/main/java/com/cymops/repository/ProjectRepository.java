package com.cymops.repository;

import com.cymops.model.entity.Project;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.UUID;

public interface ProjectRepository extends JpaRepository<Project, Long> {

    // Returns all projects where the caller is a member OR is the creator
    @Query("SELECT DISTINCT p FROM Project p LEFT JOIN ProjectMember pm ON pm.project = p " +
           "WHERE p.createdBy.id = :userId OR pm.user.id = :userId")
    List<Project> findAllByMemberOrCreator(@Param("userId") UUID userId);

    boolean existsByIdAndCreatedById(Long id, UUID createdById);
}

