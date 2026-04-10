package com.cymops.controller;

import com.cymops.dto.*;
import com.cymops.service.IssueService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.List;

@RestController
@RequestMapping("/issues")
@RequiredArgsConstructor
public class IssueController {

    private final IssueService issueService;

    @PostMapping
    public ResponseEntity<IssueDto> createIssue(@RequestBody IssueRequestDto dto,
                                                  Authentication auth) {
        return ResponseEntity.ok(issueService.createIssue(dto, auth.getName()));
    }

    @GetMapping
    public ResponseEntity<List<IssueDto>> getByProject(@RequestParam Long projectId) {
        return ResponseEntity.ok(issueService.getIssuesForProject(projectId));
    }

    @GetMapping("/backlog")
    public ResponseEntity<List<IssueDto>> getBacklog(@RequestParam Long projectId) {
        return ResponseEntity.ok(issueService.getBacklogIssues(projectId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<IssueDto> getIssue(@PathVariable Long id) {
        return ResponseEntity.ok(issueService.getIssue(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<IssueDto> updateIssue(@PathVariable Long id,
                                                  @RequestBody IssueRequestDto dto,
                                                  Authentication auth) {
        return ResponseEntity.ok(issueService.updateIssue(id, dto, auth.getName()));
    }

    @PatchMapping("/{id}/move")
    public ResponseEntity<IssueDto> moveIssue(@PathVariable Long id,
                                               @RequestBody IssueMoveDto dto,
                                               Authentication auth) {
        return ResponseEntity.ok(issueService.moveIssue(id, dto, auth.getName()));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteIssue(@PathVariable Long id) {
        issueService.deleteIssue(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<IssueCommentDto>> getComments(@PathVariable Long id) {
        return ResponseEntity.ok(issueService.getComments(id));
    }

    @PostMapping("/{id}/comments")
    public ResponseEntity<IssueCommentDto> addComment(@PathVariable Long id,
                                                       @RequestBody IssueCommentRequestDto dto,
                                                       Authentication auth) {
        return ResponseEntity.ok(issueService.addComment(id, dto.getBody(), auth.getName()));
    }

    // ── Activities ───────────────────────────────────────────────────────────

    @GetMapping("/{id}/activities")
    public ResponseEntity<List<IssueActivityDto>> getActivities(@PathVariable Long id) {
        return ResponseEntity.ok(issueService.getActivity(id));
    }

    // ── Attachments ──────────────────────────────────────────────────────────

    @GetMapping("/{id}/attachments")
    public ResponseEntity<List<IssueAttachmentDto>> getAttachments(@PathVariable Long id) {
        return ResponseEntity.ok(issueService.getAttachments(id));
    }

    @PostMapping("/{id}/attachments")
    public ResponseEntity<IssueAttachmentDto> uploadAttachment(@PathVariable Long id,
                                                               @RequestParam("file") MultipartFile file,
                                                               Authentication auth) {
        return ResponseEntity.ok(issueService.uploadAttachment(id, file, auth.getName()));
    }

    @DeleteMapping("/{id}/attachments/{attachmentId}")
    public ResponseEntity<Void> deleteAttachment(@PathVariable Long id, @PathVariable Long attachmentId) {
        issueService.deleteAttachment(attachmentId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/attachments/{attachmentId}/download")
    public ResponseEntity<Resource> downloadAttachment(@PathVariable Long id, @PathVariable Long attachmentId) {
        var attachment = issueService.getAttachmentEntity(attachmentId);
        try {
            Path path = Paths.get(attachment.getStoredPath());
            Resource resource = new UrlResource(path.toUri());

            if (resource.exists() || resource.isReadable()) {
                String contentType = attachment.getContentType();
                if (contentType == null) contentType = "application/octet-stream";

                return ResponseEntity.ok()
                        .contentType(MediaType.parseMediaType(contentType))
                        .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getFilename() + "\"")
                        .body(resource);
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
