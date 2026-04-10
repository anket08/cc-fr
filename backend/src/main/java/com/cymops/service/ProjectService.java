package com.cymops.service;

import com.cymops.dto.ProjectRequestDto;
import com.cymops.model.entity.Project;
import com.cymops.model.entity.ProjectMember;
import com.cymops.model.entity.User;
import com.cymops.repository.ProjectMemberRepository;
import com.cymops.repository.ProjectRepository;
import com.cymops.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProjectService {
    private final ProjectRepository projectRepository;
    private final ProjectMemberRepository projectMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public Project createProject(ProjectRequestDto request, String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        Project project = Project.builder()
                .name(request.getName())
                .createdBy(user)
                .build();
        Project saved = projectRepository.save(project);

        // Auto-add creator as a member so they can also be found via membership filter
        ProjectMember member = ProjectMember.builder()
                .project(saved)
                .user(user)
                .build();
        projectMemberRepository.save(member);

        return saved;
    }

    // Gap 1 Fix: Only return projects the calling user is a member of or created
    public List<Project> getProjectsForUser(String email) {
        User user = userRepository.findByEmail(email).orElseThrow();
        return projectRepository.findAllByMemberOrCreator(user.getId());
    }

    @Transactional
    public ProjectMember addMember(Long projectId, String inviteeEmail) {
        Project project = projectRepository.findById(projectId).orElseThrow();
        User user = userRepository.findByEmail(inviteeEmail)
                .orElseThrow(() -> new RuntimeException("No user found with email: " + inviteeEmail));

        if (projectMemberRepository.findByUserIdAndProjectId(user.getId(), projectId).isPresent()) {
            throw new RuntimeException("User is already a member of this project");
        }

        ProjectMember member = ProjectMember.builder()
                .project(project)
                .user(user)
                .build();
        return projectMemberRepository.save(member);
    }

    // Gap 3: Remove member by email
    @Transactional
    public void removeMember(Long projectId, String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("No user found with email: " + email));
        projectMemberRepository.deleteByUserIdAndProjectId(user.getId(), projectId);
    }

    // Gap 3: Get all members of a project
    public List<ProjectMember> getMembers(Long projectId) {
        return projectMemberRepository.findByProjectId(projectId);
    }
}
