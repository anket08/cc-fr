package com.cymops.repository;

import com.cymops.model.entity.Issue;
import com.cymops.model.enums.IssueStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

public interface IssueRepository extends JpaRepository<Issue, Long> {
    List<Issue> findByProjectIdOrderByPositionAsc(Long projectId);
    List<Issue> findBySprintIdOrderByPositionAsc(Long sprintId);
    List<Issue> findByProjectIdAndStatusOrderByPositionAsc(Long projectId, IssueStatus status);
    List<Issue> findBySprintIsNullAndProjectIdOrderByPositionAsc(Long projectId);

    @Query("SELECT COALESCE(MAX(i.position), -1) FROM Issue i WHERE i.project.id = :projectId AND i.status = :status")
    int findMaxPositionByProjectIdAndStatus(@Param("projectId") Long projectId, @Param("status") IssueStatus status);
}
