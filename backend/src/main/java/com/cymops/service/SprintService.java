package com.cymops.service;

import com.cymops.dto.SprintDto;
import com.cymops.dto.SprintRequestDto;
import com.cymops.model.entity.Issue;
import com.cymops.model.entity.Sprint;
import com.cymops.model.enums.IssueStatus;
import com.cymops.model.enums.SprintStatus;
import com.cymops.repository.IssueRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.SprintRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SprintService {

    private final SprintRepository sprintRepository;
    private final ProjectRepository projectRepository;
    private final IssueRepository issueRepository;

    @Transactional
    public SprintDto createSprint(SprintRequestDto dto) {
        var project = projectRepository.findById(dto.getProjectId())
                .orElseThrow(() -> new RuntimeException("Project not found"));

        Sprint sprint = Sprint.builder()
                .project(project)
                .name(dto.getName())
                .goal(dto.getGoal())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(SprintStatus.PLANNING)
                .build();

        return toDto(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDto updateSprint(Long id, SprintRequestDto dto) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sprint not found"));
        if (dto.getName() != null) sprint.setName(dto.getName());
        if (dto.getGoal() != null) sprint.setGoal(dto.getGoal());
        if (dto.getStartDate() != null) sprint.setStartDate(dto.getStartDate());
        if (dto.getEndDate() != null) sprint.setEndDate(dto.getEndDate());
        return toDto(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDto startSprint(Long id) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        // Only one active sprint per project
        sprintRepository.findByProjectIdAndStatus(sprint.getProject().getId(), SprintStatus.ACTIVE)
                .ifPresent(active -> {
                    throw new RuntimeException("There is already an active sprint: " + active.getName());
                });

        sprint.setStatus(SprintStatus.ACTIVE);
        return toDto(sprintRepository.save(sprint));
    }

    @Transactional
    public SprintDto completeSprint(Long id) {
        Sprint sprint = sprintRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sprint not found"));

        Long projectId = sprint.getProject().getId();
        List<Issue> sprintIssues = issueRepository.findBySprintIdOrderByPositionAsc(id);

        // Find the next PLANNING sprint (if any) to carry over unfinished work
        Sprint nextSprint = sprintRepository
                .findFirstByProjectIdAndStatusOrderByCreatedAtAsc(projectId, SprintStatus.PLANNING)
                .orElse(null);

        sprintIssues.forEach(issue -> {
            if (issue.getStatus() == IssueStatus.DONE) {
                // DONE issues → backlog (clears the DONE column on the board)
                issue.setSprint(null);
            } else {
                // Unfinished issues → next sprint if available, otherwise backlog
                issue.setSprint(nextSprint);
            }
        });

        issueRepository.saveAll(sprintIssues);
        sprint.setStatus(SprintStatus.COMPLETED);
        return toDto(sprintRepository.save(sprint));
    }

    @Transactional(readOnly = true)
    public List<SprintDto> getSprints(Long projectId) {
        return sprintRepository.findByProjectIdOrderByCreatedAtAsc(projectId)
                .stream().map(this::toDto).collect(Collectors.toList());
    }

    // ── Mapper ───────────────────────────────────────────────────────────────

    private SprintDto toDto(Sprint s) {
        List<Issue> issues = issueRepository.findBySprintIdOrderByPositionAsc(s.getId());
        long completed = issues.stream().filter(i -> i.getStatus() == IssueStatus.DONE).count();
        return SprintDto.builder()
                .id(s.getId())
                .projectId(s.getProject().getId())
                .projectName(s.getProject().getName())
                .name(s.getName())
                .goal(s.getGoal())
                .status(s.getStatus().name())
                .startDate(s.getStartDate())
                .endDate(s.getEndDate())
                .createdAt(s.getCreatedAt())
                .issueCount(issues.size())
                .completedCount((int) completed)
                .build();
    }
}
