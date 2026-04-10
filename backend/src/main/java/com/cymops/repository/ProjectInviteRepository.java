package com.cymops.repository;

import com.cymops.model.entity.ProjectInvite;
import com.cymops.model.enums.InviteStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ProjectInviteRepository extends JpaRepository<ProjectInvite, Long> {
    List<ProjectInvite> findByEmailAndStatus(String email, InviteStatus status);
    
    // Check if a pending invite already exists for this email and project
    boolean existsByProject_IdAndEmailAndStatus(Long projectId, String email, InviteStatus status);
}
