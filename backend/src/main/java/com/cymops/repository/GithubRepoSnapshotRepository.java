package com.cymops.repository;

import com.cymops.model.entity.GithubRepoSnapshot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface GithubRepoSnapshotRepository extends JpaRepository<GithubRepoSnapshot, Long> {
    Optional<GithubRepoSnapshot> findTopByRepositoryFullNameOrderByCollectedAtDesc(String repositoryFullName);
}
