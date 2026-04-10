package com.cymops.service;

import com.cymops.dto.*;
import com.cymops.model.entity.*;
import com.cymops.model.enums.*;
import com.cymops.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class IssueService {

    private final IssueRepository issueRepository;
    private final IssueCommentRepository commentRepository;
    private final IssueActivityRepository activityRepository;
    private final IssueAttachmentRepository attachmentRepository;
    private final ProjectRepository projectRepository;
    private final SprintRepository sprintRepository;
    private final UserRepository userRepository;

    @Value("${app.upload-dir:uploads/attachments}")
    private String uploadDir;

    // ── Create ────────────────────────────────────────────────────────────────

    @Transactional
    public IssueDto createIssue(IssueRequestDto dto, String reporterEmail) {
        Project project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        User reporter = userRepository.findByEmail(reporterEmail)
                .orElseThrow(() -> new RuntimeException("Reporter not found"));

        IssueStatus status = dto.getStatus() != null
                ? IssueStatus.valueOf(dto.getStatus()) : IssueStatus.TODO;

        int maxPos = issueRepository.findMaxPositionByProjectIdAndStatus(project.getId(), status);

        Issue.IssueBuilder builder = Issue.builder()
                .project(project)
                .title(dto.getTitle())
                .description(dto.getDescription())
                .type(dto.getType() != null ? IssueType.valueOf(dto.getType()) : IssueType.TASK)
                .status(status)
                .priority(dto.getPriority() != null ? IssuePriority.valueOf(dto.getPriority()) : IssuePriority.MEDIUM)
                .reporter(reporter)
                .labels(dto.getLabels())
                .storyPoints(dto.getStoryPoints())
                .position(maxPos + 1)
                .dueDate(dto.getDueDate());

        if (dto.getSprintId() != null) {
            sprintRepository.findById(dto.getSprintId()).ifPresent(builder::sprint);
        }
        if (dto.getAssigneeEmail() != null && !dto.getAssigneeEmail().isBlank()) {
            userRepository.findByEmail(dto.getAssigneeEmail()).ifPresent(builder::assignee);
        }

        Issue saved = issueRepository.save(builder.build());
        recordActivity(saved, reporterEmail, "CREATED", null, null, null);
        return toDto(saved);
    }

    // ── Update ────────────────────────────────────────────────────────────────

    @Transactional
    public IssueDto updateIssue(Long id, IssueRequestDto dto, String actorEmail) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        if (dto.getTitle() != null) issue.setTitle(dto.getTitle());
        if (dto.getDescription() != null) issue.setDescription(dto.getDescription());
        if (dto.getType() != null) issue.setType(IssueType.valueOf(dto.getType()));

        if (dto.getStatus() != null) {
            String old = issue.getStatus().name();
            String nw = dto.getStatus();
            if (!old.equals(nw)) {
                issue.setStatus(IssueStatus.valueOf(nw));
                recordActivity(issue, actorEmail, "STATUS_CHANGED", "status", old, nw);
            }
        }

        if (dto.getPriority() != null) {
            String old = issue.getPriority().name();
            String nw = dto.getPriority();
            if (!old.equals(nw)) {
                issue.setPriority(IssuePriority.valueOf(nw));
                recordActivity(issue, actorEmail, "PRIORITY_CHANGED", "priority", old, nw);
            }
        }

        if (dto.getLabels() != null) issue.setLabels(dto.getLabels());
        if (dto.getStoryPoints() != null) issue.setStoryPoints(dto.getStoryPoints());
        if (dto.getDueDate() != null) issue.setDueDate(dto.getDueDate());
        if (dto.getPosition() != null) issue.setPosition(dto.getPosition());

        if (dto.getAssigneeEmail() != null) {
            String old = issue.getAssignee() != null ? issue.getAssignee().getEmail() : "Unassigned";
            if (dto.getAssigneeEmail().isBlank()) {
                issue.setAssignee(null);
                recordActivity(issue, actorEmail, "ASSIGNEE_CHANGED", "assignee", old, "Unassigned");
            } else {
                userRepository.findByEmail(dto.getAssigneeEmail()).ifPresent(u -> {
                    issue.setAssignee(u);
                    recordActivity(issue, actorEmail, "ASSIGNEE_CHANGED", "assignee", old, u.getEmail());
                });
            }
        }

        if (dto.getSprintId() != null) {
            String old = issue.getSprint() != null ? issue.getSprint().getName() : "Backlog";
            if (dto.getSprintId() == -1) {
                issue.setSprint(null);
                recordActivity(issue, actorEmail, "SPRINT_CHANGED", "sprint", old, "Backlog");
            } else {
                sprintRepository.findById(dto.getSprintId()).ifPresent(s -> {
                    issue.setSprint(s);
                    recordActivity(issue, actorEmail, "SPRINT_CHANGED", "sprint", old, s.getName());
                });
            }
        }

        return toDto(issueRepository.save(issue));
    }

    // ── Move (kanban drag) ────────────────────────────────────────────────────

    @Transactional
    public IssueDto moveIssue(Long id, IssueMoveDto dto, String actorEmail) {
        Issue issue = issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        String old = issue.getStatus().name();
        IssueStatus newStatus = IssueStatus.valueOf(dto.getStatus());

        if (!old.equals(dto.getStatus())) {
            recordActivity(issue, actorEmail, "STATUS_CHANGED", "status", old, dto.getStatus());
        }

        issue.setStatus(newStatus);
        issue.setPosition(dto.getPosition());
        return toDto(issueRepository.save(issue));
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    @Transactional
    public void deleteIssue(Long id) {
        issueRepository.deleteById(id);
    }

    // ── Queries ───────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<IssueDto> getIssuesForProject(Long projectId) {
        return issueRepository.findByProjectIdOrderByPositionAsc(projectId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public List<IssueDto> getBacklogIssues(Long projectId) {
        return issueRepository.findBySprintIsNullAndProjectIdOrderByPositionAsc(projectId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public IssueDto getIssue(Long id) {
        return toDto(issueRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Issue not found")));
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    @Transactional
    public IssueCommentDto addComment(Long issueId, String body, String authorEmail) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));
        User author = userRepository.findByEmail(authorEmail)
                .orElseThrow(() -> new RuntimeException("User not found"));

        IssueComment comment = IssueComment.builder()
                .issue(issue)
                .author(author)
                .body(body)
                .build();
        IssueComment saved = commentRepository.save(comment);
        recordActivity(issue, authorEmail, "COMMENT_ADDED", null, null, body.length() > 80 ? body.substring(0, 80) + "…" : body);
        return toCommentDto(saved);
    }

    @Transactional(readOnly = true)
    public List<IssueCommentDto> getComments(Long issueId) {
        return commentRepository.findByIssueIdOrderByCreatedAtAsc(issueId)
                .stream().map(this::toCommentDto).collect(Collectors.toList());
    }

    // ── Activity ──────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<IssueActivityDto> getActivity(Long issueId) {
        return activityRepository.findByIssueIdOrderByCreatedAtAsc(issueId)
                .stream().map(this::toActivityDto).collect(Collectors.toList());
    }

    // ── Attachments ───────────────────────────────────────────────────────────

    @Transactional
    public IssueAttachmentDto uploadAttachment(Long issueId, MultipartFile file, String uploaderEmail) {
        Issue issue = issueRepository.findById(issueId)
                .orElseThrow(() -> new RuntimeException("Issue not found"));

        try {
            Path dir = Paths.get(uploadDir, String.valueOf(issueId));
            Files.createDirectories(dir);

            String ext = "";
            String orig = file.getOriginalFilename();
            if (orig != null && orig.contains(".")) ext = orig.substring(orig.lastIndexOf('.'));
            String stored = UUID.randomUUID() + ext;
            Path dest = dir.resolve(stored);
            Files.copy(file.getInputStream(), dest);

            IssueAttachment attachment = IssueAttachment.builder()
                    .issue(issue)
                    .uploaderEmail(uploaderEmail)
                    .filename(orig != null ? orig : stored)
                    .storedPath(dest.toString())
                    .contentType(file.getContentType())
                    .fileSize(file.getSize())
                    .build();

            IssueAttachment saved = attachmentRepository.save(attachment);
            recordActivity(issue, uploaderEmail, "ATTACHMENT_ADDED", null, null, orig);
            return toAttachmentDto(saved);
        } catch (IOException e) {
            throw new RuntimeException("File upload failed: " + e.getMessage());
        }
    }

    @Transactional(readOnly = true)
    public List<IssueAttachmentDto> getAttachments(Long issueId) {
        return attachmentRepository.findByIssueIdOrderByCreatedAtAsc(issueId)
                .stream().map(this::toAttachmentDto).collect(Collectors.toList());
    }

    @Transactional
    public IssueAttachment getAttachmentEntity(Long attachmentId) {
        return attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));
    }

    @Transactional
    public void deleteAttachment(Long attachmentId) {
        IssueAttachment a = attachmentRepository.findById(attachmentId)
                .orElseThrow(() -> new RuntimeException("Attachment not found"));
        try { Files.deleteIfExists(Paths.get(a.getStoredPath())); } catch (IOException ignored) {}
        attachmentRepository.delete(a);
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private void recordActivity(Issue issue, String actorEmail, String action,
                                String field, String oldValue, String newValue) {
        activityRepository.save(IssueActivity.builder()
                .issue(issue)
                .actorEmail(actorEmail)
                .action(action)
                .field(field)
                .oldValue(oldValue)
                .newValue(newValue)
                .build());
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private IssueDto toDto(Issue i) {
        int commentCount = commentRepository.findByIssueIdOrderByCreatedAtAsc(i.getId()).size();
        return IssueDto.builder()
                .id(i.getId())
                .projectId(i.getProject().getId())
                .projectName(i.getProject().getName())
                .sprintId(i.getSprint() != null ? i.getSprint().getId() : null)
                .sprintName(i.getSprint() != null ? i.getSprint().getName() : null)
                .title(i.getTitle())
                .description(i.getDescription())
                .type(i.getType().name())
                .status(i.getStatus().name())
                .priority(i.getPriority().name())
                .assigneeEmail(i.getAssignee() != null ? i.getAssignee().getEmail() : null)
                .reporterEmail(i.getReporter().getEmail())
                .labels(i.getLabels())
                .storyPoints(i.getStoryPoints())
                .position(i.getPosition())
                .dueDate(i.getDueDate())
                .createdAt(i.getCreatedAt())
                .updatedAt(i.getUpdatedAt())
                .commentCount(commentCount)
                .build();
    }

    private IssueCommentDto toCommentDto(IssueComment c) {
        return IssueCommentDto.builder()
                .id(c.getId())
                .issueId(c.getIssue().getId())
                .authorEmail(c.getAuthor().getEmail())
                .body(c.getBody())
                .createdAt(c.getCreatedAt())
                .build();
    }

    private IssueActivityDto toActivityDto(IssueActivity a) {
        return IssueActivityDto.builder()
                .id(a.getId())
                .issueId(a.getIssue().getId())
                .actorEmail(a.getActorEmail())
                .action(a.getAction())
                .field(a.getField())
                .oldValue(a.getOldValue())
                .newValue(a.getNewValue())
                .createdAt(a.getCreatedAt())
                .build();
    }

    private IssueAttachmentDto toAttachmentDto(IssueAttachment a) {
        return IssueAttachmentDto.builder()
                .id(a.getId())
                .issueId(a.getIssue().getId())
                .uploaderEmail(a.getUploaderEmail())
                .filename(a.getFilename())
                .contentType(a.getContentType())
                .fileSize(a.getFileSize())
                .downloadUrl("/issues/" + a.getIssue().getId() + "/attachments/" + a.getId() + "/download")
                .createdAt(a.getCreatedAt())
                .build();
    }
}

