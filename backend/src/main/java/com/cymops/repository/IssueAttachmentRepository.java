package com.cymops.repository;

import com.cymops.model.entity.IssueAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface IssueAttachmentRepository extends JpaRepository<IssueAttachment, Long> {
    List<IssueAttachment> findByIssueIdOrderByCreatedAtAsc(Long issueId);
}
