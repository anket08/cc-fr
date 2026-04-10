package com.cymops.repository;

import com.cymops.model.entity.EngineeringReportSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface EngineeringReportSnapshotRepository extends JpaRepository<EngineeringReportSnapshot, Long> {
    Optional<EngineeringReportSnapshot> findTopByRepositoryFullNameOrderByGeneratedAtDesc(String repositoryFullName);
}
